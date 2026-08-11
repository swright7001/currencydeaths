import { describe, expect, it } from "vitest";
import { currencyLifespanRange } from "../lib/data/currency-lifespan";
import {
  assertVerifiedCurrencySeedIntegrity,
  verifiedCurrencySeed,
} from "../lib/data/verified-currency-seed";

describe("verified currency seed", () => {
  it("has unique, source-backed records with a complete claim audit", () => {
    expect(assertVerifiedCurrencySeedIntegrity()).toBeUndefined();
    expect(verifiedCurrencySeed.currencies).toHaveLength(5);
    expect(new Set(verifiedCurrencySeed.currencies.map((currency) => currency.slug)).size).toBe(5);
    for (const currency of verifiedCurrencySeed.currencies) {
      expect(currency.sourceKeys.length).toBeGreaterThan(0);
      expect(currency.claims.map((claim) => claim.field)).toEqual([
        "startDate",
        "endDate/status/replacement",
        "primaryFailureCause",
      ]);
    }
  });

  it("preserves imprecise historical dates as lifespan ranges", () => {
    expect(
      currencyLifespanRange({
        startDate: { year: 1980, precision: "year" },
        endDate: { year: 2009, month: 2, precision: "month" },
        status: "collapsed",
      }),
    ).toEqual({ minimumYears: 28, maximumYears: 29, basis: "closed" });
  });

  it("requires an explicit as-of date for active-currency lifespan", () => {
    expect(
      currencyLifespanRange({
        startDate: { year: 2000, precision: "year" },
        status: "active",
      }),
    ).toBeNull();
    expect(
      currencyLifespanRange({
        startDate: { year: 2000, precision: "year" },
        status: "active",
        asOfDate: { year: 2026, month: 8, day: 11, precision: "day" },
      }),
    ).toEqual({ minimumYears: 25, maximumYears: 26, basis: "as_of" });
  });
});
