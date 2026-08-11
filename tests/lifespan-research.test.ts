import { describe, expect, it } from "vitest";
import { currencyLifespanRange } from "../lib/data/currency-lifespan";
import {
  activeLifespanFilterCount,
  buildLifespanResearch,
  filterLifespanRecords,
  lifespanResearchRecords,
  parseLifespanQuery,
  type LifespanResearchRecord,
} from "../lib/data/lifespan-research";

describe("lifespan research model", () => {
  it("derives bounded aggregates from the verified records", () => {
    const result = buildLifespanResearch(lifespanResearchRecords);

    expect(result.count).toBe(5);
    expect(result.average).toEqual({ minimumYears: 46.8, maximumYears: 47.2 });
    expect(result.median).toEqual({ minimumYears: 19, maximumYears: 19 });
    expect(result.span).toEqual({ minimumYears: 9, maximumYears: 169 });
    expect(result.distribution.map(({ key, count }) => ({ key, count }))).toEqual([
      { key: "under_10", count: 1 },
      { key: "10_29", count: 3 },
      { key: "30_99", count: 0 },
      { key: "100_plus", count: 1 },
    ]);
    expect(result.crossBandCount).toBe(0);
  });

  it("keeps range boundaries instead of substituting midpoint estimates", () => {
    const record = (slug: string, minimumYears: number, maximumYears: number) =>
      ({
        ...lifespanResearchRecords[0],
        slug,
        lifespan: { minimumYears, maximumYears, basis: "closed" },
      }) satisfies LifespanResearchRecord;
    const result = buildLifespanResearch([
      record("one", 9, 10),
      record("two", 20, 22),
    ]);

    expect(result.average).toEqual({ minimumYears: 14.5, maximumYears: 16 });
    expect(result.median).toEqual({ minimumYears: 14.5, maximumYears: 16 });
    expect(result.crossBandCount).toBe(1);
  });

  it("returns an explicit empty model instead of fabricated aggregates", () => {
    expect(buildLifespanResearch([])).toMatchObject({
      count: 0,
      average: null,
      median: null,
      span: null,
      shortest: [],
      longest: [],
    });
  });

  it("parses only scalar allowlisted URL filters", () => {
    expect(
      parseLifespanQuery({
        region: ["europe", "africa"],
        cause: "hyperinflation",
        era: "2000_present",
      }),
    ).toEqual({ region: "", cause: "hyperinflation", era: "2000_present" });
  });

  it("filters every summary input from the same selected records", () => {
    const query = parseLifespanQuery({ region: "europe", cause: "hyperinflation" });
    const records = filterLifespanRecords(query);
    const result = buildLifespanResearch(records);

    expect(records.map((record) => record.slug)).toEqual([
      "german-papiermark",
      "hungarian-pengo",
    ]);
    expect(result.count).toBe(2);
    expect(result.byRegion).toEqual([{ key: "europe", label: "europe", count: 2 }]);
    expect(activeLifespanFilterCount(query)).toBe(2);
  });
});

describe("active-currency lifespan convention", () => {
  it("requires an explicit as-of date and labels the resulting basis", () => {
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
