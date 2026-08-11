import { ConvexError, v } from "convex/values";
import {
  calculateDollarMetricFreshness,
  findDollarMetricGaps,
} from "../lib/data/dollar-metric-contracts";
import {
  assertDollarMetricFixtureIntegrity,
  dollarMetricFixtures,
  DOLLAR_METRIC_FIXTURE_VERSION,
} from "../lib/data/dollar-metric-fixtures";
import { historicalDateToKey } from "../lib/data/historical-date";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import {
  dollarMetricFrequencyValidator,
  dollarMetricKeyValidator,
  dollarMetricUnitValidator,
  historicalDateValidator,
  recordStateValidator,
  sourceTypeValidator,
} from "./validators";

const fixtureVersionValidator = v.literal(DOLLAR_METRIC_FIXTURE_VERSION);

const sourceOutputValidator = v.object({
  id: v.id("sources"),
  title: v.string(),
  publisher: v.string(),
  url: v.string(),
  publicationDate: v.union(v.null(), historicalDateValidator),
  accessedAt: v.number(),
  sourceType: sourceTypeValidator,
});

const observationOutputValidator = v.object({
  id: v.id("dollarMetrics"),
  metric: dollarMetricKeyValidator,
  observationDate: historicalDateValidator,
  value: v.number(),
  unit: dollarMetricUnitValidator,
  frequency: dollarMetricFrequencyValidator,
  sourceSeriesId: v.string(),
  sourceUpdatedAt: v.number(),
  fixtureBatchVersion: v.union(v.null(), v.string()),
  notes: v.union(v.null(), v.string()),
  recordState: recordStateValidator,
  source: sourceOutputValidator,
});

const seriesResultValidator = v.union(
  v.null(),
  v.object({
    metric: dollarMetricKeyValidator,
    latest: observationOutputValidator,
    directionWindow: v.array(observationOutputValidator),
    contextSeries: v.array(observationOutputValidator),
    gaps: v.array(
      v.object({
        afterDate: historicalDateValidator,
        beforeDate: historicalDateValidator,
        missingPeriods: v.number(),
      }),
    ),
    freshness: v.object({
      asOf: v.number(),
      sourceUpdatedAt: v.number(),
      ageDays: v.number(),
      thresholdDays: v.number(),
      state: v.union(v.literal("current"), v.literal("stale")),
    }),
    developmentNotice: v.union(v.null(), v.string()),
  }),
);

function requireLimit(value: number | undefined, fallback: number, maximum: number) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > maximum) {
    throw new ConvexError(`Query limit must be an integer from 1 through ${maximum}.`);
  }
  return resolved;
}

function requireCompleteObservation(
  observation: Doc<"dollarMetrics">,
): asserts observation is Doc<"dollarMetrics"> & {
  frequency: NonNullable<Doc<"dollarMetrics">["frequency"]>;
  sourceSeriesId: string;
  sourceUpdatedAt: number;
} {
  if (
    observation.frequency === undefined ||
    observation.sourceSeriesId === undefined ||
    observation.sourceUpdatedAt === undefined
  ) {
    throw new ConvexError(
      "Dollar metric observation predates the provenance contract and cannot be returned.",
    );
  }
}

async function resolveObservation(
  ctx: QueryCtx,
  observation: Doc<"dollarMetrics">,
) {
  requireCompleteObservation(observation);
  const source = await ctx.db.get(observation.sourceId);
  if (source === null) {
    throw new ConvexError("Dollar metric source reference is invalid.");
  }
  return {
    id: observation._id,
    metric: observation.metric,
    observationDate: observation.observationDate,
    value: observation.value,
    unit: observation.unit,
    frequency: observation.frequency,
    sourceSeriesId: observation.sourceSeriesId,
    sourceUpdatedAt: observation.sourceUpdatedAt,
    fixtureBatchVersion: observation.fixtureBatchVersion ?? null,
    notes: observation.notes ?? null,
    recordState: observation.recordState,
    source: {
      id: source._id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      publicationDate: source.publicationDate ?? null,
      accessedAt: source.accessedAt,
      sourceType: source.sourceType,
    },
  };
}

export const getSeries = query({
  args: {
    metric: dollarMetricKeyValidator,
    asOf: v.number(),
    directionWindowSize: v.optional(v.number()),
    contextLimit: v.optional(v.number()),
  },
  returns: seriesResultValidator,
  handler: async (ctx, args) => {
    const directionWindowSize = requireLimit(args.directionWindowSize, 3, 24);
    const contextLimit = requireLimit(args.contextLimit, 60, 120);
    const takeLimit = Math.max(directionWindowSize, contextLimit);
    const descending = await ctx.db
      .query("dollarMetrics")
      .withIndex("by_metric_and_observation_date_key", (q) => q.eq("metric", args.metric))
      .order("desc")
      .take(takeLimit);
    const latest = descending[0];
    if (latest === undefined) return null;
    requireCompleteObservation(latest);
    let freshness;
    try {
      freshness = calculateDollarMetricFreshness(
        latest.metric,
        latest.sourceUpdatedAt,
        args.asOf,
      );
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : "Invalid freshness input.");
    }

    const contextDocuments = descending.slice(0, contextLimit).reverse();
    const directionDocuments = descending.slice(0, directionWindowSize).reverse();
    const [latestOutput, directionWindow, contextSeries] = await Promise.all([
      resolveObservation(ctx, latest),
      Promise.all(directionDocuments.map((observation) => resolveObservation(ctx, observation))),
      Promise.all(contextDocuments.map((observation) => resolveObservation(ctx, observation))),
    ]);

    return {
      metric: args.metric,
      latest: latestOutput,
      directionWindow,
      contextSeries,
      gaps: findDollarMetricGaps(contextDocuments, latest.frequency),
      freshness,
      developmentNotice: contextDocuments.some(
        (observation) => observation.recordState === "development_fixture",
      )
        ? "Development fixtures — not live data. Values may be revised; consult the cited source."
        : null,
    };
  },
});

