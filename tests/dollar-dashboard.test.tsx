import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DollarDashboardPage from "../app/dollar/page";
import { buildMetricSeriesChartPoints } from "../components/dollar/metric-series-chart";
import {
  buildFixtureDollarDashboard,
  formatHistoricalMonth,
} from "../lib/data/dollar-dashboard";

describe("dollar dashboard model", () => {
  it("builds sorted, source-attributed fixture metrics without publishing a partial score", () => {
    const dashboard = buildFixtureDollarDashboard();
    expect(dashboard.metrics.map((metric) => metric.key)).toEqual([
      "m2",
      "cpi",
      "federal_debt_to_gdp",
    ]);
    expect(dashboard.metrics.every((metric) => metric.observations.length === 5)).toBe(true);
    expect(dashboard.metrics.every((metric) => metric.source.url.startsWith("https://fred.stlouisfed.org/series/"))).toBe(true);
    expect(dashboard.metrics[0].displayValue).toBe("23.16");
    expect(dashboard.metrics[0].unitLabel).toBe("TRILLION USD · SA");
    expect(dashboard.stress.status).toBe("unavailable");
    expect(dashboard.stress.missingComponents).toHaveLength(3);
  });

  it("renders one sparse observation as a centered chart point", () => {
    expect(buildMetricSeriesChartPoints([42])).toBe("320.0,110.0");
    expect(buildMetricSeriesChartPoints([])).toBe("");
  });

  it("rejects invalid as-of chronology and date precision", () => {
    expect(() => buildFixtureDollarDashboard(1)).toThrow("at or after the source update");
    expect(() => formatHistoricalMonth({ year: 2026, precision: "year" })).toThrow(
      "month-precision",
    );
  });
});

describe("dollar dashboard route", () => {
  it("renders source, freshness, fixture, methodology, and chart qualifications", () => {
    const html = renderToStaticMarkup(<DollarDashboardPage />);
    expect(html).toContain("Development data only");
    expect(html).toContain("Score withheld");
    expect(html).toContain("usd-stress-experimental-0.1.0");
    expect(html).toContain("source updated");
    expect(html).toContain("source freshness current");
    expect(html).toContain("observation values");
    expect(html).toContain("Development fixture");
    expect(html).toContain("not long-run evidence");
    expect(html).not.toContain("probability of failure");
  });
});
