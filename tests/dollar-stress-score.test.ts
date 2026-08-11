import { describe, expect, it } from "vitest";
import { calculateDollarStressScore } from "../lib/calculations/dollar-stress-score";
import {
  experimentalDollarStressMethodology,
  validateDollarStressMethodology,
} from "../lib/methodology/dollar-stress-score";

const completeInputs = [
  {
    componentId: "monetary_expansion" as const,
    value: 10,
    unit: "percent_change_year_over_year" as const,
    sourceSeriesId: "M2SL",
    observationDate: "2026-06-01",
    freshness: "current" as const,
  },
  {
    componentId: "consumer_price_inflation" as const,
    value: 7.5,
    unit: "percent_change_year_over_year" as const,
    sourceSeriesId: "CPIAUCSL",
    observationDate: "2026-06-01",
    freshness: "current" as const,
  },
  {
    componentId: "federal_debt_burden" as const,
    value: 110,
    unit: "percent_gdp" as const,
    sourceSeriesId: "GFDEGDQ188S",
    observationDate: "2026-01-01",
    freshness: "current" as const,
  },
] as const;

describe("dollar stress score", () => {
  it("matches the golden vector with visible component contributions", () => {
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
          normalizedScore: 50,
          pointContribution: 17.5,
        }),
        expect.objectContaining({
          componentId: "consumer_price_inflation",
          normalizedScore: 50,
          pointContribution: 17.5,
        }),
        expect.objectContaining({
          componentId: "federal_debt_burden",
          normalizedScore: 50,
          pointContribution: 15,
        }),
      ],
    });
  });

  it("clamps boundary outliers before weighting", () => {
    const result = calculateDollarStressScore(experimentalDollarStressMethodology, [
      { ...completeInputs[0], value: -50 },
      { ...completeInputs[1], value: 99 },
      { ...completeInputs[2], value: 110 },
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

  it("rejects invalid weights, duplicate inputs, unit drift, and source drift", () => {
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        components: experimentalDollarStressMethodology.components.map((component, index) =>
          index === 0 ? { ...component, weight: 0.34 } : component,
        ),
      }),
    ).toThrow("weights must sum to 1");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        completeInputs[0],
        completeInputs[0],
      ]),
    ).toThrow("Duplicate stress input");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        { ...completeInputs[0], unit: "percent_gdp" },
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires unit");
    expect(() =>
      calculateDollarStressScore(experimentalDollarStressMethodology, [
        { ...completeInputs[0], sourceSeriesId: "OTHER" },
        completeInputs[1],
        completeInputs[2],
      ]),
    ).toThrow("requires source series M2SL");
    expect(() =>
      validateDollarStressMethodology({
        ...experimentalDollarStressMethodology,
        components: experimentalDollarStressMethodology.components.map((component, index) =>
          index === 0 ? { ...component, sourceSeriesId: "OTHER" } : component,
        ),
      }),
    ).toThrow("invalid source-series contract");
  });
});
