import { ConvexError, v } from "convex/values";
import {
  FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES,
  FRED_REFRESH_METHODOLOGY_VERSION,
  FRED_REFRESH_VERSION,
  fredRefreshSeriesContracts,
} from "../lib/data/fred-refresh-contract";
import { dollarMetricDefinitions, dollarMetricKeys } from "../lib/data/dollar-metric-contracts";
import { historicalDateToKey } from "../lib/data/historical-date";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  dollarMetricFrequencyValidator,
  dollarMetricKeyValidator,
  dollarMetricUnitValidator,
} from "./validators";

const activeDatasetKey = "official_usd_v1";

const observationInputValidator = v.object({
  date: v.string(),
  value: v.union(v.number(), v.null()),
});

const seriesInputValidator = v.object({
  metric: dollarMetricKeyValidator,
  sourceSeriesId: v.string(),
  title: v.string(),
  publisher: v.string(),
  url: v.string(),
  unit: dollarMetricUnitValidator,
  frequency: dollarMetricFrequencyValidator,
  sourceUpdatedAt: v.number(),
  observations: v.array(observationInputValidator),
});

const applyResultValidator = v.object({
  outcome: v.union(v.literal("activated"), v.literal("unchanged")),
  batchKey: v.string(),
  observationsWritten: v.number(),
  previousBatchId: v.union(v.id("dollarMetricRefreshBatches"), v.null()),
});

