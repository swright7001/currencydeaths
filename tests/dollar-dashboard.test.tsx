import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DollarDashboardPage from "../app/dollar/page";
import { buildMetricSeriesChartPoints } from "../components/dollar/metric-series-chart";
import {
  buildSnapshotDollarDashboard,
  buildSnapshotDollarMetricSeries,
  buildDollarDashboardFromSeries,
  formatHistoricalMonth,
} from "../lib/data/dollar-dashboard";

describe("dollar dashboard model", () => {
  it("builds sorted, source-verified snapshot metrics without publishing a partial score", () => {
    const dashboard = buildSnapshotDollarDashboard();
    expect(dashboard.metrics.map((metric) => metric.key)).toEqual([
      "m2",
      "cpi",
      "federal_debt_to_gdp",
    ]);
    expect(dashboard.metrics.every((metric) => metric.observations.length === 5)).toBe(true);
    expect(dashboard.metrics.every((metric) => metric.source.url.startsWith("https://fred.stlouisfed.org/series/"))).toBe(true);
    expect(dashboard.metrics[0].displayValue).toBe("23.22");
    expect(dashboard.metrics[0].unitLabel).toBe("TRILLION USD · SA");
    expect(dashboard.metrics[1].trendValue).toBe("+0.07%");
    expect(dashboard.metrics[2].trendValue).toBe("+0.02%");
    expect(dashboard.metrics.every((metric) => metric.trendContext.includes("relative change"))).toBe(true);
    expect(dashboard.stress.status).toBe("unavailable");
    expect(dashboard.stress.score).toBeNull();
    expect(dashboard.stress.missingComponents).toHaveLength(3);
  });

  it("renders one sparse observation as a centered chart point", () => {
    expect(buildMetricSeriesChartPoints([42])).toBe("320.0,110.0");
    expect(buildMetricSeriesChartPoints([])).toBe("");
  });

  it("rejects invalid as-of chronology and date precision", () => {
    expect(() => buildSnapshotDollarDashboard(1)).toThrow("at or after the source update");
    expect(() => formatHistoricalMonth({ year: 2026, precision: "year" })).toThrow(
      "month-precision",
    );
  });

  it("makes a later explicit as-of evaluation stale instead of freezing current state", () => {
    const dashboard = buildSnapshotDollarDashboard(Date.UTC(2027, 1, 1));
    expect(dashboard.freshnessBasis).toBe("explicit_as_of");
    expect(dashboard.metrics.every((metric) => metric.freshness.state === "stale")).toBe(true);
  });

  it("rejects incomplete, duplicate, and inconsistent query result sets", () => {
    const series = buildSnapshotDollarMetricSeries(Date.UTC(2026, 8, 2));
    expect(() => buildDollarDashboardFromSeries(series.slice(0, 2))).toThrow(
      "exact approved query result set",
    );
    expect(() => buildDollarDashboardFromSeries([series[0], series[0], series[2]])).toThrow(
      "duplicate metrics",
    );
    expect(() =>
      buildDollarDashboardFromSeries([
        series[0],
        { ...series[1], freshness: { ...series[1].freshness, asOf: Date.UTC(2026, 7, 12) } },
        series[2],
      ]),
    ).toThrow("one freshness as-of time");
  });
});

describe("dollar dashboard route", () => {
  it("renders source, freshness, snapshot, methodology, and chart qualifications", () => {
    const html = renderToStaticMarkup(<DollarDashboardPage />);
    expect(html).toContain("Verified snapshot");
    expect(html).toContain("Score withheld");
    expect(html).toContain("usd-stress-experimental-0.1.0");
    expect(html).toContain("source updated");
    expect(html).toContain("freshness at snapshot retrieval: current");
    expect(html).toContain("relative change from");
    expect(html).toContain("observation values");
    expect(html).toContain("Verified dated snapshot");
    expect(html).toContain("not long-run evidence");
    expect(html).not.toContain("probability of failure");
  });
});
