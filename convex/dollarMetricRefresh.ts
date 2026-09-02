"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import {
  FRED_REFRESH_BACKOFF_MS,
  FRED_REFRESH_MAX_ATTEMPTS,
  FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES,
  FRED_REFRESH_MAX_RESPONSE_BYTES,
  FRED_REFRESH_TIMEOUT_MS,
  canonicalizeFredRefresh,
  fredRefreshSeriesContracts,
  parseFredSeriesResponses,
  type FredRefreshSeries,
} from "../lib/data/fred-refresh-contract";
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

class RefreshError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url: URL) {
  for (let attempt = 0; attempt < FRED_REFRESH_MAX_ATTEMPTS; attempt += 1) {
    if (FRED_REFRESH_BACKOFF_MS[attempt] > 0) {
      await wait(FRED_REFRESH_BACKOFF_MS[attempt]);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FRED_REFRESH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      const retryable = response.status === 429 || response.status >= 500;
      if (!response.ok) {
        if (retryable && attempt + 1 < FRED_REFRESH_MAX_ATTEMPTS) continue;
        throw new RefreshError(`fred_http_${response.status}`);
      }
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim();
      if (contentType !== "application/json") throw new RefreshError("fred_content_type");
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (declaredLength > FRED_REFRESH_MAX_RESPONSE_BYTES) {
        throw new RefreshError("fred_response_too_large");
      }
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > FRED_REFRESH_MAX_RESPONSE_BYTES) {
        throw new RefreshError("fred_response_too_large");
      }
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new RefreshError("fred_invalid_json");
      }
    } catch (error) {
      if (error instanceof RefreshError) throw error;
      if (attempt + 1 >= FRED_REFRESH_MAX_ATTEMPTS) {
        throw new RefreshError(error instanceof DOMException && error.name === "AbortError"
          ? "fred_timeout"
          : "fred_network");
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new RefreshError("fred_attempts_exhausted");
}

function endpoint(path: "series" | "series/observations", seriesId: string, apiKey: string) {
  const url = new URL(`https://api.stlouisfed.org/fred/${path}`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  if (path === "series/observations") {
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", String(FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES));
  }
  return url;
}

function ascendingObservations(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return payload;
  const root = payload as Record<string, unknown>;
  if (!Array.isArray(root.observations)) return payload;
  return { ...root, observations: [...root.observations].reverse() };
}

async function fetchApprovedSeries(apiKey: string, retrievedAt: number) {
  const results: FredRefreshSeries[] = [];
  for (const contract of fredRefreshSeriesContracts) {
    const metadata = await fetchJson(endpoint("series", contract.sourceSeriesId, apiKey));
    const observations = await fetchJson(
      endpoint("series/observations", contract.sourceSeriesId, apiKey),
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
    const apiKey = process.env.FRED_API_KEY;
    if (apiKey === undefined || !/^[a-z0-9]{32}$/.test(apiKey)) {
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
      throw new RefreshError("fred_api_key_unavailable");
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
          errorCode: error instanceof RefreshError ? error.code : "refresh_validation_failed",
          startedAt,
          completedAt: Date.now(),
        });
      }
      throw error;
    }
  },
});
