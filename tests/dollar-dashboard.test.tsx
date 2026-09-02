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
  it("builds sorted metrics and the complete approved experimental score", () => {
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
    expect(dashboard.stress.status).toBe("experimental");
    expect(dashboard.stress.score).toBe(43.5);
    expect(dashboard.stress.band).toBe("Elevated");
    expect(dashboard.stress.contributions).toHaveLength(3);
    expect(dashboard.stress.missingComponents).toHaveLength(0);
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
    expect(dashboard.stress.status).toBe("unavailable");
    expect(dashboard.stress.score).toBeNull();
    expect(dashboard.stress.sensitivity).toEqual([]);
  });

  it("withholds the score for missing or conflicting dashboard series", () => {
    const series = buildSnapshotDollarMetricSeries(Date.UTC(2026, 8, 2));
    const missing = buildDollarDashboardFromSeries(series.slice(0, 2));
    expect(missing.metrics).toHaveLength(2);
    expect(missing.stress.score).toBeNull();
    expect(missing.stress.sensitivity).toEqual([]);
    expect(missing.stress.missingComponents.map((component) => component.id)).toEqual([
      "federal_debt_burden",
    ]);

    const conflicting = buildDollarDashboardFromSeries([
      { ...series[0], latest: { ...series[0].latest, value: series[0].latest.value + 1 } },
      series[1],
      series[2],
    ]);
    expect(conflicting.stress.score).toBeNull();
    expect(conflicting.stress.sensitivity).toEqual([]);
    expect(conflicting.stress.missingComponents.map((component) => component.id)).toEqual([
      "monetary_expansion",
    ]);

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
    expect(html).toContain("43.5 / 100");
    expect(html).toContain("usd-stress-v1.0.0");
    expect(html).toContain("Weight sensitivity");
    expect(html).toContain("Clipped at the approved p95 ceiling");
    expect(html).toContain("Current observation");
    expect(html).toContain("23,218 billions USD · SA");
    expect(html).toContain("22,025.5 billions USD · SA");
    expect(html).toContain("Prior-year observation");
    expect(html).toContain("Source updated");
    expect(html).toContain("Accessed");
    expect(html).toContain("source updated");
    expect(html).toContain("freshness at snapshot retrieval: current");
    expect(html).toContain("relative change from");
    expect(html).toContain("observation values");
    expect(html).toContain("Verified dated snapshot");
    expect(html).toContain("not long-run evidence");
    expect(html).not.toContain("probability of failure");
  });
});
