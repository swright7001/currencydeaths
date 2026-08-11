import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartFrame } from "../components/charts/chart-frame";
import { MetricCard } from "../components/metrics/metric-card";
import { MetricTrend } from "../components/metrics/metric-trend";
import { RiskBadge } from "../components/metrics/risk-badge";
import { MethodologyTooltip } from "../components/research/methodology-tooltip";
import { dataStateDescriptors } from "../components/research/presentation-types";
import { SourceCitation } from "../components/research/source-citation";

describe("research display primitives", () => {
  it.each(["sourced", "stale", "fixture", "empty", "unavailable"] as const)(
    "exposes the %s data state in text and markup",
    (state) => {
      const html = renderToStaticMarkup(
        <MetricCard label="Purchasing power" value={null} state={state} />,
      );

      expect(html).toContain(`data-state="${state}"`);
      expect(html).toContain("data-state-badge");
      expect(html).toContain(dataStateDescriptors[state].label);
      expect(html).toContain("aria-label=\"No value\"");
    },
  );

  it("describes trend direction without relying on its arrow or color", () => {
    const html = renderToStaticMarkup(
      <MetricTrend direction="down" value="2.1 points" context="since 2020" />,
    );

    expect(html).toContain("Decreased");
    expect(html).toContain('data-direction="down"');
    expect(html).toContain("2.1 points");
  });

  it("gives risk levels a textual label and non-color mark", () => {
    const html = renderToStaticMarkup(<RiskBadge level="high" />);

    expect(html).toContain("High risk");
    expect(html).toContain('data-risk="high"');
    expect(html).toContain("△");
  });

  it("renders source provenance and dates as a named citation region", () => {
    const html = renderToStaticMarkup(
      <SourceCitation
        state="stale"
        claim="The observation is due for review."
        source={{
          title: "Selected data series",
          publisher: "Public research institution",
          url: "https://example.com/series",
          publicationDate: "2025-01-01",
          accessedDate: "2026-08-10",
        }}
      />,
    );

    expect(html).toContain('aria-label="Source citation"');
    expect(html).toContain("The observation is due for review.");
    expect(html).toContain("Published 2025-01-01 · Accessed 2026-08-10");
    expect(html).toContain('rel="noreferrer"');
  });

  it("uses a native keyboard-operable disclosure for methodology", () => {
    const html = renderToStaticMarkup(
      <MethodologyTooltip
        title="Normalization"
        description="Values are normalized against a documented range."
        href="/methodology/dollar-stress-score"
      />,
    );

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain('href="/methodology/dollar-stress-score"');
  });

  it("pairs charts with a textual description and patterned legend markers", () => {
    const html = renderToStaticMarkup(
      <ChartFrame
        title="Lifespan distribution"
        description="Most observations fall between twenty and forty years."
        state="fixture"
        legend={[
          { label: "Observed", marker: "line", tone: "signal" },
          { label: "Estimated range", marker: "dash", tone: "neutral" },
        ]}
      >
        <svg role="img" aria-label="Example distribution" />
      </ChartFrame>,
    );

    expect(html).toContain("<figcaption>");
    expect(html).toContain("Chart description:");
    expect(html).toContain('aria-label="Chart legend"');
    expect(html).toContain('data-marker="dash"');
  });
});
