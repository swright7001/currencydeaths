import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComparePage from "../app/compare/page";
import { getCurrencyDetail } from "../lib/data/currency-detail";
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

  it("binds every historical row to its audited claim-specific source set", () => {
    for (const option of comparisonCurrencyOptions) {
      const detail = getCurrencyDetail(option.slug)!;
      const comparison = buildCurrencyComparison(option.slug);
      const rows = new Map(comparison.rows.map((row) => [row.key, row]));
      const startClaim = detail.claims.find((claim) => claim.field === "startDate")!;
      const endClaim = detail.claims.find((claim) => claim.field.startsWith("endDate"))!;
      const urls = (sources: readonly { url: string }[]) =>
        [...new Set(sources.map((source) => source.url))];

      expect(urls(rows.get("recorded-span")!.historical.sources)).toEqual(
        urls([...startClaim.sources, ...endClaim.sources]),
      );
      expect(urls(rows.get("monetary-expansion")!.historical.sources)).toEqual(
        urls(detail.causeClaim.sources),
      );
      expect(urls(rows.get("inflation")!.historical.sources)).toEqual(
        urls(detail.causeClaim.sources),
      );
      expect(urls(rows.get("confidence-context")!.historical.sources)).toEqual(
        urls(detail.sources),
      );
      expect(urls(rows.get("outcome")!.historical.sources)).toEqual(
        urls(endClaim.sources),
      );
    }
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
