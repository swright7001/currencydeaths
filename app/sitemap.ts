import type { MetadataRoute } from "next";
import { currencyDetailSlugs } from "../lib/data/currency-detail";
import { insightSlugs } from "../lib/data/insights";
import { absoluteSiteUrl } from "../lib/site-url";

export const indexableStaticPaths = [
  "/",
  "/deaths",
  "/dollar",
  "/compare",
  "/lifespan",
  "/insights",
  "/methodology/dollar-stress-score",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...indexableStaticPaths,
    ...currencyDetailSlugs.map((slug) => `/deaths/${slug}`),
    ...insightSlugs.map((slug) => `/insights/${slug}`),
  ];

  return paths.map((path) => ({ url: absoluteSiteUrl(path) }));
}
