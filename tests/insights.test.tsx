import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InsightsPage from "../app/insights/page";
import InsightArticlePage, { generateMetadata, generateStaticParams } from "../app/insights/[slug]/page";
import { getInsightArticle, getInsightSources, insightArticles } from "../lib/data/insights";

const slug = "currency-endings-are-not-all-collapses";

describe("insight editorial model", () => {
  it("publishes one reviewed sample with explicit fact and interpretation blocks", () => {
    const article = getInsightArticle(slug);
    expect(article).toBeDefined();
    expect(article?.sections.some((section) => section.label === "Sourced fact")).toBe(true);
    expect(article?.sections.some((section) => section.label === "Interpretation")).toBe(true);
    for (const section of article?.sections ?? []) {
      if (section.label === "Sourced fact") expect(section.sourceKeys?.length).toBeGreaterThan(0);
      if (section.label === "Interpretation") expect(section.sourceKeys).toBeUndefined();
    }
  });

  it("resolves citations only from the verified seed", () => {
    expect(getInsightSources(["bog-drachma"])[0]).toMatchObject({
      publisher: "Bank of Greece",
      url: "https://www.bankofgreece.gr/en/the-bank/history/drachma",
    });
    expect(() => getInsightSources(["unknown"])).toThrow("Unknown insight source");
  });

  it("returns undefined for an unknown article", () => {
    expect(getInsightArticle("not-real")).toBeUndefined();
    expect(insightArticles).toHaveLength(1);
  });
});

describe("insights routes", () => {
  it("renders the index and canonical article link", () => {
    const html = renderToStaticMarkup(<InsightsPage />);
    expect(html).toContain("History,");
    expect(html).toContain("with receipts.");
    expect(html).toContain(`href="/insights/${slug}"`);
  });

  it("renders labeled prose, citations, contents, and related methodologies", async () => {
    const html = renderToStaticMarkup(await InsightArticlePage({ params: Promise.resolve({ slug }) }));
    expect(html).toContain("Sourced fact");
    expect(html).toContain("Interpretation");
    expect(html).toContain('aria-label="Article contents"');
    expect(html).toContain("Source for Replacement through currency union: the drachma");
    expect(html).toContain("Related methodologies");
    expect(html).not.toContain("financial advice");
  });

  it("generates one static route and article metadata", async () => {
    expect(generateStaticParams()).toEqual([{ slug }]);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.title).toBe("A currency can end without collapsing | CurrencyDeaths");
    expect(metadata.alternates).toEqual({ canonical: `/insights/${slug}` });
    expect(metadata.openGraph).toMatchObject({ type: "article", url: `/insights/${slug}` });
  });

  it("marks missing-article metadata noindex", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "missing" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
