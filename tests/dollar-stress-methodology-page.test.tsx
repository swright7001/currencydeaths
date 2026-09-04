import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DollarStressScoreMethodologyPage, {
  metadata,
} from "../app/methodology/dollar-stress-score/page";

describe("dollar stress methodology route", () => {
  it("publishes canonical metadata without probability language", () => {
    expect(metadata.alternates?.canonical).toBe("/methodology/dollar-stress-score");
    expect(metadata.title).toContain("Dollar Stress Score and Horizon Methodology");
  });

  it("renders formula, provenance, version, policies, and limitations", () => {
    const html = renderToStaticMarkup(<DollarStressScoreMethodologyPage />);
    expect(html).toContain("Approved experimental method");
    expect(html).toContain("usd-stress-v1.0.0");
    expect(html).toContain("Normalize. Weight. Add.");
    expect(html).toContain("same month prior year");
    expect(html).toContain("source-update, access, dataset, and method versions");
    expect(html).toContain("Withhold the score.");
    expect(html).toContain("Horizon, not a death date.");
    expect(html).toContain("usd-stress-horizon-v1.0.0");
    expect(html).toContain("11 years 2 months");
    expect(html).toContain("6 years 1 month");
    expect(html).toContain("No finite crossing");
    expect(html).toContain("FRED M2SL source");
    expect(html).toContain("What the score cannot tell you");
    expect(html).not.toContain("probability of failure");
  });
});
