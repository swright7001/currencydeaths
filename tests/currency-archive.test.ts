import { describe, expect, it } from "vitest";
import {
  activeArchiveFilterCount,
  filterCurrencyArchive,
  parseArchiveQuery,
} from "../lib/data/currency-archive";

describe("currency archive query", () => {
  it("parses only supported URL values and uses the first repeated value", () => {
    expect(
      parseArchiveQuery({
        q: [" mark ", "ignored"],
        country: "germany",
        region: "unknown",
        era: "1900_1945",
        type: "fiat",
        status: "destroyed",
        lifespan: "under_10",
      }),
    ).toEqual({
      search: "mark",
      country: "germany",
      region: "",
      era: "1900_1945",
      cause: "",
      currencyType: "fiat",
      status: "",
      lifespan: "under_10",
    });
  });

  it("combines documented filters without shadow data", () => {
    const query = parseArchiveQuery({
      region: "europe",
      cause: "hyperinflation",
      status: "replaced",
    });
    expect(filterCurrencyArchive(query).map((record) => record.slug)).toEqual([
      "german-papiermark",
      "hungarian-pengo",
    ]);
    expect(activeArchiveFilterCount(query)).toBe(3);
  });

  it("searches sourced context and successor names", () => {
    const query = parseArchiveQuery({ q: "euro" });
    expect(filterCurrencyArchive(query).map((record) => record.slug)).toEqual([
      "greek-drachma",
    ]);
  });

  it("matches unaccented queries against accented currency names", () => {
    const query = parseArchiveQuery({ q: "bolivar" });
    expect(filterCurrencyArchive(query).map((record) => record.slug)).toEqual([
      "venezuelan-bolivar-fuerte",
    ]);
  });

  it("uses transition era and unambiguous derived lifespan bands", () => {
    const query = parseArchiveQuery({ era: "2000_present", lifespan: "10_29" });
    expect(filterCurrencyArchive(query).map((record) => record.slug)).toEqual([
      "zimbabwe-dollar-1980",
      "venezuelan-bolivar-fuerte",
    ]);
  });

  it("returns an honest empty set for an unmatched combination", () => {
    const query = parseArchiveQuery({ country: "greece", cause: "hyperinflation" });
    expect(filterCurrencyArchive(query)).toEqual([]);
  });
});
