import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { fredRefreshSeriesContracts } from "../lib/data/fred-refresh-contract";
import { dollarMetricDefinitions } from "../lib/data/dollar-metric-contracts";
import schema from "./schema";
import { modules } from "./test.setup";

const snapshotVersion = "usd-metrics-verified-2026-09-02" as const;
const retrievedAt = Date.UTC(2026, 8, 2);

function refreshSeries(offset = 0) {
  return fredRefreshSeriesContracts.map((contract) => {
    const quarterly = contract.metric === "federal_debt_to_gdp";
    const observations = quarterly
      ? [4, 7, 10].map((month, index) => ({
          date: `2025-${String(month).padStart(2, "0")}-01`,
          value: 100 + index + offset,
        })).concat([
          { date: "2026-01-01", value: 103 + offset },
          { date: "2026-04-01", value: 104 + offset },
        ])
      : Array.from({ length: 13 }, (_, index) => {
          const ordinal = 2025 * 12 + 6 + index;
          const year = Math.floor(ordinal / 12);
          const month = (ordinal % 12) + 1;
          return {
            date: `${year}-${String(month).padStart(2, "0")}-01`,
            value: 100 + index + offset,
          };
        });
    return {
      metric: contract.metric,
      sourceSeriesId: contract.sourceSeriesId,
      title: contract.title,
      publisher: contract.publisher,
      url: contract.url,
      unit: dollarMetricDefinitions[contract.metric].unit,
      frequency: dollarMetricDefinitions[contract.metric].frequency,
      sourceUpdatedAt: Date.UTC(2026, 7, 25),
      observations,
    };
  });
}

describe("dollar metric refresh persistence", () => {
  it("fails a credential-free dry run without writing operational state", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(internal.dollarMetricRefresh.run, { mode: "dry_run" }),
    ).rejects.toThrow("fred_api_key_unavailable");
    expect(await t.run((ctx) => ctx.db.query("dollarMetricRefreshRuns").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("dollarMetricRefreshBatches").collect())).toEqual([]);
    await expect(
      t.action(internal.dollarMetricRefresh.run, { mode: "manual" }),
    ).rejects.toThrow("fred_api_key_unavailable");
    const runs = await t.run((ctx) => ctx.db.query("dollarMetricRefreshRuns").collect());
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      mode: "manual",
      outcome: "failed",
      errorCode: "fred_api_key_unavailable",
    });
    expect(JSON.stringify(runs[0])).not.toContain("api_key=");
  });

  it("activates atomically, is idempotent, exposes provenance, and rolls back", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.dollarMetrics.applyVerifiedSnapshot, { version: snapshotVersion });
    const firstDigest = "a".repeat(64);
    const first = await t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
      batchKey: `fred-refresh-v1:${firstDigest}`,
      payloadDigest: firstDigest,
      retrievedAt,
      series: refreshSeries(),
    });
    expect(first).toMatchObject({ outcome: "activated", observationsWritten: 31 });
    expect(
      await t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
        batchKey: `fred-refresh-v1:${firstDigest}`,
        payloadDigest: firstDigest,
        retrievedAt: retrievedAt + 1_000,
        series: refreshSeries(),
      }),
    ).toMatchObject({ outcome: "unchanged", observationsWritten: 0 });

    const m2 = await t.query(api.dollarMetrics.getSeries, {
      metric: "m2",
      asOf: retrievedAt,
      contextLimit: 120,
    });
    expect(m2).toMatchObject({
      datasetVersion: `fred-refresh-v1:${firstDigest}`,
      retrievedAt,
      latest: {
        value: 112,
        source: { accessedAt: retrievedAt },
      },
      developmentNotice: null,
    });

    const secondDigest = "b".repeat(64);
    await t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
      batchKey: `fred-refresh-v1:${secondDigest}`,
      payloadDigest: secondDigest,
      retrievedAt: retrievedAt + 86_400_000,
      series: refreshSeries(1),
    });
    const counts = await t.run(async (ctx) => ({
      batches: (await ctx.db.query("dollarMetricRefreshBatches").collect()).length,
      revisions: (await ctx.db.query("dollarMetricRevisions").collect()).length,
    }));
    expect(counts).toEqual({ batches: 2, revisions: 62 });
    await t.mutation(internal.dollarMetricRefreshStore.rollbackActiveBatch, {});
    expect(
      (await t.query(api.dollarMetrics.getSeries, { metric: "m2", asOf: retrievedAt }))
        ?.datasetVersion,
    ).toBe(`fred-refresh-v1:${firstDigest}`);
  });

  it("rejects a partial or discontinuous batch without any refresh writes", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.dollarMetrics.applyVerifiedSnapshot, { version: snapshotVersion });
    const digest = "c".repeat(64);
    await expect(
      t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
        batchKey: `fred-refresh-v1:${digest}`,
        payloadDigest: digest,
        retrievedAt,
        series: refreshSeries().slice(0, 2),
      }),
    ).rejects.toThrow("exact approved series set");
    const invalid = refreshSeries();
    invalid[0].observations[1].date = "2026-06-01";
    await expect(
      t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
        batchKey: `fred-refresh-v1:${digest}`,
        payloadDigest: digest,
        retrievedAt,
        series: invalid,
      }),
    ).rejects.toThrow("chronology is invalid");
    expect(
      await t.run(async (ctx) => ctx.db.query("dollarMetricRefreshBatches").collect()),
    ).toEqual([]);
  });

  it("rejects stale observation periods before writing", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.dollarMetrics.applyVerifiedSnapshot, { version: snapshotVersion });
    const digest = "d".repeat(64);
    const stale = refreshSeries();
    stale[0].observations = [
      { date: "2020-01-01", value: 1 },
      { date: "2020-02-01", value: 2 },
    ];
    await expect(
      t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
        batchKey: `fred-refresh-v1:${digest}`,
        payloadDigest: digest,
        retrievedAt,
        series: stale,
      }),
    ).rejects.toThrow("latest observation is stale");
    expect(await t.run((ctx) => ctx.db.query("dollarMetricRevisions").collect())).toEqual([]);
  });

  it("rejects a batch one millisecond beyond the monthly observation boundary", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.dollarMetrics.applyVerifiedSnapshot, { version: snapshotVersion });
    const digest = "e".repeat(64);
    const julyPeriodEnd = Date.UTC(2026, 7, 0, 23, 59, 59, 999);
    await expect(
      t.mutation(internal.dollarMetricRefreshStore.applyValidatedBatch, {
        batchKey: `fred-refresh-v1:${digest}`,
        payloadDigest: digest,
        retrievedAt: julyPeriodEnd + (75 * 86_400_000) + 1,
        series: refreshSeries(),
      }),
    ).rejects.toThrow("latest observation is stale");
    expect(await t.run((ctx) => ctx.db.query("dollarMetricRefreshBatches").collect())).toEqual([]);
  });
});
