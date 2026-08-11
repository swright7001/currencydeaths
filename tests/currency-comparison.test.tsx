import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComparePage from "../app/compare/page";
import {
  buildCurrencyComparison,
  comparisonCurrencyOptions,
  resolveComparisonSelection,
} from "../lib/data/currency-comparison";

describe("currency comparison transformation", () => {
  it("exposes exactly the verified cases and resolves shareable query state", () => {
    expect(comparisonCurrencyOptions).toHaveLength(5);
    expect(resolveComparisonSelection(undefined)).toEqual({ slug: "german-papiermark", state: "default" });
    expect(resolveComparisonSelection("hungarian-pengo")).toEqual({ slug: "hungarian-pengo", state: "selected" });
    expect(resolveComparisonSelection("invented")).toEqual({ slug: "german-papiermark", state: "invalid" });
    expect(resolveComparisonSelection(["german-papiermark", "hungarian-pengo"])).toEqual({ slug: "german-papiermark", state: "invalid" });
  });

  it("labels every row and preserves missing evidence instead of inventing values", () => {
    const comparison = buildCurrencyComparison("zimbabwe-dollar-1980");
    expect(comparison.rows).toHaveLength(8);
    expect(comparison.rows.every((row) => ["direct", "contextual", "unavailable"].includes(row.mode))).toBe(true);
    expect(comparison.rows.every((row) => row.usd.unit && row.usd.timeWindow && row.historical.unit && row.historical.timeWindow)).toBe(true);
    expect(comparison.rows.find((row) => row.key === "fiscal-stress")?.historical.value).toBeNull();
    expect(comparison.rows.find((row) => row.key === "reserve-status")?.usd.unavailableReason).toContain("not yet");
    expect(comparison.counts.direct).toBe(0);
  });

  it("rejects a slug outside the verified set", () => {
    expect(() => buildCurrencyComparison("invented-currency")).toThrow("Unknown comparison currency");
  });
});

describe("comparison route", () => {
  it("renders a selected case, qualifications, sources, and no predictive claim", async () => {
    const html = renderToStaticMarkup(
      await ComparePage({ searchParams: Promise.resolve({ currency: "hungarian-pengo" }) }),
    );
    expect(html).toContain("USD vs Hungarian pengő");
    expect(html).toContain("Similarity is not destiny");
    expect(html).toContain("Context only");
    expect(html).toContain("Not comparable");
    expect(html).toContain("No outcome predicted");
    expect(html).toContain("no similarity score, collapse probability, or forecast");
    expect(html).not.toContain("97.6%");
  });

  it("renders a visible fallback notice for invalid query state", async () => {
    const html = renderToStaticMarkup(
      await ComparePage({ searchParams: Promise.resolve({ currency: "not-verified" }) }),
    );
    expect(html).toContain("not in the verified comparison set");
    expect(html).toContain("German paper mark");
  });
});
