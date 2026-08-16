import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage, { metadata } from "../app/about/page";

describe("about research page", () => {
  it("renders the research charter and its evidence boundaries", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain("Study the ending.");
    expect(html).toContain("Sourced");
    expect(html).toContain("Development fixture");
    expect(html).toContain("Unavailable");
    expect(html).toContain("not a collapse probability or predicted death date");
    expect(html).toContain('href="/deaths"');
    expect(html).toContain('href="/methodology/dollar-stress-score"');
  });

  it("publishes canonical metadata for the route", () => {
    expect(metadata.title).toBe("About the Research");
    expect(metadata.alternates).toEqual({ canonical: "/about" });
  });
});