function parseObservationDate(date: string) {
  const match = /^(\d{4})-(\d{2})-01$/.exec(date);
  if (match === null) throw new ConvexError(`Refresh observation date is invalid: ${date}.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const value = { year, month, precision: "month" as const };
  historicalDateToKey(value);
  return value;
}

function monthOrdinal(date: string) {
  const parsed = parseObservationDate(date);
  return parsed.year * 12 + parsed.month! - 1;
}

function validateSeries(args: {
  retrievedAt: number;
  series: Array<{
    metric: (typeof dollarMetricKeys)[number];
    sourceSeriesId: string;
    title: string;
    publisher: string;
    url: string;
    unit: (typeof dollarMetricDefinitions)[(typeof dollarMetricKeys)[number]]["unit"];
    frequency: "monthly" | "quarterly";
    sourceUpdatedAt: number;
    observations: Array<{ date: string; value: number | null }>;
  }>;
}) {
  if (!Number.isFinite(args.retrievedAt) || args.retrievedAt <= 0) {
    throw new ConvexError("Refresh retrieval time must be positive and finite.");
  }
  if (args.series.length !== dollarMetricKeys.length) {
    throw new ConvexError("Refresh requires the exact approved series set.");
  }
  const seen = new Set<string>();
  for (const series of args.series) {
    if (seen.has(series.metric)) throw new ConvexError(`Duplicate refresh metric: ${series.metric}.`);
    seen.add(series.metric);
    const contract = fredRefreshSeriesContracts.find((item) => item.metric === series.metric);
    const definition = dollarMetricDefinitions[series.metric];
    if (
      contract === undefined ||
      series.sourceSeriesId !== contract.sourceSeriesId ||
      series.title !== contract.title ||
      series.publisher !== contract.publisher ||
      series.url !== contract.url ||
      series.unit !== definition.unit ||
      series.frequency !== definition.frequency
    ) {
      throw new ConvexError(`Refresh source contract mismatch: ${series.metric}.`);
    }
    if (
      !Number.isFinite(series.sourceUpdatedAt) ||
      series.sourceUpdatedAt <= 0 ||
      series.sourceUpdatedAt > args.retrievedAt
    ) {
      throw new ConvexError(`Refresh source timing is invalid: ${series.metric}.`);
    }
    if (
      series.observations.length < 2 ||
      series.observations.length > FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES
    ) {
      throw new ConvexError(`Refresh observation count is invalid: ${series.metric}.`);
    }
    const step = series.frequency === "monthly" ? 1 : 3;
    for (let index = 0; index < series.observations.length; index += 1) {
      const observation = series.observations[index];
      if (observation.value !== null && !Number.isFinite(observation.value)) {
        throw new ConvexError(`Refresh observation value is invalid: ${series.metric}.`);
      }
      if (index > 0) {
        const previous = series.observations[index - 1];
        if (monthOrdinal(observation.date) - monthOrdinal(previous.date) !== step) {
          throw new ConvexError(`Refresh chronology is invalid: ${series.metric}.`);
        }
      } else {
        parseObservationDate(observation.date);
      }
    }
    const latest = series.observations.at(-1)!;
    if (latest.value === null) {
      throw new ConvexError(`Refresh latest observation is missing: ${series.metric}.`);
    }
    const latestTimestamp = Date.parse(`${latest.date}T00:00:00Z`);
    if (latestTimestamp > series.sourceUpdatedAt) {
      throw new ConvexError(`Refresh latest observation is after its source update: ${series.metric}.`);
    }
  }
}

export const applyValidatedBatch = internalMutation({
  args: {
    batchKey: v.string(),
    payloadDigest: v.string(),
    retrievedAt: v.number(),
    series: v.array(seriesInputValidator),
  },
  returns: applyResultValidator,
  handler: async (ctx, args) => {
    if (!/^fred-refresh-v1:[a-f0-9]{64}$/.test(args.batchKey)) {
      throw new ConvexError("Refresh batch key is invalid.");
    }
    if (!/^[a-f0-9]{64}$/.test(args.payloadDigest)) {
      throw new ConvexError("Refresh payload digest is invalid.");
    }
    validateSeries(args);
    const existing = await ctx.db
      .query("dollarMetricRefreshBatches")
      .withIndex("by_batch_key", (q) => q.eq("batchKey", args.batchKey))
      .unique();
    const active = await ctx.db
      .query("dollarMetricActiveDatasets")
      .withIndex("by_key", (q) => q.eq("key", activeDatasetKey))
      .unique();
    if (existing !== null) {
      if (existing.payloadDigest !== args.payloadDigest) {
        throw new ConvexError("Refresh batch key conflicts with stored payload.");
      }
      return {
        outcome: "unchanged" as const,
        batchKey: args.batchKey,
        observationsWritten: 0,
        previousBatchId: active?.previousBatchId ?? null,
      };
    }

    const sourceIds = new Map<string, Id<"sources">>();
    for (const series of args.series) {
      const source = await ctx.db
        .query("sources")
        .withIndex("by_url", (q) => q.eq("url", series.url))
        .unique();
      if (
        source === null ||
        source.title !== series.title ||
        source.publisher !== series.publisher ||
        source.sourceType !== "central_bank"
      ) {
        throw new ConvexError(`Approved source record is missing or conflicting: ${series.metric}.`);
      }
      sourceIds.set(series.metric, source._id);
    }

    const observationCount = args.series.reduce((sum, item) => sum + item.observations.length, 0);
    const missingCount = args.series.reduce(
      (sum, item) => sum + item.observations.filter((observation) => observation.value === null).length,
      0,
    );
    const now = Date.now();
    const batchId = await ctx.db.insert("dollarMetricRefreshBatches", {
      batchKey: args.batchKey,
      payloadDigest: args.payloadDigest,
      refreshVersion: FRED_REFRESH_VERSION,
      methodologyVersion: FRED_REFRESH_METHODOLOGY_VERSION,
      retrievedAt: args.retrievedAt,
      observationCount,
      missingCount,
      sources: args.series.map((series) => ({
        metric: series.metric,
        sourceSeriesId: series.sourceSeriesId,
        title: series.title,
        publisher: series.publisher,
        url: series.url,
        unit: series.unit,
        frequency: series.frequency,
        sourceUpdatedAt: series.sourceUpdatedAt,
      })),
      createdAt: now,
    });
    for (const series of args.series) {
      const sourceId = sourceIds.get(series.metric)!;
      for (const observation of series.observations) {
        const observationDate = parseObservationDate(observation.date);
        await ctx.db.insert("dollarMetricRevisions", {
          batchId,
          metric: series.metric,
          observationDate,
          observationDateKey: historicalDateToKey(observationDate),
          value: observation.value,
          unit: series.unit,
          frequency: series.frequency,
          sourceSeriesId: series.sourceSeriesId,
          sourceUpdatedAt: series.sourceUpdatedAt,
          retrievedAt: args.retrievedAt,
          sourceId,
          createdAt: now,
        });
      }
    }
    if (active === null) {
      await ctx.db.insert("dollarMetricActiveDatasets", {
        key: activeDatasetKey,
        activeBatchId: batchId,
        activatedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(active._id, {
        activeBatchId: batchId,
        previousBatchId: active.activeBatchId,
        activatedAt: now,
        updatedAt: now,
      });
    }
    return {
      outcome: "activated" as const,
      batchKey: args.batchKey,
      observationsWritten: observationCount,
      previousBatchId: active?.activeBatchId ?? null,
    };
  },
});

export const rollbackActiveBatch = internalMutation({
  args: {},
  returns: v.object({
    activeBatchId: v.id("dollarMetricRefreshBatches"),
    rolledBackBatchId: v.id("dollarMetricRefreshBatches"),
  }),
  handler: async (ctx) => {
    const active = await ctx.db
      .query("dollarMetricActiveDatasets")
      .withIndex("by_key", (q) => q.eq("key", activeDatasetKey))
      .unique();
    if (active === null || active.previousBatchId === undefined) {
      throw new ConvexError("No previous complete refresh batch is available for rollback.");
    }
    const rolledBackBatchId = active.activeBatchId;
    await ctx.db.patch(active._id, {
      activeBatchId: active.previousBatchId,
      previousBatchId: rolledBackBatchId,
      activatedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { activeBatchId: active.previousBatchId, rolledBackBatchId };
  },
});

export const recordRun = internalMutation({
  args: {
    runKey: v.string(),
    mode: v.union(v.literal("scheduled"), v.literal("manual")),
    outcome: v.union(v.literal("activated"), v.literal("unchanged"), v.literal("failed")),
    batchKey: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dollarMetricRefreshRuns")
      .withIndex("by_run_key", (q) => q.eq("runKey", args.runKey))
      .unique();
    if (existing !== null) return null;
    await ctx.db.insert("dollarMetricRefreshRuns", args);
    return null;
  },
});

export const getActiveBatch = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      batchKey: v.string(),
      payloadDigest: v.string(),
      retrievedAt: v.number(),
      observationCount: v.number(),
      missingCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const active = await ctx.db
      .query("dollarMetricActiveDatasets")
      .withIndex("by_key", (q) => q.eq("key", activeDatasetKey))
      .unique();
    if (active === null) return null;
    const batch = await ctx.db.get(active.activeBatchId);
    if (batch === null) throw new ConvexError("Active refresh batch reference is invalid.");
    return {
      batchKey: batch.batchKey,
      payloadDigest: batch.payloadDigest,
      retrievedAt: batch.retrievedAt,
      observationCount: batch.observationCount,
      missingCount: batch.missingCount,
    };
  },
});
