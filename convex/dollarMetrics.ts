import { ConvexError, v } from "convex/values";
import {
  calculateDollarMetricFreshness,
  findDollarMetricGaps,
} from "../lib/data/dollar-metric-contracts";
import {
  assertDollarMetricFixtureIntegrity,
  dollarMetricFixtures,
  DOLLAR_METRIC_FIXTURE_VERSION,
  type DollarMetricFixtureObservation,
  type DollarMetricFixtureSource,
} from "../lib/data/dollar-metric-fixtures";
import { historicalDateToKey } from "../lib/data/historical-date";
import type { DollarMetricSeriesContract } from "../lib/data/dollar-metric-query-contract";
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

function historicalDatesMatch(
  left: Doc<"dollarMetrics">["observationDate"],
  right: DollarMetricFixtureObservation["observationDate"],
) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.precision === right.precision
  );
}

function requireStoredSourceMatches(
  stored: Doc<"sources">,
  expected: DollarMetricFixtureSource,
) {
  if (
    stored.seedVersion !== DOLLAR_METRIC_FIXTURE_VERSION ||
    stored.title !== expected.title ||
    stored.publisher !== expected.publisher ||
    stored.url !== expected.url ||
    stored.publicationDate !== undefined ||
    stored.accessedAt !== dollarMetricFixtures.accessedAt ||
    stored.sourceType !== expected.sourceType
  ) {
    throw new ConvexError(`Fixture source conflicts with stored data: ${expected.url}.`);
  }
}

function requireStoredObservationMatches(
  stored: Doc<"dollarMetrics">,
  expected: DollarMetricFixtureObservation,
  sourceId: Id<"sources">,
) {
  const observationDateKey = historicalDateToKey(expected.observationDate);
  if (
    stored.fixtureBatchVersion !== DOLLAR_METRIC_FIXTURE_VERSION ||
    stored.metric !== expected.metric ||
    !historicalDatesMatch(stored.observationDate, expected.observationDate) ||
    stored.observationDateKey !== observationDateKey ||
    stored.value !== expected.value ||
    stored.unit !== expected.unit ||
    stored.frequency !== expected.frequency ||
    stored.sourceSeriesId !== expected.sourceSeriesId ||
    stored.sourceUpdatedAt !== expected.sourceUpdatedAt ||
    stored.sourceId !== sourceId ||
    stored.notes !== expected.notes ||
    stored.recordState !== "development_fixture"
  ) {
    throw new ConvexError(
      `Fixture observation conflicts with stored data: ${expected.metric} ${observationDateKey}.`,
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
    } satisfies DollarMetricSeriesContract;
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
        requireStoredSourceMatches(stored, source);
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
        requireStoredObservationMatches(stored, observation, sourceId);
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
    assertDollarMetricFixtureIntegrity();
    const sourceIds = new Map<string, Id<"sources">>();
    for (const source of dollarMetricFixtures.sources) {
      const stored = await ctx.db
        .query("sources")
        .withIndex("by_url", (q) => q.eq("url", source.url))
        .unique();
      if (stored === null) {
        throw new ConvexError(`Fixture source is missing; removal aborted: ${source.url}.`);
      }
      requireStoredSourceMatches(stored, source);
      sourceIds.set(source.key, stored._id);
    }

    const expectedCount = dollarMetricFixtures.observations.length;
    const expectedByIdentity = new Map(
      dollarMetricFixtures.observations.map((observation) => [
        `${observation.metric}:${historicalDateToKey(observation.observationDate)}`,
        observation,
      ]),
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
    for (const stored of observations) {
      const expected = expectedByIdentity.get(`${stored.metric}:${stored.observationDateKey}`);
      if (expected === undefined) {
        throw new ConvexError("Fixture batch contains an unknown observation; removal aborted.");
      }
      const sourceId = sourceIds.get(expected.sourceKey);
      if (sourceId === undefined) {
        throw new ConvexError(`Fixture source was not resolved: ${expected.sourceKey}.`);
      }
      requireStoredObservationMatches(stored, expected, sourceId);
    }
    for (const observation of observations) await ctx.db.delete(observation._id);
    return { version: DOLLAR_METRIC_FIXTURE_VERSION, removedObservations: observations.length };
  },
});
