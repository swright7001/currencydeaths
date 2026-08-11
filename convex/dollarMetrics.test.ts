import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const version = "usd-metrics-development-v1" as const;

describe("dollar metric fixtures and query contracts", () => {
  it("seeds idempotently and returns bounded provenance-first series", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.dollarMetrics.applyDevelopmentFixtures, { version })).toEqual({
      version,
      inserted: { sources: 3, observations: 15 },
      existing: { sources: 0, observations: 0 },
    });
    expect(await t.mutation(internal.dollarMetrics.applyDevelopmentFixtures, { version })).toEqual({
      version,
      inserted: { sources: 0, observations: 0 },
      existing: { sources: 3, observations: 15 },
    });

    const series = await t.query(api.dollarMetrics.getSeries, {
      metric: "m2",
      asOf: Date.UTC(2026, 7, 11),
      directionWindowSize: 3,
      contextLimit: 5,
    });
    expect(series).toMatchObject({
      metric: "m2",
      latest: {
        observationDate: { year: 2026, month: 6, precision: "month" },
        value: 23_155.2,
        unit: "billions_usd_seasonally_adjusted",
        frequency: "monthly",
        sourceSeriesId: "M2SL",
        fixtureBatchVersion: version,
        recordState: "development_fixture",
        source: { url: "https://fred.stlouisfed.org/series/M2SL" },
      },
      freshness: { state: "current", thresholdDays: 45 },
      developmentNotice:
        "Development fixtures — not live data. Values may be revised; consult the cited source.",
      gaps: [],
    });
    expect(series?.directionWindow.map((observation) => observation.observationDate.month)).toEqual([
      4, 5, 6,
    ]);
    expect(series?.contextSeries).toHaveLength(5);

    expect(
      await t.mutation(internal.dollarMetrics.removeDevelopmentFixtures, { version }),
    ).toEqual({ version, removedObservations: 15 });
    expect(
      await t.query(api.dollarMetrics.getSeries, {
        metric: "m2",
        asOf: Date.UTC(2026, 7, 11),
      }),
    ).toBeNull();
  });

  it("preserves a missing month as an explicit gap", async () => {
    const t = convexTest(schema, modules);
    const sourceUpdatedAt = Date.UTC(2026, 5, 20);
    const sourceId = await t.mutation(internal.research.createSource, {
      title: "Gap test M2 source",
      publisher: "Federal Reserve test fixture",
      url: "https://example.test/m2-gap",
      accessedAt: Date.UTC(2026, 5, 21),
      sourceType: "central_bank",
    });
    for (const month of [3, 5]) {
      await t.mutation(internal.research.createDollarMetric, {
        metric: "m2",
        observationDate: { year: 2026, month, precision: "month" },
        value: 20_000 + month,
        unit: "billions_usd_seasonally_adjusted",
        frequency: "monthly",
        sourceSeriesId: "M2SL",
        sourceUpdatedAt,
        sourceId,
        recordState: "development_fixture",
      });
    }

    const series = await t.query(api.dollarMetrics.getSeries, {
      metric: "m2",
      asOf: Date.UTC(2026, 5, 21),
      contextLimit: 12,
    });
    expect(series?.contextSeries).toHaveLength(2);
    expect(series?.gaps).toEqual([
      {
        afterDate: { year: 2026, month: 3, precision: "month" },
        beforeDate: { year: 2026, month: 5, precision: "month" },
        missingPeriods: 1,
      },
    ]);
  });

  it("rejects metric-definition mismatches before insertion", async () => {
    const t = convexTest(schema, modules);
    const sourceId = await t.mutation(internal.research.createSource, {
      title: "Validation source",
      publisher: "Fixture publisher",
      url: "https://example.test/validation-source",
      accessedAt: Date.UTC(2026, 5, 21),
      sourceType: "central_bank",
    });
    await expect(
      t.mutation(internal.research.createDollarMetric, {
        metric: "cpi",
        observationDate: { year: 2026, month: 5, precision: "month" },
        value: 333.979,
        unit: "billions_usd_seasonally_adjusted",
        frequency: "monthly",
        sourceSeriesId: "CPIAUCSL",
        sourceUpdatedAt: Date.UTC(2026, 5, 20),
        sourceId,
        recordState: "development_fixture",
      }),
    ).rejects.toThrow("Metric cpi requires unit");
  });

  it("refuses to bless altered or unknown records as fixture-owned", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.dollarMetrics.applyDevelopmentFixtures, { version });
    await t.run(async (ctx) => {
      const m2 = await ctx.db
        .query("dollarMetrics")
        .withIndex("by_metric_and_observation_date_key", (q) => q.eq("metric", "m2"))
        .order("desc")
        .first();
      if (m2 === null) throw new Error("fixture observation missing");
      await ctx.db.patch(m2._id, { value: -1 });
    });
    await expect(
      t.mutation(internal.dollarMetrics.applyDevelopmentFixtures, { version }),
    ).rejects.toThrow("conflicts with stored data");

    await t.run(async (ctx) => {
      const source = await ctx.db
        .query("sources")
        .withIndex("by_url", (q) => q.eq("url", "https://fred.stlouisfed.org/series/M2SL"))
        .unique();
      if (source === null) throw new Error("fixture source missing");
      await ctx.db.insert("dollarMetrics", {
        metric: "m2",
        observationDate: { year: 2020, month: 1, precision: "month" },
        observationDateKey: 20_200_100,
        value: 1,
        unit: "billions_usd_seasonally_adjusted",
        frequency: "monthly",
        sourceSeriesId: "M2SL",
        sourceUpdatedAt: Date.UTC(2020, 1, 1),
        fixtureBatchVersion: version,
        sourceId: source._id,
        recordState: "development_fixture",
        createdAt: 0,
        updatedAt: 0,
      });
    });
    await expect(
      t.mutation(internal.dollarMetrics.removeDevelopmentFixtures, { version }),
    ).rejects.toThrow("contains unexpected observations");
  });
});
