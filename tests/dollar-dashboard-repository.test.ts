import { describe, expect, it } from "vitest";
import { loadDollarDashboard } from "../lib/data/dollar-dashboard-repository";
import { buildSnapshotDollarMetricSeries } from "../lib/data/dollar-dashboard";

describe("dollar dashboard repository", () => {
  it("uses the repository snapshot only when Convex is not configured", async () => {
    const dashboard = await loadDollarDashboard({ convexUrl: "" });
    expect(dashboard.freshnessBasis).toBe("snapshot_retrieval");
  });

  it("requires one complete atomic configured dataset without fallback", async () => {
    const asOf = Date.UTC(2026, 8, 2);
    const fixture = buildSnapshotDollarMetricSeries(asOf).map((series) => ({
      ...series,
      datasetVersion: "fred-refresh-v1:fixture",
      retrievedAt: asOf,
    }));
    const byMetric = new Map(fixture.map((series) => [series.metric, series]));
    const dashboard = await loadDollarDashboard({
      convexUrl: "https://example.convex.cloud",
      asOf,
      fetcher: async (_url, metric) => byMetric.get(metric) ?? null,
    });
    expect(dashboard.datasetVersion).toBe("fred-refresh-v1:fixture");
    expect(dashboard.freshnessBasis).toBe("provider_retrieval");

    await expect(
      loadDollarDashboard({
        convexUrl: "https://example.convex.cloud",
        asOf,
        fetcher: async (_url, metric) => metric === "cpi" ? null : byMetric.get(metric) ?? null,
      }),
    ).rejects.toThrow("incomplete; no repository fallback");

    await expect(
      loadDollarDashboard({
        convexUrl: "https://example.convex.cloud",
        asOf,
        fetcher: async (_url, metric) => {
          const value = byMetric.get(metric);
          return value === undefined
            ? null
            : { ...value, datasetVersion: metric === "cpi" ? "different" : value.datasetVersion };
        },
      }),
    ).rejects.toThrow("one atomic dataset");
  });

  it("keeps the verified snapshot scoring path until a provider batch is active", async () => {
    const asOf = Date.UTC(2026, 8, 2);
    const fixture = buildSnapshotDollarMetricSeries(asOf);
    const byMetric = new Map(fixture.map((series) => [series.metric, series]));
    const dashboard = await loadDollarDashboard({
      convexUrl: "https://example.convex.cloud",
      asOf,
      fetcher: async (_url, metric) => byMetric.get(metric) ?? null,
    });
    expect(dashboard.freshnessBasis).toBe("explicit_as_of");
    expect(dashboard.stress.score).toBe(43.5);
  });

  it("uses the repository snapshot for an explicitly empty configured dollar store", async () => {
    const dashboard = await loadDollarDashboard({
      convexUrl: "https://example.convex.cloud",
      asOf: Date.UTC(2026, 8, 2),
      fetcher: async () => null,
    });
    expect(dashboard.datasetVersion).toBe("usd-metrics-verified-2026-09-02");
    expect(dashboard.freshnessBasis).toBe("explicit_as_of");
    expect(dashboard.stress.score).toBe(43.5);

    const stale = await loadDollarDashboard({
      convexUrl: "https://example.convex.cloud",
      asOf: Date.UTC(2027, 1, 1),
      fetcher: async () => null,
    });
    expect(stale.freshnessBasis).toBe("explicit_as_of");
    expect(stale.metrics.every((metric) => metric.freshness.state === "stale")).toBe(true);
    expect(stale.stress.score).toBeNull();
  });
});
