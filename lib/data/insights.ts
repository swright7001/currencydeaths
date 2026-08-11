import type { SourceReference } from "../../components/research";
import { verifiedCurrencySeed } from "./verified-currency-seed";

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type InsightFactClaim = Readonly<{
  text: string;
  sourceKeys: NonEmptyReadonlyArray<string>;
}>;

export type InsightFactSection = Readonly<{
  id: string;
  kind: "fact";
  heading: string;
  claims: NonEmptyReadonlyArray<InsightFactClaim>;
}>;

export type InsightInterpretationSection = Readonly<{
  id: string;
  kind: "interpretation";
  heading: string;
  paragraphs: NonEmptyReadonlyArray<string>;
}>;

export type InsightSection = InsightFactSection | InsightInterpretationSection;

export type InsightArticle = Readonly<{
  slug: string;
  title: string;
  dek: string;
  category: string;
  readingMinutes: number;
  publishedDate: string;
  updatedDate: string;
  editorialReview: Readonly<{
    status: "approved";
    reviewedDate: string;
    reviewedContentSha: string;
  }>;
  sections: readonly InsightSection[];
  relatedMethodologies: readonly Readonly<{ title: string; href: string; note: string }>[];
}>;

const sourceByKey = new Map<string, (typeof verifiedCurrencySeed.sources)[number]>(
  verifiedCurrencySeed.sources.map((source) => [source.key, source]),
);

export const insightArticles: readonly InsightArticle[] = [
  {
    slug: "currency-endings-are-not-all-collapses",
    title: "A currency can end without collapsing",
    dek: "Replacement, redenomination, currency union, and collapse describe different transitions. Treating them as synonyms produces bad history—and worse comparisons.",
    category: "Classification",
    readingMinutes: 6,
    publishedDate: "2026-08-11",
    updatedDate: "2026-08-11",
    editorialReview: {
      status: "approved",
      reviewedDate: "2026-08-11",
      reviewedContentSha: "5f63d4b2181ddeaee67f64b71bd23404256bd27b",
    },
    sections: [
      {
        id: "the-distinction",
        kind: "interpretation",
        heading: "The ending is not the diagnosis",
        paragraphs: [
          "A currency’s final date tells us when one monetary unit stopped serving its recorded role. It does not, by itself, tell us why. An orderly currency-union transition and a hyperinflationary abandonment can both produce an end date while describing radically different economic experiences.",
          "CurrencyDeaths therefore treats status and cause as separate fields. The classification is a research aid, not a verdict on every institution or policy surrounding the transition.",
        ],
      },
      {
        id: "drachma",
        kind: "fact",
        heading: "The drachma and the euro cash changeover",
        claims: [
          {
            text: "The Bank of Greece records the drachma as Greece’s national currency from 1833 and identifies 28 February 2002 as the date drachma cash ceased to be legal tender after euro cash entered circulation.",
            sourceKeys: ["bog-drachma"],
          },
        ],
      },
      {
        id: "papiermark",
        kind: "fact",
        heading: "The paper mark and the 1923 currency reform",
        claims: [
          {
            text: "Deutsche Bundesbank material dates the suspension of gold convertibility to 31 July 1914 and describes the 1923 hyperinflation. Currency reform introduced the Rentenmark in November 1923, with the Reichsmark following as the official successor in 1924.",
            sourceKeys: ["bundesbank-inflation-history", "bundesbank-purchasing-power"],
          },
        ],
      },
      {
        id: "redenomination",
        kind: "fact",
        heading: "The Venezuelan bolívar redenomination dates",
        claims: [
          {
            text: "IMF records show the bolívar fuerte began on 1 January 2008 and was replaced by the bolívar soberano on 20 August 2018 at 100,000 old units to one new unit amid hyperinflation.",
            sourceKeys: ["imf-venezuela-redenomination", "imf-venezuela-exchange-metadata"],
          },
        ],
      },
      {
        id: "comparison-rule",
        kind: "interpretation",
        heading: "A better rule for historical comparison",
        paragraphs: [
          "In this archive, the drachma outcome is classified as replacement through currency union—not collapse. The paper mark sequence supports a replacement status with hyperinflation as the primary documented cause. Redenomination can accompany severe monetary stress, but the label itself is an operation—not a complete causal explanation.",
          "Compare mechanisms before outcomes: ask what changed in fiscal capacity, monetary issuance, convertibility, political authority, and public confidence. Then ask whether the ending was planned, coerced, or disorderly.",
          "This discipline does not make history less urgent. It makes the warning signs more credible by refusing to turn unlike events into one dramatic statistic.",
        ],
      },
    ],
    relatedMethodologies: [
      {
        title: "Dollar Stress Score methodology",
        href: "/methodology/dollar-stress-score",
        note: "How current U.S. indicators remain separate from historical outcome claims.",
      },
      {
        title: "Lifespan research conventions",
        href: "/lifespan#lifespan-methodology-title",
        note: "How start, end, precision, selection, and aggregation are handled.",
      },
    ],
  },
] as const;

export const insightSlugs = insightArticles.map((article) => article.slug);

export function getInsightArticle(slug: string) {
  return insightArticles.find((article) => article.slug === slug);
}

export function getInsightSources(keys: readonly string[]): readonly SourceReference[] {
  return keys.map((key) => {
    const source = sourceByKey.get(key);
    if (source === undefined) throw new Error(`Unknown insight source: ${key}`);
    return {
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      accessedDate: new Date(verifiedCurrencySeed.accessedAt).toISOString().slice(0, 10),
    };
  });
}

export function validateInsightArticles(articles: readonly InsightArticle[]): void {
  const slugs = new Set<string>();
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error(`Duplicate insight slug: ${article.slug}`);
    slugs.add(article.slug);
    if (!/^[0-9a-f]{40}$/.test(article.editorialReview.reviewedContentSha)) {
      throw new Error(`Invalid editorial review SHA: ${article.slug}`);
    }
    for (const section of article.sections) {
      if (section.kind !== "fact") continue;
      for (const claim of section.claims) {
        if (claim.sourceKeys.length === 0) throw new Error(`Unsourced insight claim: ${claim.text}`);
        getInsightSources(claim.sourceKeys);
      }
    }
  }
}

validateInsightArticles(insightArticles);

export function createInsightStructuredData(article: InsightArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedDate,
    dateModified: article.updatedDate,
    author: { "@type": "Organization", name: "CurrencyDeaths Research" },
    publisher: { "@type": "Organization", name: "CurrencyDeaths" },
    mainEntityOfPage: `/insights/${article.slug}`,
  } as const;
}
