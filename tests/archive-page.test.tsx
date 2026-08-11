import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DeathsPage from "../app/deaths/page";

describe("currency archive page", () => {
  it("renders query state into native shareable form controls", async () => {
    const html = renderToStaticMarkup(
      await DeathsPage({
        searchParams: Promise.resolve({ region: "europe", status: "replaced" }),
      }),
    );

    expect(html).toContain('action="/deaths"');
    expect(html).toContain('method="get"');
    expect(html).toContain('<option value="europe" selected="">europe</option>');
    expect(html).toContain('<option value="replaced" selected="">replaced</option>');
    expect(html).toContain("2 active filters");
  });

  it("keeps inflation severity unavailable instead of inferring it", async () => {
    const html = renderToStaticMarkup(
      await DeathsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain("Inflation severity");
    expect(html).toContain("does not contain a comparable sourced series");
    expect(html).toContain('id="archive-inflation" disabled=""');
    expect(html).not.toContain('name="inflation"');
  });

  it("shows a clear accessible no-result state", async () => {
    const html = renderToStaticMarkup(
      await DeathsPage({
        searchParams: Promise.resolve({ country: "greece", cause: "hyperinflation" }),
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("No verified records match");
    expect(html).toContain("will not invent missing classifications");
  });

  it("links every result to its canonical detail slug", async () => {
    const html = renderToStaticMarkup(
      await DeathsPage({ searchParams: Promise.resolve({}) }),
    );

    expect((html.match(/href="\/deaths\//g) ?? [])).toHaveLength(10);
    expect(html).toContain('href="/deaths/german-papiermark"');
    expect(html).toContain('href="/deaths/greek-drachma"');
  });
});
