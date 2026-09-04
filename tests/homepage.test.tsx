import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home, { Homepage } from "../app/page";

describe("cinematic homepage shell", () => {
  const html = renderToStaticMarkup(<Homepage />);

  it("frames the approved horizon as an illustrative scenario rather than a death date", () => {
    expect(html).toContain("Dollar Stress Horizon");
    expect(html).toContain("Illustrative horizon");
    expect(html).toContain("Current trajectory");
    expect(html).toContain("Fiscal acceleration");
    expect(html).toContain("Stabilization");
    expect(html).toContain("Estimated midpoint to extreme modeled stress");
    expect(html).toContain("Illustrative range: 8–14 years");
    expect(html).toContain("43.5");
    expect(html).toContain("Elevated selected stress");
    expect(html).toContain("usd-stress-v1.0.0");
    expect(html).toContain("usd-stress-horizon-v1.0.0");
    expect(html).toContain("Neither is a probability");
    expect(html).toContain("In plain English:");
    expect(html).toContain("43.5 means elevated pressure");
    expect(html).toContain("not a 43.5% chance that the dollar fails");
    expect(html).not.toContain("probability of failure");
    expect(html).not.toContain("time to failure");
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

  it("exposes homepage provenance and snapshot freshness", () => {
    expect(html).toContain("Dollar inputs: verified dated snapshot");
    expect(html).toContain("Historical records:");
    expect(html).toContain("Inspect dollar sources");
    expect(html).toContain("repository-backed");
  });

  it("loads the repository-backed research adapter for the default route", async () => {
    const routeHtml = renderToStaticMarkup(await Home());
    expect(routeHtml).toContain("Repository-backed limited five-record verified seed");
    expect(routeHtml).toContain("repository-backed");
  });

  it.each([
    ["loading", "Research modules loading", 'role="status"'],
    ["error", "Research modules unavailable", 'role="alert"'],
    ["stale", "Research refresh due", "Stale"],
  ] as const)("renders the %s delivery state without removing modules", (state, notice, marker) => {
    const stateHtml = renderToStaticMarkup(<Homepage deliveryState={state} />);

    expect(stateHtml).toContain(notice);
    expect(stateHtml).toContain(marker);
    if (state === "stale") expect(stateHtml).toContain("Verified seed · refresh due");
    expect(stateHtml).toContain("Selected-sample lifespan distribution");
    expect(stateHtml).toContain("How the U.S. dollar compares");
  });
});
