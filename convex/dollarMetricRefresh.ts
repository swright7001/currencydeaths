"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import {
  canonicalizeFredRefresh,
  fredRefreshSeriesContracts,
  parseFredSeriesResponses,
  type FredRefreshSeries,
} from "../lib/data/fred-refresh-contract";
import {
  buildFredEndpoint,
  fetchFredJson,
  FredRequestError,
  validateFredApiKey,
} from "../lib/data/fred-api-client";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const resultValidator = v.object({
  mode: v.union(v.literal("dry_run"), v.literal("manual"), v.literal("scheduled")),
  outcome: v.union(v.literal("validated"), v.literal("activated"), v.literal("unchanged")),
  batchKey: v.string(),
  payloadDigest: v.string(),
  observationCount: v.number(),
  missingCount: v.number(),
  observationsWritten: v.number(),
});

type RefreshRunResult = {
  mode: "dry_run" | "manual" | "scheduled";
  outcome: "validated" | "activated" | "unchanged";
  batchKey: string;
  payloadDigest: string;
  observationCount: number;
  missingCount: number;
  observationsWritten: number;
};

type AppliedBatchResult = {
  outcome: "activated" | "unchanged";
  batchKey: string;
  observationsWritten: number;
  previousBatchId: string | null;
};

function ascendingObservations(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return payload;
  const root = payload as Record<string, unknown>;
  if (!Array.isArray(root.observations)) return payload;
  return { ...root, observations: [...root.observations].reverse() };
}

async function fetchApprovedSeries(apiKey: string, retrievedAt: number) {
  const results: FredRefreshSeries[] = [];
  for (const contract of fredRefreshSeriesContracts) {
    const metadata = await fetchFredJson(buildFredEndpoint("series", contract.sourceSeriesId, apiKey));
    const observations = await fetchFredJson(
      buildFredEndpoint("series/observations", contract.sourceSeriesId, apiKey),
    );
    results.push(
      parseFredSeriesResponses(
        contract,
        metadata,
        ascendingObservations(observations),
        retrievedAt,
      ),
    );
  }
  return results;
}

export const run = internalAction({
  args: {
    mode: v.union(v.literal("dry_run"), v.literal("manual"), v.literal("scheduled")),
  },
  returns: resultValidator,
  handler: async (ctx, args): Promise<RefreshRunResult> => {
    const startedAt = Date.now();
    const runKey = `${args.mode}:${startedAt}`;
    let apiKey: string;
    try {
      apiKey = validateFredApiKey(process.env.FRED_API_KEY);
    } catch (error) {
      if (args.mode !== "dry_run") {
        await ctx.runMutation(internal.dollarMetricRefreshStore.recordRun, {
          runKey,
          mode: args.mode,
          outcome: "failed",
          errorCode: "fred_api_key_unavailable",
          startedAt,
          completedAt: Date.now(),
        });
      }
      throw error;
    }
    try {
      const retrievedAt = Date.now();
      const series = await fetchApprovedSeries(apiKey, retrievedAt);
      // Retrieval time is provenance, not source-payload identity. Excluding it keeps
      // repeated reads of unchanged FRED data idempotent while each run remains audited.
      const canonical = canonicalizeFredRefresh(series);
      const payloadDigest = createHash("sha256").update(canonical).digest("hex");
      const batchKey = `fred-refresh-v1:${payloadDigest}`;
      const observationCount = series.reduce((sum, item) => sum + item.observations.length, 0);
      const missingCount = series.reduce(
        (sum, item) => sum + item.observations.filter((row) => row.value === null).length,
        0,
      );
      if (args.mode === "dry_run") {
        return {
          mode: args.mode,
          outcome: "validated" as const,
          batchKey,
          payloadDigest,
          observationCount,
          missingCount,
          observationsWritten: 0,
        };
      }
      const applied: AppliedBatchResult = await ctx.runMutation(
        internal.dollarMetricRefreshStore.applyValidatedBatch,
        {
          batchKey,
          payloadDigest,
          retrievedAt,
          series: series.map((item) => ({
            ...item,
            observations: item.observations.map((observation) => ({ ...observation })),
          })),
        },
      );
      await ctx.runMutation(internal.dollarMetricRefreshStore.recordRun, {
        runKey,
        mode: args.mode,
        outcome: applied.outcome,
        batchKey,
        startedAt,
        completedAt: Date.now(),
      });
      return {
        mode: args.mode,
        outcome: applied.outcome,
        batchKey,
        payloadDigest,
        observationCount,
        missingCount,
        observationsWritten: applied.observationsWritten,
      };
    } catch (error) {
      if (args.mode !== "dry_run") {
        await ctx.runMutation(internal.dollarMetricRefreshStore.recordRun, {
          runKey,
          mode: args.mode,
          outcome: "failed",
          errorCode: error instanceof FredRequestError ? error.code : "refresh_validation_failed",
          startedAt,
          completedAt: Date.now(),
        });
      }
      throw error;
    }
  },
});
