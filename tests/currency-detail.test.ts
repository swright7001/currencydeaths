import { describe, expect, it } from "vitest";
import {
  createCurrencyDetailStructuredData,
  currencyDetailSlugs,
  formatHistoricalDate,
  getCurrencyDetail,
  historicalDateToIso,
} from "../lib/data/currency-detail";

describe("currency detail research transformation", () => {
  it("generates exactly the verified seed slugs", () => {
    expect(currencyDetailSlugs).toEqual([
      "german-papiermark",
      "hungarian-pengo",
      "zimbabwe-dollar-1980",
      "venezuelan-bolivar-fuerte",
      "greek-drachma",
    ]);
  });

  it("preserves year, month, and day precision in display and machine values", () => {
    expect(formatHistoricalDate({ year: 1980, precision: "year" })).toBe("1980");
    expect(formatHistoricalDate({ year: 1923, month: 11, precision: "month" })).toBe(
      "November 1923",
    );
    expect(
      formatHistoricalDate({ year: 2018, month: 8, day: 20, precision: "day" }),
    ).toBe("August 20, 2018");
    expect(historicalDateToIso({ year: 1923, month: 11, precision: "month" })).toBe(
      "1923-11",
    );
  });

  it("builds a cited start/end timeline without inventing a cause date", () => {
    const detail = getCurrencyDetail("german-papiermark")!;
    expect(detail.timeline).toHaveLength(2);
    expect(detail.timeline.map((event) => event.date.precision)).toEqual(["day", "month"]);
    expect(detail.timeline.every((event) => event.sources.length > 0)).toBe(true);
  });

  it("returns undefined for a non-seed slug", () => {
    expect(getCurrencyDetail("invented-currency")).toBeUndefined();
  });

  it("keeps structured data limited to supported seed fields", () => {
    const detail = getCurrencyDetail("zimbabwe-dollar-1980")!;
    const json = JSON.stringify(createCurrencyDetailStructuredData(detail));
    expect(json).toContain("Multicurrency system");
    expect(json).toContain("2009-02");
    expect(json).not.toContain("peakInflation");
    expect(json).not.toContain("purchasingPowerLoss");
    expect(json).not.toContain("probability");
  });
});
