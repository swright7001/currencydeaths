import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DollarStressScoreMethodologyPage, {
  metadata,
} from "../app/methodology/dollar-stress-score/page";

describe("dollar stress methodology route", () => {
  it("publishes canonical metadata without probability language", () => {
    expect(metadata.alternates?.canonical).toBe("/methodology/dollar-stress-score");
    expect(metadata.title).toContain("Dollar Stress Score Methodology");
  });

  it("renders formula, provenance, version, policies, and limitations", () => {
    const html = renderToStaticMarkup(<DollarStressScoreMethodologyPage />);
    expect(html).toContain("Not production approved");
    expect(html).toContain("usd-stress-experimental-0.1.0");
    expect(html).toContain("Normalize. Weight. Add.");
    expect(html).toContain("Withhold the score.");
    expect(html).toContain("Calculate, then flag.");
    expect(html).toContain("FRED M2SL source");
    expect(html).toContain("What the score cannot tell you");
    expect(html).not.toContain("probability of failure");
  });
});
