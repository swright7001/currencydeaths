import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../app/page";

describe("cinematic homepage shell", () => {
  const html = renderToStaticMarkup(<Home />);

  it("frames the model as an inert educational fixture", () => {
    expect(html).toContain("Experimental Dollar Stress Model");
    expect(html).toContain("This interval does not run and is not a forecast");
    expect(html).toContain("Development fixture");
    expect(html).not.toContain("probability of failure");
    expect(html).not.toContain("death date");
  });

  it("distinguishes sourced seed data from withheld research", () => {
    expect(html).toContain("Verified historical records");
    expect(html).toContain("Verified seed");
    expect(html).toContain("Average fiat lifespan");
    expect(html).toContain("Withheld until inclusion rules");
    expect(html).toContain("No outcome asserted");
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
    expect((html.match(/Research page planned/g) ?? [])).toHaveLength(5);
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
    expect(html).toContain("Illustrative lifespan distribution");
    expect(html).toContain("Six outlined bars rise to the third bin");
  });
});
