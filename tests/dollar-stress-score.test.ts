import { describe, expect, it } from "vitest";
import {
  calculateDollarStressScore,
  calculateDollarStressSensitivity,
  type DollarStressInput,
} from "../lib/calculations/dollar-stress-score";
import {
  dollarStressMethodologyV1,
  getDollarStressBand,
  validateDollarStressMethodology,
  type DollarStressMethodology,
} from "../lib/methodology/dollar-stress-score";
import { buildVerifiedDollarStressInputs } from "../lib/data/dollar-stress-baseline";

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
      dollarStressMethodologyV1,
      completeInputs,
    );
    expect(result.methodologyVersion).toBe("usd-stress-v1.0.0");
    expect(result.methodologyAsOf).toBe("2026-09-02");
    expect(result.status).toBe("experimental");
    expect(result.score).toBe(73.4);
    expect(result.missingComponents).toEqual([]);
    expect(result.staleComponents).toEqual([]);
    expect(result.contributions[0]).toEqual(expect.objectContaining({
      componentId: "monetary_expansion",
      sourceUpdatedAt: Date.UTC(2026, 6, 28),
      accessedAt: Date.UTC(2026, 7, 11),
      derivation: expect.objectContaining({
        formula: "((current / prior_year) - 1) * 100",
        current: expect.objectContaining({ value: 110, observationDate: "2026-06-01" }),
        priorYear: expect.objectContaining({ value: 100, observationDate: "2025-06-01" }),
      }),
    }));
    expect(result.contributions[0].rawValue).toBeCloseTo(10, 12);
    expect(result.contributions[0].normalizedScore).toBeCloseTo(66.63143431326101, 12);
    expect(result.contributions[1].normalizedScore).toBeCloseTo(64.83844342965523, 12);
    expect(result.contributions[2].normalizedScore).toBeCloseTo(88.60315351233555, 12);
    expect(result.contributions[2].derivation).toBeNull();
  });

  it("reproduces the approved artifact vector and illustrative sensitivity", () => {
    const result = calculateDollarStressScore(
      dollarStressMethodologyV1,
      buildVerifiedDollarStressInputs(),
    );
    expect(result.score).toBe(43.5);
    expect(result.contributions[0].rawValue).toBeCloseTo(5.414179019772547, 12);
    expect(result.contributions[0].normalizedScore).toBeCloseTo(14.850397159884665, 12);
    expect(result.contributions[1].normalizedScore).toBeCloseTo(15.62125582613533, 12);
    expect(result.contributions[2].normalizedScore).toBe(100);
    expect(calculateDollarStressSensitivity(dollarStressMethodologyV1, result.contributions))
      .toEqual([
        expect.objectContaining({ id: "equal", score: 43.5 }),
        expect.objectContaining({ id: "monetary_emphasis", score: 36.4 }),
        expect.objectContaining({ id: "inflation_emphasis", score: 36.5 }),
        expect.objectContaining({ id: "fiscal_emphasis", score: 53.4 }),
      ]);
  });

  it("clamps boundary outliers before weighting", () => {
    const result = calculateDollarStressScore(dollarStressMethodologyV1, [
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
    expect(result.score).toBe(62.9);
    expect(result.contributions[0].normalizedScore).toBe(0);
    expect(result.contributions[1].normalizedScore).toBe(100);
    expect(result.contributions[2].normalizedScore).toBeCloseTo(88.60315351233555, 12);
  });

  it("withholds the total when an input is missing instead of substituting zero", () => {
    const result = calculateDollarStressScore(
      dollarStressMethodologyV1,
      completeInputs.slice(0, 2),
    );
    expect(result.status).toBe("unavailable");
    expect(result.score).toBeNull();
    expect(result.missingComponents).toEqual(["federal_debt_burden"]);
    expect(result.contributions).toHaveLength(2);
  });

  it("uses the approved equal-width descriptive band edges", () => {
    expect(getDollarStressBand(0).label).toBe("Lower");
    expect(getDollarStressBand(19.9).label).toBe("Lower");
    expect(getDollarStressBand(20).label).toBe("Moderate");
    expect(getDollarStressBand(40).label).toBe("Elevated");
    expect(getDollarStressBand(60).label).toBe("High");
    expect(getDollarStressBand(80).label).toBe("Extreme");
    expect(getDollarStressBand(100).label).toBe("Extreme");
  });

  it("keeps stale contributions auditable but withholds the aggregate", () => {
    const result = calculateDollarStressScore(dollarStressMethodologyV1, [
      completeInputs[0],
      { ...completeInputs[1], freshness: "stale" },
      completeInputs[2],
    ]);
    expect(result.score).toBeNull();
    expect(result.status).toBe("unavailable");
    expect(result.staleComponents).toEqual(["consumer_price_inflation"]);
  });

  it("rejects invalid weights and any component identity rebinding", () => {
    expect(() =>
      validateDollarStressMethodology({
        ...dollarStressMethodologyV1,
        components: dollarStressMethodologyV1.components.map((component, index) =>
          index === 0 ? { ...component, weight: 0.34 } : component,
        ),
      }),
    ).toThrow("weights must sum to 1");

    const cpi = dollarStressMethodologyV1.components[1];
    expect(() =>
      validateDollarStressMethodology({
        ...dollarStressMethodologyV1,
        components: dollarStressMethodologyV1.components.map((component, index) =>
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
        ...dollarStressMethodologyV1,
        components: dollarStressMethodologyV1.components
          .slice(0, 2)
          .map((component) => ({ ...component, weight: 0.5 })),
      } as unknown as DollarStressMethodology),
    ).toThrow("exact approved component set");
    expect(() =>
      validateDollarStressMethodology({
        ...dollarStressMethodologyV1,
        components: dollarStressMethodologyV1.components.map((component, index) =>
          index === 0 ? { ...component, sourceUrl: "https://example.test/m2" } : component,
        ),
      }),
    ).toThrow("violates its approved identity contract");

    expect(() =>
      validateDollarStressMethodology({
        ...dollarStressMethodologyV1,
        baselineVersion: "usd-stress-baseline-other",
      }),
    ).toThrow("baseline contract mismatch");
  });

  it("rejects unauditable derivations, unit drift, source drift, and duplicates", () => {
    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
        completeInputs[0],
        completeInputs[0],
      ]),
    ).toThrow("Duplicate stress input");
    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
        {
          ...completeInputs[0],
          input: { ...completeInputs[0].input, sourceUnit: "percent_gdp_seasonally_adjusted" },
        } as unknown as DollarStressInput,
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires source unit");
    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
        { ...completeInputs[0], sourceSeriesId: "OTHER" },
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires source series M2SL");
    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
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
        ...dollarStressMethodologyV1,
        asOf: "2026-99-99",
      }),
    ).toThrow("real calendar date");
    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
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
      calculateDollarStressScore(dollarStressMethodologyV1, [
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

    expect(() =>
      calculateDollarStressScore(dollarStressMethodologyV1, [
        completeInputs[0],
        completeInputs[1],
        {
          ...completeInputs[2],
          input: {
            ...completeInputs[2].input,
            observationDate: "2027-01-01",
          },
        },
      ]),
    ).toThrow("invalid source provenance times");
  });
});
