import type { SourceReference } from "../../components/research";
import { verifiedCurrencySeed } from "./verified-currency-seed";

export type InsightSection = Readonly<{
  id: string;
  label: "Sourced fact" | "Interpretation";
  heading: string;
  paragraphs: readonly string[];
  sourceKeys?: readonly string[];
}>;

export type InsightArticle = Readonly<{
  slug: string;
  title: string;
  dek: string;
  category: string;
  readingMinutes: number;
  publishedDate: string;
  reviewedDate: string;
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
    reviewedDate: "2026-08-11",
    sections: [
      {
        id: "the-distinction",
        label: "Interpretation",
        heading: "The ending is not the diagnosis",
        paragraphs: [
          "A currency’s final date tells us when one monetary unit stopped serving its recorded role. It does not, by itself, tell us why. An orderly currency-union transition and a hyperinflationary abandonment can both produce an end date while describing radically different economic experiences.",
          "CurrencyDeaths therefore treats status and cause as separate fields. The classification is a research aid, not a verdict on every institution or policy surrounding the transition.",
        ],
      },
      {
        id: "drachma",
        label: "Sourced fact",
        heading: "Replacement through currency union: the drachma",
        paragraphs: [
          "The Bank of Greece records the drachma as Greece’s national currency from 1833 and identifies 28 February 2002 as the date drachma cash ceased to be legal tender after euro cash entered circulation.",
          "In this archive, that outcome is classified as replacement through currency union—not collapse. The long record crossed multiple monetary standards, so the database does not pretend one unchanged fiat regime ran continuously for the entire span.",
        ],
        sourceKeys: ["bog-drachma"],
      },
      {
        id: "papiermark",
        label: "Sourced fact",
        heading: "Replacement after hyperinflation: the paper mark",
        paragraphs: [
          "Deutsche Bundesbank material dates the suspension of gold convertibility to 31 July 1914 and describes the 1923 hyperinflation. Currency reform introduced the Rentenmark in November 1923, with the Reichsmark following as the official successor in 1924.",
          "That sequence supports a replacement status with hyperinflation as the primary documented cause. It does not support treating every historical replacement as a hyperinflationary collapse.",
        ],
        sourceKeys: ["bundesbank-inflation-history", "bundesbank-purchasing-power"],
      },
      {
        id: "redenomination",
        label: "Sourced fact",
        heading: "Redenomination: a new unit inside a continuing system",
        paragraphs: [
          "IMF records show the bolívar fuerte began on 1 January 2008 and was replaced by the bolívar soberano on 20 August 2018 at 100,000 old units to one new unit amid hyperinflation.",
          "Redenomination changes the unit of account. It can accompany severe monetary stress, but the label itself is an operation—not a complete causal explanation.",
        ],
        sourceKeys: ["imf-venezuela-redenomination", "imf-venezuela-exchange-metadata"],
      },
      {
        id: "comparison-rule",
        label: "Interpretation",
        heading: "A better rule for historical comparison",
        paragraphs: [
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

export function createInsightStructuredData(article: InsightArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedDate,
    dateModified: article.reviewedDate,
    author: { "@type": "Organization", name: "CurrencyDeaths Research" },
    publisher: { "@type": "Organization", name: "CurrencyDeaths" },
    mainEntityOfPage: `/insights/${article.slug}`,
  } as const;
}
