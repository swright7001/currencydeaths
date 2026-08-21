import { ConvexError, v } from "convex/values";
import {
  historicalDateToBounds,
  historicalDateToKey,
} from "../lib/data/historical-date";
import { validateDollarMetricObservation } from "../lib/data/dollar-metric-contracts";
import { VERIFIED_CURRENCY_SEED_VERSION } from "../lib/data/verified-currency-seed";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import {
  currencyEventTypeValidator,
  currencyStatusValidator,
  currencyTypeValidator,
  dollarMetricFrequencyValidator,
  dollarMetricKeyValidator,
  dollarMetricUnitValidator,
  failureCauseValidator,
  historicalDateValidator,
  recordStateValidator,
  regionValidator,
  sourceTypeValidator,
} from "./validators";

const sourceOutputValidator = v.object({
  id: v.id("sources"),
  title: v.string(),
  publisher: v.string(),
  url: v.string(),
  publicationDate: v.union(v.null(), historicalDateValidator),
  accessedAt: v.number(),
  sourceType: sourceTypeValidator,
});

const countryOutputValidator = v.object({
  id: v.id("countries"),
  name: v.string(),
  slug: v.string(),
  isoCode: v.union(v.null(), v.string()),
  region: regionValidator,
});

const currencySummaryValidator = v.object({
  id: v.id("currencies"),
  name: v.string(),
  slug: v.string(),
  symbol: v.union(v.null(), v.string()),
  currencyType: currencyTypeValidator,
  status: currencyStatusValidator,
  startDate: historicalDateValidator,
  endDate: v.union(v.null(), historicalDateValidator),
  replacementCurrencyId: v.union(v.null(), v.id("currencies")),
  replacementCurrencyName: v.union(v.null(), v.string()),
  primaryFailureCause: v.union(v.null(), failureCauseValidator),
  failureCauses: v.array(failureCauseValidator),
  summary: v.union(v.null(), v.string()),
  historicalContext: v.union(v.null(), v.string()),
  recordState: recordStateValidator,
});

const currencyRecordValidator = v.object({
  currency: currencySummaryValidator,
  country: countryOutputValidator,
  sources: v.array(sourceOutputValidator),
});

const metricWithSourceValidator = v.object({
  metric: v.string(),
  observationDate: historicalDateValidator,
  value: v.number(),
  unit: v.string(),
  notes: v.union(v.null(), v.string()),
  recordState: recordStateValidator,
  source: sourceOutputValidator,
});

function requireSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ConvexError("Slug must contain lowercase letters, numbers, and single hyphens only.");
  }
}

function requireFiniteMetricValue(value: number) {
  if (!Number.isFinite(value)) {
    throw new ConvexError("Metric value must be a finite number.");
  }
}

function requireSourceCount(sourceIds: readonly unknown[], recordState: "development_fixture" | "verified") {
  if (sourceIds.length > 25) {
    throw new ConvexError("A single record may cite at most 25 sources.");
  }
  if (recordState === "verified" && sourceIds.length === 0) {
    throw new ConvexError("Verified records require at least one source.");
  }
}

async function resolveCurrencyRecord(
  ctx: QueryCtx,
  currency: Doc<"currencies">,
  requiredSeedVersion?: string,
) {
  const country = await ctx.db.get(currency.countryId);
  if (country === null) {
    throw new ConvexError("Currency country reference is invalid.");
  }
  const sources = await Promise.all(currency.sourceIds.map((sourceId) => ctx.db.get(sourceId)));
  const resolvedSources = sources.filter((source) => source !== null);
  if (resolvedSources.length !== sources.length) {
    throw new ConvexError("Currency source reference is invalid.");
  }
  if (
    requiredSeedVersion !== undefined &&
    (currency.seedVersion !== requiredSeedVersion ||
      country.seedVersion !== requiredSeedVersion ||
      resolvedSources.some((source) => source.seedVersion !== requiredSeedVersion))
  ) {
    throw new ConvexError("Verified seed graph contains a version mismatch.");
  }

  return {
    currency: {
      id: currency._id,
      name: currency.name,
      slug: currency.slug,
      symbol: currency.symbol ?? null,
      currencyType: currency.currencyType,
      status: currency.status,
      startDate: currency.startDate,
      endDate: currency.endDate ?? null,
      replacementCurrencyId: currency.replacementCurrencyId ?? null,
      replacementCurrencyName: currency.replacementCurrencyName ?? null,
      primaryFailureCause: currency.primaryFailureCause ?? null,
      failureCauses: currency.failureCauses,
      summary: currency.summary ?? null,
      historicalContext: currency.historicalContext ?? null,
      recordState: currency.recordState,
    },
    country: {
      id: country._id,
      name: country.name,
      slug: country.slug,
      isoCode: country.isoCode ?? null,
      region: country.region,
    },
    sources: resolvedSources.map((source) => ({
      id: source._id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      publicationDate: source.publicationDate ?? null,
      accessedAt: source.accessedAt,
      sourceType: source.sourceType,
    })),
  };
}

