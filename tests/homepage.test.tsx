import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home, { Homepage } from "../app/page";

describe("cinematic homepage shell", () => {
  const html = renderToStaticMarkup(<Home />);

  it("frames the model as an inert educational fixture", () => {
    expect(html).toContain("Experimental Dollar Stress Model");
    expect(html).toContain("This interval does not run and is not a forecast");
    expect(html).toContain("Development fixture");
    expect(html).toContain("required methodology inputs are unavailable");
    expect(html).not.toContain(">68<");
    expect(html).not.toContain("probability of failure");
    expect(html).not.toContain("death date");
  });

  it("distinguishes sourced seed data from withheld research", () => {
    expect(html).toContain("Verified historical records");
    expect(html).toContain("Verified seed");
    expect(html).toContain("Selected-sample average lifespan");
    expect(html).toContain("not representative of all fiat currencies");
    expect(html).toContain("No outcome predicted");
  });

  it("labels provocative framing as interpretation instead of a universal finding", () => {
    expect(html).toContain("Editorial thesis / interpretation");
    expect(html).toContain(
      "This headline is an editorial thesis, not a universal empirical finding",
    );
  });

  it("separates a currency outcome from the system that followed it", () => {
    expect(html).toContain("collapsed; followed by: Multicurrency system");
    expect(html).toContain("replaced; successor: Rentenmark");
    expect(html).not.toContain("collapsed by");
  });

  it("renders each verified currency record without invented peak metrics", () => {
    expect((html.match(/Open research record/g) ?? [])).toHaveLength(5);
    expect(html).toContain("German paper mark (Papiermark)");
    expect(html).toContain("Greek drachma");
    expect(html).not.toContain("Peak inflation");
    expect(html).not.toContain("Purchasing power loss");
  });

  it("renders an explicit-consent double-opt-in form", () => {
    expect(html).toContain("Double opt-in required");
    expect(html).toContain("No financial alerts yet");
    expect(html).toContain("<form");
    expect(html).toContain('type="email"');
    expect(html).toContain('name="consent"');
  });

  it("provides semantic descriptions for the table and chart", () => {
    expect(html).toContain('aria-label="Currency comparison table"');
    expect(html).toContain("Selected-sample lifespan distribution");
    expect(html).toContain('aria-label="Selected-sample lifespan distribution"');
  });

  it("exposes homepage provenance and fixture freshness", () => {
    expect(html).toContain("Dollar inputs: development fixture");
    expect(html).toContain("Historical records:");
    expect(html).toContain("Inspect dollar sources");
  });

  it.each([
    ["loading", "Research modules loading", 'role="status"'],
    ["error", "Research modules unavailable", 'role="alert"'],
    ["stale", "Research refresh due", "Stale"],
  ] as const)("renders the %s delivery state without removing modules", (state, notice, marker) => {
    const stateHtml = renderToStaticMarkup(<Homepage deliveryState={state} />);

    expect(stateHtml).toContain(notice);
    expect(stateHtml).toContain(marker);
    expect(stateHtml).toContain("Selected-sample lifespan distribution");
    expect(stateHtml).toContain("How the U.S. dollar compares");
  });
});