export const applyDevelopmentFixtures = internalMutation({
  args: { version: fixtureVersionValidator },
  returns: v.object({
    version: fixtureVersionValidator,
    inserted: v.object({ sources: v.number(), observations: v.number() }),
    existing: v.object({ sources: v.number(), observations: v.number() }),
  }),
  handler: async (ctx) => {
    assertDollarMetricFixtureIntegrity();
    const now = Date.now();
    const sourceIds = new Map<string, Id<"sources">>();
    const inserted = { sources: 0, observations: 0 };
    const existing = { sources: 0, observations: 0 };

    for (const source of dollarMetricFixtures.sources) {
      const stored = await ctx.db
        .query("sources")
        .withIndex("by_url", (q) => q.eq("url", source.url))
        .unique();
      if (stored !== null) {
        if (stored.seedVersion !== DOLLAR_METRIC_FIXTURE_VERSION) {
          throw new ConvexError(`Fixture source URL is owned by another record: ${source.url}.`);
        }
        sourceIds.set(source.key, stored._id);
        existing.sources += 1;
        continue;
      }
      const sourceId = await ctx.db.insert("sources", {
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        accessedAt: dollarMetricFixtures.accessedAt,
        sourceType: source.sourceType,
        seedVersion: DOLLAR_METRIC_FIXTURE_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      sourceIds.set(source.key, sourceId);
      inserted.sources += 1;
    }

    for (const observation of dollarMetricFixtures.observations) {
      const observationDateKey = historicalDateToKey(observation.observationDate);
      const sourceId = sourceIds.get(observation.sourceKey);
      if (sourceId === undefined) {
        throw new ConvexError(`Fixture source was not resolved: ${observation.sourceKey}.`);
      }
      const stored = await ctx.db
        .query("dollarMetrics")
        .withIndex("by_metric_and_observation_date_key", (q) =>
          q.eq("metric", observation.metric).eq("observationDateKey", observationDateKey),
        )
        .unique();
      if (stored !== null) {
        if (
          stored.fixtureBatchVersion !== DOLLAR_METRIC_FIXTURE_VERSION ||
          stored.value !== observation.value ||
          stored.unit !== observation.unit ||
          stored.frequency !== observation.frequency ||
          stored.sourceSeriesId !== observation.sourceSeriesId ||
          stored.sourceUpdatedAt !== observation.sourceUpdatedAt ||
          stored.sourceId !== sourceId ||
          stored.recordState !== "development_fixture"
        ) {
          throw new ConvexError(
            `Fixture observation conflicts with stored data: ${observation.metric} ${observationDateKey}.`,
          );
        }
        existing.observations += 1;
        continue;
      }
      await ctx.db.insert("dollarMetrics", {
        metric: observation.metric,
        observationDate: observation.observationDate,
        observationDateKey,
        value: observation.value,
        unit: observation.unit,
        frequency: observation.frequency,
        sourceSeriesId: observation.sourceSeriesId,
        sourceUpdatedAt: observation.sourceUpdatedAt,
        fixtureBatchVersion: DOLLAR_METRIC_FIXTURE_VERSION,
        sourceId,
        notes: observation.notes,
        recordState: "development_fixture",
        createdAt: now,
        updatedAt: now,
      });
      inserted.observations += 1;
    }

    return { version: DOLLAR_METRIC_FIXTURE_VERSION, inserted, existing };
  },
});

export const removeDevelopmentFixtures = internalMutation({
  args: { version: fixtureVersionValidator },
  returns: v.object({ version: fixtureVersionValidator, removedObservations: v.number() }),
  handler: async (ctx) => {
    const expectedCount = dollarMetricFixtures.observations.length;
    const expectedIdentities = new Set(
      dollarMetricFixtures.observations.map(
        (observation) =>
          `${observation.metric}:${historicalDateToKey(observation.observationDate)}`,
      ),
    );
    const observations = await ctx.db
      .query("dollarMetrics")
      .withIndex("by_fixture_batch_version", (q) =>
        q.eq("fixtureBatchVersion", DOLLAR_METRIC_FIXTURE_VERSION),
      )
      .take(expectedCount + 1);
    if (observations.length > expectedCount) {
      throw new ConvexError("Fixture batch contains unexpected observations; removal aborted.");
    }
    if (
      observations.some(
        (observation) =>
          !expectedIdentities.has(`${observation.metric}:${observation.observationDateKey}`),
      )
    ) {
      throw new ConvexError("Fixture batch contains an unknown observation; removal aborted.");
    }
    for (const observation of observations) await ctx.db.delete(observation._id);
    return { version: DOLLAR_METRIC_FIXTURE_VERSION, removedObservations: observations.length };
  },
});
