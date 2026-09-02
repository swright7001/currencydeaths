import { describe, expect, it } from "vitest";
import {
  buildHomepageDashboard,
  homepageDeliveryStates,
} from "../lib/data/homepage-dashboard";

describe("homepage dashboard model", () => {
  it("derives research summaries and the approved experimental stress index", () => {
    const dashboard = buildHomepageDashboard();

    expect(dashboard.stress).toMatchObject({
      state: "sourced",
      value: "43.5",
      band: "Elevated",
      methodologyVersion: "usd-stress-v1.0.0",
    });
    expect(dashboard.stress.componentCount).toBe(3);
    expect(dashboard.lifespan.recordCount).toBe(5);
    expect(dashboard.lifespan.average).not.toBeNull();
    expect(
      dashboard.lifespan.distribution.reduce((sum, band) => sum + band.count, 0) +
        dashboard.lifespan.crossBandCount,
    ).toBe(dashboard.lifespan.recordCount);
    expect(
      dashboard.survival.counts.reduce((sum, item) => sum + item.value, 0),
    ).toBe(dashboard.survival.total);
  });

  it("keeps historical outcomes distinct and makes no dollar prediction", () => {
    const dashboard = buildHomepageDashboard();

    expect(dashboard.comparisonRows[0].outcome).toBe("No outcome predicted");
    expect(dashboard.comparisonRows.some((row) => row.outcome.includes("followed by"))).toBe(true);
    expect(dashboard.comparisonRows.some((row) => row.outcome.includes("successor"))).toBe(true);
  });

  it.each(homepageDeliveryStates)("defines a layout-safe %s state", (state) => {
    const dashboard = buildHomepageDashboard(state);

    expect(dashboard.deliveryState).toBe(state);
    expect(dashboard.currencyCards).toHaveLength(5);
    expect(dashboard.comparisonRows).toHaveLength(5);
    expect(state === "ready" ? dashboard.deliveryNotice : dashboard.deliveryNotice?.role).toBe(
      state === "ready" ? null : state === "error" ? "alert" : "status",
    );
    expect(dashboard.lifespan.state).toBe(state === "stale" ? "stale" : "sourced");
    expect(dashboard.survival.state).toBe(state === "stale" ? "stale" : "sourced");
    expect(dashboard.currencyCards.every((card) => card.evidence === (state === "stale" ? "stale" : "sourced"))).toBe(true);
    expect(dashboard.comparisonRows.slice(1).every((row) => row.evidence === (state === "stale" ? "stale" : "sourced"))).toBe(true);
  });
});
