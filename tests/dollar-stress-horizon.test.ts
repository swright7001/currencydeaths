import { describe, expect, it } from "vitest";
import {
  DOLLAR_STRESS_HORIZON_THRESHOLD,
  DOLLAR_STRESS_HORIZON_VERSION,
  buildDollarStressHorizon,
  dollarStressHorizonScenarios,
  explainDollarStressReading,
} from "../lib/methodology/dollar-stress-horizon";

describe("Dollar Stress Horizon methodology", () => {
  it("publishes the exact approved illustrative scenario contract", () => {
    expect(DOLLAR_STRESS_HORIZON_VERSION).toBe("usd-stress-horizon-v1.0.0");
    expect(DOLLAR_STRESS_HORIZON_THRESHOLD).toBe(80);
    expect(dollarStressHorizonScenarios).toEqual([
      expect.objectContaining({
        id: "current_trajectory",
        midpoint: { years: 11, months: 2, days: 0 },
        range: { minimumYears: 8, maximumYears: 14 },
      }),
      expect.objectContaining({
        id: "fiscal_acceleration",
        midpoint: { years: 6, months: 1, days: 0 },
        range: { minimumYears: 4, maximumYears: 8 },
      }),
      expect.objectContaining({
        id: "stabilization",
        midpoint: null,
        range: null,
      }),
    ]);
  });

  it("keeps the index meaning distinct from a probability", () => {
    expect(explainDollarStressReading(43.5, "Elevated")).toBe(
      "43.5 means elevated pressure across money growth, consumer prices, and federal debt—above calmer conditions but below high and extreme. It is not a 43.5% chance that the dollar fails.",
    );
  });

  it("fails closed when the verified score or band is unavailable", () => {
    expect(buildDollarStressHorizon(null, null)).toMatchObject({
      status: "unavailable",
      scenarios: [],
      plainLanguage: null,
    });
    expect(buildDollarStressHorizon(43.5, null).status).toBe("unavailable");
  });

  it("rejects unsupported score and band inputs", () => {
    expect(() => explainDollarStressReading(101, "Elevated")).toThrow(
      "between 0 and 100",
    );
    expect(() => explainDollarStressReading(43.5, "Unknown")).toThrow(
      "Unsupported",
    );
  });
});
