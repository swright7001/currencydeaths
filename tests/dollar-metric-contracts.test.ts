import { describe, expect, it } from "vitest";
import {
  calculateDollarMetricFreshness,
  findDollarMetricGaps,
  validateDollarMetricObservation,
} from "../lib/data/dollar-metric-contracts";
import {
  assertDollarMetricSnapshotIntegrity,
  dollarMetricSnapshot,
} from "../lib/data/dollar-metric-snapshot";

describe("dollar metric contracts", () => {
  it("keeps the official-series verified snapshot internally consistent", () => {
    expect(() => assertDollarMetricSnapshotIntegrity()).not.toThrow();
    expect(dollarMetricSnapshot.sources).toHaveLength(3);
    expect(dollarMetricSnapshot.observations).toHaveLength(15);
    expect(
      new Set(dollarMetricSnapshot.observations.map((observation) => observation.sourceSeriesId)),
    ).toEqual(new Set(["M2SL", "CPIAUCSL", "GFDEGDQ188S"]));
    expect(
      dollarMetricSnapshot.observations.every((observation) =>
        observation.notes.includes("Verified dated snapshot"),
      ),
    ).toBe(true);
    expect(
      dollarMetricSnapshot.observations
        .filter((observation) => observation.metric === "federal_debt_to_gdp")
        .map(({ observationDate }) => [observationDate.year, observationDate.month]),
    ).toEqual([
      [2025, 1],
      [2025, 4],
      [2025, 7],
      [2025, 10],
      [2026, 1],
    ]);
  });

  it("rejects unit, frequency, and series mismatches", () => {
    const valid = {
      metric: "m2" as const,
      observationDate: { year: 2026, month: 6, precision: "month" as const },
      value: 23_155.2,
      unit: "billions_usd_seasonally_adjusted" as const,
      frequency: "monthly" as const,
      sourceSeriesId: "M2SL",
      sourceUpdatedAt: Date.UTC(2026, 6, 28),
    };
    expect(() => validateDollarMetricObservation(valid)).not.toThrow();
    expect(() =>
      validateDollarMetricObservation({ ...valid, frequency: "quarterly" }),
    ).toThrow("requires frequency monthly");
    expect(() =>
      validateDollarMetricObservation({ ...valid, sourceSeriesId: "NOT_M2" }),
    ).toThrow("requires source series M2SL");
  });

  it("reports missing source periods without creating interpolated observations", () => {
    const march = { observationDate: { year: 2026, month: 3, precision: "month" as const } };
    const june = { observationDate: { year: 2026, month: 6, precision: "month" as const } };
    expect(findDollarMetricGaps([june, march], "monthly")).toEqual([
      {
        afterDate: march.observationDate,
        beforeDate: june.observationDate,
        missingPeriods: 2,
      },
    ]);
  });

  it("derives freshness from the source update timestamp and metric policy", () => {
    const updatedAt = Date.UTC(2026, 6, 28);
    expect(calculateDollarMetricFreshness("m2", updatedAt, Date.UTC(2026, 7, 11))).toMatchObject({
      ageDays: 14,
      thresholdDays: 45,
      state: "current",
    });
    expect(calculateDollarMetricFreshness("m2", updatedAt, Date.UTC(2026, 9, 1))).toMatchObject({
      state: "stale",
    });
  });
});
