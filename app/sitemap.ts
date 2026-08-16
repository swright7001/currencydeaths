import type { MetadataRoute } from "next";
import { currencyDetailSlugs } from "../lib/data/currency-detail";
import { insightSlugs } from "../lib/data/insights";
import { primaryNavigation } from "../lib/site-navigation";
import { absoluteSiteUrl } from "../lib/site-url";

export const indexableStaticPaths = [
  ...primaryNavigation.map(({ href }) => href),
  "/methodology/dollar-stress-score",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...indexableStaticPaths,
    ...currencyDetailSlugs.map((slug) => `/deaths/${slug}`),
    ...insightSlugs.map((slug) => `/insights/${slug}`),
  ];

  return paths.map((path) => ({ url: absoluteSiteUrl(path) }));
}
