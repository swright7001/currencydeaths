import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LifespanPage from "../app/lifespan/page";

describe("lifespan research page", () => {
  it("renders derived ranges with adjacent sample limitations", async () => {
    const html = renderToStaticMarkup(
      await LifespanPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain("46.8–47.2 years");
    expect(html).toContain("Repository-backed verified seed");
    expect(html).toContain('data-research-source="repository"');
    expect(html).toContain("19 years");
    expect(html).toContain("curated five-case research seed");
    expect(html).toContain("must not be generalized to all fiat currencies");
    expect(html).not.toContain("average fiat lifespan");
  });

  it("uses native URL-addressable controls and textual chart counts", async () => {
    const html = renderToStaticMarkup(
      await LifespanPage({
        searchParams: Promise.resolve({ region: "europe", cause: "hyperinflation" }),
      }),
    );

    expect(html).toContain('action="/lifespan"');
    expect(html).toContain('method="get"');
    expect(html).toContain('<option value="europe" selected="">europe</option>');
    expect(html).toContain("2 active");
    expect(html).toContain('aria-label="Lifespan distribution by band"');
    expect(html).toContain("Counts are the accessible text equivalent of each bar.");
  });

  it("renders an honest no-results state", async () => {
    const html = renderToStaticMarkup(
      await LifespanPage({
        searchParams: Promise.resolve({ region: "africa", cause: "currency_union" }),
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("The filters exhaust this sample.");
    expect(html).toContain("no values are imputed");
    expect(html).not.toContain("NaN");
  });
});
