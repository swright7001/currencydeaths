import { describe, expect, it } from "vitest";
import {
  calculateDollarStressScore,
  type DollarStressInput,
} from "../lib/calculations/dollar-stress-score";
import {
  experimentalDollarStressMethodology,
  validateDollarStressMethodology,
} from "../lib/methodology/dollar-stress-score";

const completeInputs = [
  {
    componentId: "monetary_expansion" as const,
    sourceSeriesId: "M2SL",
    freshness: "current" as const,
    input: {
      kind: "year_over_year_percent_change" as const,
      sourceUnit: "billions_usd_seasonally_adjusted" as const,
      current: {
        value: 110,
        observationDate: "2026-06-01",
        sourceUpdatedAt: Date.UTC(2026, 6, 28),
        accessedAt: Date.UTC(2026, 7, 11),
      },
      priorYear: {
        value: 100,
        observationDate: "2025-06-01",
        sourceUpdatedAt: Date.UTC(2025, 6, 28),
        accessedAt: Date.UTC(2026, 7, 11),
      },
    },
  },
  {
    componentId: "consumer_price_inflation" as const,
    sourceSeriesId: "CPIAUCSL",
    freshness: "current" as const,
    input: {
      kind: "year_over_year_percent_change" as const,
      sourceUnit: "index_1982_1984_100_seasonally_adjusted" as const,
      current: {
        value: 107.5,
        observationDate: "2026-06-01",
        sourceUpdatedAt: Date.UTC(2026, 6, 14),
        accessedAt: Date.UTC(2026, 7, 11),
      },
      priorYear: {
        value: 100,
        observationDate: "2025-06-01",
        sourceUpdatedAt: Date.UTC(2025, 6, 14),
        accessedAt: Date.UTC(2026, 7, 11),
      },
    },
  },
  {
    componentId: "federal_debt_burden" as const,
    sourceSeriesId: "GFDEGDQ188S",
    freshness: "current" as const,
    input: {
      kind: "direct" as const,
      sourceUnit: "percent_gdp_seasonally_adjusted" as const,
      value: 110,
      observationDate: "2026-01-01",
      sourceUpdatedAt: Date.UTC(2026, 5, 25),
      accessedAt: Date.UTC(2026, 7, 11),
    },
  },
] as const;

describe("dollar stress score", () => {
  it("derives auditable YoY rates and matches the golden vector", () => {
    const result = calculateDollarStressScore(
      experimentalDollarStressMethodology,
      completeInputs,
    );
    expect(result).toEqual({
      methodologyVersion: "usd-stress-experimental-0.1.0",
      methodologyAsOf: "2026-08-11",
      status: "experimental",
      score: 50,
      missingComponents: [],
      staleComponents: [],
      contributions: [
        expect.objectContaining({
          componentId: "monetary_expansion",
          rawValue: 10,
          normalizedScore: 50,
          pointContribution: 17.5,
          sourceUpdatedAt: Date.UTC(2026, 6, 28),
          accessedAt: Date.UTC(2026, 7, 11),
          derivation: expect.objectContaining({
            formula: "((current / prior_year) - 1) * 100",
            current: expect.objectContaining({ value: 110, observationDate: "2026-06-01" }),
            priorYear: expect.objectContaining({ value: 100, observationDate: "2025-06-01" }),
          }),
        }),
        expect.objectContaining({
          componentId: "consumer_price_inflation",
          rawValue: 7.5,
          normalizedScore: 50,
          pointContribution: 17.5,
        }),
        expect.objectContaining({
          componentId: "federal_debt_burden",
          rawValue: 110,
          normalizedScore: 50,
          pointContribution: 15,
          derivation: null,
        }),
      ],
    });
  });

  it("clamps boundary outliers before weighting", () => {
    const result = calculateDollarStressScore(experimentalDollarStressMethodology, [
      {
        ...completeInputs[0],
        input: {
          ...completeInputs[0].input,
          current: { ...completeInputs[0].input.current, value: 50 },
        },
      },
      {
        ...completeInputs[1],
        input: {
          ...completeInputs[1].input,
          current: { ...completeInputs[1].input.current, value: 199 },
        },
      },
      completeInputs[2],
    ]);
    expect(result.score).toBe(50);
    expect(result.contributions.map((item) => item.normalizedScore)).toEqual([0, 100, 50]);
  });

  it("withholds the total when an input is missing instead of substituting zero", () => {
    const result = calculateDollarStressScore(
      experimentalDollarStressMethodology,
      completeInputs.slice(0, 2),
    );
    expect(result.status).toBe("unavailable");
    expect(result.score).toBeNull();
    expect(result.missingComponents).toEqual(["federal_debt_burden"]);
    expect(result.contributions).toHaveLength(2);
  });

  it("keeps stale values visible and flags the aggregate as provisional", () => {
    const result = calculateDollarStressScore(experimentalDollarStressMethodology, [
      completeInputs[0],
      { ...completeInputs[1], freshness: "stale" },
      completeInputs[2],
    ]);
    expect(result.score).toBe(50);
    expect(result.status).toBe("provisional_stale");
    expect(result.staleComponents).toEqual(["consumer_price_inflation"]);
  });

  it("rejects invalid weights and any component identity rebinding", () => {
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        components: experimentalDollarStressMethodology.components.map((component, index) =>
          index === 0 ? { ...component, weight: 0.34 } : component,
        ),
      }),
    ).toThrow("weights must sum to 1");

    const cpi = experimentalDollarStressMethodology.components[1];
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        components: experimentalDollarStressMethodology.components.map((component, index) =>
          index === 0
            ? {
                ...component,
                sourceMetric: cpi.sourceMetric,
                sourceSeriesId: cpi.sourceSeriesId,
                sourceUrl: cpi.sourceUrl,
                sourceUnit: cpi.sourceUnit,
              }
            : component,
        ),
      }),
    ).toThrow("violates its approved identity contract");
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        components: experimentalDollarStressMethodology.components.map((component, index) =>
          index === 0 ? { ...component, sourceUrl: "https://example.test/m2" } : component,
        ),
      }),
    ).toThrow("violates its approved identity contract");
  });

  it("rejects unauditable derivations, unit drift, source drift, and duplicates", () => {
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        completeInputs[0],
        completeInputs[0],
      ]),
    ).toThrow("Duplicate stress input");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        {
          ...completeInputs[0],
          input: { ...completeInputs[0].input, sourceUnit: "percent_gdp_seasonally_adjusted" },
        } as unknown as DollarStressInput,
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires source unit");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        { ...completeInputs[0], sourceSeriesId: "OTHER" },
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires source series M2SL");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        {
          ...completeInputs[0],
          input: {
            ...completeInputs[0].input,
            priorYear: {
              ...completeInputs[0].input.priorYear,
              observationDate: "2025-05-01",
            },
          },
        },
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("exactly one year apart");
  });

  it("rejects impossible calendar dates in methodology and observations", () => {
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        asOf: "2026-99-99",
      }),
    ).toThrow("real calendar date");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        completeInputs[0],
        completeInputs[1],
        {
          ...completeInputs[2],
          input: { ...completeInputs[2].input, observationDate: "2026-02-31" },
        },
      ]),
    ).toThrow("real calendar date");
  });

  it("rejects invalid source update and access chronology", () => {
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        completeInputs[0],
        completeInputs[1],
        {
          ...completeInputs[2],
          input: {
            ...completeInputs[2].input,
            sourceUpdatedAt: Date.UTC(2026, 7, 12),
            accessedAt: Date.UTC(2026, 7, 11),
          },
        },
      ]),
    ).toThrow("invalid source provenance times");
  });
});
