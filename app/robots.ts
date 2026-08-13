import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/watchlist/verify", "/watchlist/unsubscribe"],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
