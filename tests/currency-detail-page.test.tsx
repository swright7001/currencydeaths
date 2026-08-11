import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CurrencyDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "../app/deaths/[slug]/page";

describe("currency detail route", () => {
  it("generates one route per verified slug", () => {
    expect(generateStaticParams()).toHaveLength(5);
    expect(generateStaticParams()).toContainEqual({ slug: "greek-drachma" });
  });

  it("generates source-backed metadata and a canonical path", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "german-papiermark" }),
    });
    expect(metadata.title).toContain("German paper mark");
    expect(metadata.alternates?.canonical).toBe("/deaths/german-papiermark");
    expect(metadata.description).toContain("1923 hyperinflation");
  });

  it("marks unknown metadata routes noindex", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "not-a-record" }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders cited evidence and explicit unavailable research", async () => {
    const html = renderToStaticMarkup(
      await CurrencyDetailPage({
        params: Promise.resolve({ slug: "greek-drachma" }),
      }),
    );
    expect(html).toContain("Historical timeline");
    expect(html).toContain("year precision");
    expect(html).toContain("day precision");
    expect(html).toContain("No claim-level evidence for this section");
    expect(html).toContain("recorded in verified seed");
    expect((html.match(/data-state="unavailable"/g) ?? []).length).toBe(6);
    expect(html).not.toContain("0%");
  });

  it("marks an unrecorded symbol unavailable instead of inferring one", async () => {
    const html = renderToStaticMarkup(
      await CurrencyDetailPage({
        params: Promise.resolve({ slug: "german-papiermark" }),
      }),
    );
    expect(html).toContain("no symbol inferred");
    expect((html.match(/data-state="unavailable"/g) ?? []).length).toBe(7);
  });

  it("throws the Next not-found boundary for unknown slugs", async () => {
    await expect(
      CurrencyDetailPage({ params: Promise.resolve({ slug: "not-a-record" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
