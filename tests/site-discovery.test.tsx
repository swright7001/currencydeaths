import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import RootError from "../app/error";
import NotFound from "../app/not-found";
import robots from "../app/robots";
import sitemap, { indexableStaticPaths } from "../app/sitemap";
import { serializeJsonLd } from "../lib/json-ld";
import { siteMetadata as rootMetadata } from "../lib/site-metadata";
import {
  absoluteSiteUrl,
  resolveSiteUrl,
  SiteUrlConfigurationError,
} from "../lib/site-url";

const originalSiteUrl = process.env.CURRENCYDEATHS_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.CURRENCYDEATHS_SITE_URL;
  else process.env.CURRENCYDEATHS_SITE_URL = originalSiteUrl;
});

describe("site origin and discovery routes", () => {
  it("uses a deterministic local fallback and accepts an approved HTTPS origin", () => {
    expect(resolveSiteUrl(undefined).toString()).toBe("http://localhost:3000/");
    expect(resolveSiteUrl("https://research.example/").toString()).toBe(
      "https://research.example/",
    );
    expect(absoluteSiteUrl("/deaths", new URL("https://research.example"))).toBe(
      "https://research.example/deaths",
    );
  });

  it("rejects unsafe or ambiguous canonical origins", () => {
    expect(() => resolveSiteUrl("http://research.example")).toThrow(
      SiteUrlConfigurationError,
    );
    expect(() => resolveSiteUrl("https://research.example/path")).toThrow(
      /only an origin/,
    );
    expect(() => absoluteSiteUrl("deaths")).toThrow(/begin with a slash/);
  });

  it("publishes exactly the approved public route inventory", () => {
    delete process.env.CURRENCYDEATHS_SITE_URL;
    const urls = sitemap().map((entry) => entry.url);
    expect(indexableStaticPaths).toHaveLength(7);
    expect(urls).toHaveLength(13);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("http://localhost:3000/deaths/german-papiermark");
    expect(urls).toContain(
      "http://localhost:3000/insights/currency-endings-are-not-all-collapses",
    );
    expect(urls.some((url) => url.includes("/watchlist/"))).toBe(false);
    expect(sitemap().every((entry) => entry.lastModified === undefined)).toBe(true);
  });

  it("keeps token routes out of crawl while exposing the sitemap", () => {
    delete process.env.CURRENCYDEATHS_SITE_URL;
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/watchlist/verify", "/watchlist/unsubscribe"],
      },
      sitemap: "http://localhost:3000/sitemap.xml",
    });
  });

  it("defines root canonical, social, and title-template metadata", () => {
    expect(rootMetadata.metadataBase?.toString()).toBe("http://localhost:3000/");
    expect(rootMetadata.title).toMatchObject({ template: "%s | CurrencyDeaths" });
    expect(rootMetadata.alternates).toEqual({ canonical: "/" });
    expect(rootMetadata.openGraph).toMatchObject({ type: "website", url: "/" });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary" });
  });
});

describe("safe global states", () => {
  it("escapes markup-significant bytes in inline JSON-LD", () => {
    const serialized = serializeJsonLd({ value: "</script><script>alert('&')</script>" });
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual({
      value: "</script><script>alert('&')</script>",
    });
  });

  it("renders one-heading, keyboard-actionable not-found and error states", () => {
    const notFoundHtml = renderToStaticMarkup(<NotFound />);
    const errorHtml = renderToStaticMarkup(<RootError reset={() => undefined} />);
    expect((notFoundHtml.match(/<h1/g) ?? []).length).toBe(1);
    expect(notFoundHtml).toContain('href="/deaths"');
    expect((errorHtml.match(/<h1/g) ?? []).length).toBe(1);
    expect(errorHtml).toContain("Retry page");
    expect(errorHtml).not.toContain("digest");
  });
});
