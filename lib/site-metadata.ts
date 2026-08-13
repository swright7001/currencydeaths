import type { Metadata } from "next";
import { resolveSiteUrl } from "./site-url";

export const siteMetadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: "CurrencyDeaths — Monetary History Research",
    template: "%s | CurrencyDeaths",
  },
  description:
    "An educational monetary-history and purchasing-power research project.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CurrencyDeaths",
    title: "CurrencyDeaths — Monetary History Research",
    description:
      "Source-disciplined monetary history, currency transitions, and U.S. dollar stress research.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "CurrencyDeaths — Monetary History Research",
    description:
      "Source-disciplined monetary history, currency transitions, and U.S. dollar stress research.",
  },
};