export const createSource = internalMutation({
  args: {
    title: v.string(),
    publisher: v.string(),
    url: v.string(),
    publicationDate: v.optional(historicalDateValidator),
    accessedAt: v.number(),
    sourceType: sourceTypeValidator,
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    if (existing !== null) {
      throw new ConvexError("A source with this URL already exists.");
    }
    if (args.publicationDate !== undefined) {
      historicalDateToKey(args.publicationDate);
    }
    const now = Date.now();
    return await ctx.db.insert("sources", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createCountry = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    isoCode: v.optional(v.string()),
    region: regionValidator,
    notes: v.optional(v.string()),
  },
  returns: v.id("countries"),
  handler: async (ctx, args) => {
    requireSlug(args.slug);
    const existing = await ctx.db
      .query("countries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing !== null) {
      throw new ConvexError("A country with this slug already exists.");
    }
    const now = Date.now();
    return await ctx.db.insert("countries", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createCurrency = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    countryId: v.id("countries"),
    symbol: v.optional(v.string()),
    currencyType: currencyTypeValidator,
    status: currencyStatusValidator,
    startDate: historicalDateValidator,
    endDate: v.optional(historicalDateValidator),
    replacementCurrencyId: v.optional(v.id("currencies")),
    replacementCurrencyName: v.optional(v.string()),
    primaryFailureCause: v.optional(failureCauseValidator),
    failureCauses: v.array(failureCauseValidator),
    summary: v.optional(v.string()),
    historicalContext: v.optional(v.string()),
    sourceIds: v.array(v.id("sources")),
    recordState: recordStateValidator,
  },
  returns: v.id("currencies"),
  handler: async (ctx, args) => {
    requireSlug(args.slug);
    const startBounds = historicalDateToBounds(args.startDate);
    const endBounds = args.endDate === undefined ? null : historicalDateToBounds(args.endDate);
    if (endBounds !== null && endBounds.latestKey < startBounds.earliestKey) {
      throw new ConvexError("Currency end date cannot precede its start date.");
    }
    if (
      args.primaryFailureCause !== undefined &&
      !args.failureCauses.includes(args.primaryFailureCause)
    ) {
      throw new ConvexError("Primary failure cause must also appear in failure causes.");
    }
    requireSourceCount(args.sourceIds, args.recordState);

    const [country, replacement, existing] = await Promise.all([
      ctx.db.get(args.countryId),
      args.replacementCurrencyId === undefined ? null : ctx.db.get(args.replacementCurrencyId),
      ctx.db.query("currencies").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique(),
    ]);
    if (country === null) {
      throw new ConvexError("Referenced country does not exist.");
    }
    if (args.replacementCurrencyId !== undefined && replacement === null) {
      throw new ConvexError("Referenced replacement currency does not exist.");
    }
    if (existing !== null) {
      throw new ConvexError("A currency with this slug already exists.");
    }

    for (const sourceId of args.sourceIds) {
      if ((await ctx.db.get(sourceId)) === null) {
        throw new ConvexError("Referenced source does not exist.");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("currencies", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createCurrencyEvent = internalMutation({
  args: {
    currencyId: v.id("currencies"),
    date: historicalDateValidator,
    eventType: currencyEventTypeValidator,
    title: v.string(),
    description: v.string(),
    sourceIds: v.array(v.id("sources")),
    recordState: recordStateValidator,
  },
  returns: v.id("currencyEvents"),
  handler: async (ctx, args) => {
    const dateKey = historicalDateToKey(args.date);
    requireSourceCount(args.sourceIds, args.recordState);
    if ((await ctx.db.get(args.currencyId)) === null) {
      throw new ConvexError("Referenced currency does not exist.");
    }
    for (const sourceId of args.sourceIds) {
      if ((await ctx.db.get(sourceId)) === null) {
        throw new ConvexError("Referenced source does not exist.");
      }
    }
    const now = Date.now();
    return await ctx.db.insert("currencyEvents", {
      ...args,
      dateKey,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createCurrencyMetric = internalMutation({
  args: {
    currencyId: v.id("currencies"),
    metric: v.string(),
    observationDate: historicalDateValidator,
    value: v.number(),
    unit: v.string(),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
  },
  returns: v.id("currencyMetrics"),
  handler: async (ctx, args) => {
    const observationDateKey = historicalDateToKey(args.observationDate);
    requireFiniteMetricValue(args.value);
    const [currency, source] = await Promise.all([
      ctx.db.get(args.currencyId),
      ctx.db.get(args.sourceId),
    ]);
    if (currency === null) {
      throw new ConvexError("Referenced currency does not exist.");
    }
    if (source === null) {
      throw new ConvexError("Referenced source does not exist.");
    }
    const now = Date.now();
    return await ctx.db.insert("currencyMetrics", {
      ...args,
      observationDateKey,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createDollarMetric = internalMutation({
  args: {
    metric: dollarMetricKeyValidator,
    observationDate: historicalDateValidator,
    value: v.number(),
    unit: dollarMetricUnitValidator,
    frequency: dollarMetricFrequencyValidator,
    sourceSeriesId: v.string(),
    sourceUpdatedAt: v.number(),
    fixtureBatchVersion: v.optional(v.string()),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
  },
  returns: v.id("dollarMetrics"),
  handler: async (ctx, args) => {
    const observationDateKey = historicalDateToKey(args.observationDate);
    try {
      validateDollarMetricObservation(args);
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : "Invalid dollar metric.");
    }
    if ((await ctx.db.get(args.sourceId)) === null) {
      throw new ConvexError("Referenced source does not exist.");
    }
    const now = Date.now();
    return await ctx.db.insert("dollarMetrics", {
      ...args,
      observationDateKey,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrencyBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), currencyRecordValidator),
  handler: async (ctx, args) => {
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (currency === null) {
      return null;
    }

    return await resolveCurrencyRecord(ctx, currency);
  },
});

const verifiedSeedVersionValidator = v.literal(VERIFIED_CURRENCY_SEED_VERSION);

export const listVerifiedCurrencySeed = query({
  args: { version: verifiedSeedVersionValidator },
  returns: v.object({
    version: verifiedSeedVersionValidator,
    records: v.array(currencyRecordValidator),
  }),
  handler: async (ctx, args) => {
    const currencies = await ctx.db
      .query("currencies")
      .withIndex("by_seed_version", (q) => q.eq("seedVersion", args.version))
      .take(51);
    if (currencies.length === 0) {
      throw new ConvexError("Verified currency seed is empty.");
    }
    if (currencies.length > 50) {
      throw new ConvexError("Verified currency seed exceeds the bounded read limit.");
    }
    return {
      version: args.version,
      records: await Promise.all(
        currencies.map((currency) => resolveCurrencyRecord(ctx, currency, args.version)),
      ),
    };
  },
});

export const getVerifiedCurrencySeedBySlug = query({
  args: { version: verifiedSeedVersionValidator, slug: v.string() },
  returns: v.union(v.null(), currencyRecordValidator),
  handler: async (ctx, args) => {
    requireSlug(args.slug);
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (currency === null || currency.seedVersion !== args.version) return null;
    return await resolveCurrencyRecord(ctx, currency, args.version);
  },
});

export const getLatestCurrencyMetric = query({
  args: { currencyId: v.id("currencies"), metric: v.string() },
  returns: v.union(v.null(), metricWithSourceValidator),
  handler: async (ctx, args) => {
    const observation = await ctx.db
      .query("currencyMetrics")
      .withIndex("by_currency_id_and_metric_and_observation_date_key", (q) =>
        q.eq("currencyId", args.currencyId).eq("metric", args.metric),
      )
      .order("desc")
      .first();
    if (observation === null) {
      return null;
    }
    const source = await ctx.db.get(observation.sourceId);
    if (source === null) {
      throw new ConvexError("Metric source reference is invalid.");
    }
    return {
      metric: observation.metric,
      observationDate: observation.observationDate,
      value: observation.value,
      unit: observation.unit,
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
  },
});
