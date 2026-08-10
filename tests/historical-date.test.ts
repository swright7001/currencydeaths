import { describe, expect, it } from "vitest";
import {
  historicalDateToBounds,
  historicalDateToKey,
} from "../lib/data/historical-date";

describe("historicalDateToKey", () => {
  it("preserves documented date precision", () => {
    expect(historicalDateToKey({ year: 1923, precision: "year" })).toBe(19_230_000);
    expect(historicalDateToKey({ year: 50, month: 1, day: 1, precision: "day" })).toBe(500_101);
    expect(historicalDateToKey({ year: 1923, month: 11, precision: "month" })).toBe(19_231_100);
    expect(historicalDateToKey({ year: 1923, month: 11, day: 15, precision: "day" })).toBe(
      19_231_115,
    );
  });

  it("rejects false precision and invalid calendar dates", () => {
    expect(() => historicalDateToKey({ year: 1923, month: 11, precision: "year" })).toThrow(
      "cannot include a month",
    );
    expect(() =>
      historicalDateToKey({ year: 2023, month: 2, day: 29, precision: "day" }),
    ).toThrow("not a valid calendar date");
  });

  it("expresses uncertain dates as intervals", () => {
    expect(historicalDateToBounds({ year: 1990, precision: "year" })).toEqual({
      earliestKey: 19_900_101,
      latestKey: 19_901_231,
    });
    expect(historicalDateToBounds({ year: 2000, month: 2, precision: "month" })).toEqual({
      earliestKey: 20_000_201,
      latestKey: 20_000_229,
    });
  });
});
