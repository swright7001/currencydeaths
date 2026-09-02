import { describe, expect, it } from "vitest";
import {
  canonicalizeFredRefresh,
  fredRefreshSeriesContracts,
  parseFredSeriesResponses,
} from "../lib/data/fred-refresh-contract";

const retrievedAt = Date.parse("2026-09-02T12:00:00Z");
const contract = fredRefreshSeriesContracts[0];

function metadata(overrides: Record<string, unknown> = {}) {
  return {
    seriess: [{
      id: contract.sourceSeriesId,
      frequency: contract.frequencyLabel,
      units: contract.unitsLabel,
      seasonal_adjustment: contract.seasonalAdjustmentLabel,
      last_updated: "2026-08-25 12:00:00-05",
      ...overrides,
    }],
  };
}

function observations(rows: Array<{ date: string; value: string }> = [
  { date: "2026-06-01", value: "23100.0" },
  { date: "2026-07-01", value: "23218.0" },
]) {
  return { observations: rows };
}

describe("official FRED refresh contract", () => {
  it("accepts the exact approved metadata and preserves missing observations", () => {
    const parsed = parseFredSeriesResponses(
      contract,
      metadata(),
      observations([
        { date: "2026-06-01", value: "." },
        { date: "2026-07-01", value: "23100.0" },
      ]),
      retrievedAt,
    );
    expect(parsed.observations).toEqual([
      { date: "2026-06-01", value: null },
      { date: "2026-07-01", value: 23_100 },
    ]);
    expect(parsed.sourceUpdatedAt).toBe(Date.parse("2026-08-25 12:00:00-05"));
  });

  it.each([
    ["series", { id: "WRONG" }],
    ["frequency", { frequency: "Weekly" }],
    ["units", { units: "Percent" }],
    ["seasonal adjustment", { seasonal_adjustment: "Not Seasonally Adjusted" }],
  ])("rejects a mismatched %s binding", (_label, override) => {
    expect(() =>
      parseFredSeriesResponses(contract, metadata(override), observations(), retrievedAt),
    ).toThrow("metadata contract mismatch");
  });

  it("rejects future provenance, malformed values, duplicates, and missing latest data", () => {
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata({ last_updated: "2027-01-01 00:00:00-00" }),
        observations(),
        retrievedAt,
      ),
    ).toThrow("after retrieval");
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata(),
        observations([{ date: "2026-06-01", value: "NaN" }, { date: "2026-07-01", value: "1" }]),
        retrievedAt,
      ),
    ).toThrow("finite or '.'");
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata(),
        observations([{ date: "2026-06-01", value: "1" }, { date: "2026-06-01", value: "2" }]),
        retrievedAt,
      ),
    ).toThrow("unique, chronological, and contiguous");
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata(),
        observations([{ date: "2026-06-01", value: "1" }, { date: "2026-07-01", value: "." }]),
        retrievedAt,
      ),
    ).toThrow("Latest FRED observation is missing");
  });

  it("rejects an ancient observation even when metadata was updated recently", () => {
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata(),
        observations([
          { date: "2020-01-01", value: "1" },
          { date: "2020-02-01", value: "2" },
        ]),
        retrievedAt,
      ),
    ).toThrow("observation is stale");
  });

  it("rejects a monthly observation one millisecond beyond the approved boundary", () => {
    const julyPeriodEnd = Date.UTC(2026, 7, 0, 23, 59, 59, 999);
    expect(() =>
      parseFredSeriesResponses(
        contract,
        metadata(),
        observations(),
        julyPeriodEnd + (75 * 86_400_000) + 1,
      ),
    ).toThrow("observation is stale");
  });

  it("uses only source payload identity, not retrieval time, for idempotency", () => {
    const parsed = parseFredSeriesResponses(contract, metadata(), observations(), retrievedAt);
    const series = [parsed, parsed, parsed];
    expect(canonicalizeFredRefresh(series)).not.toContain("retrievedAt");
  });
});
