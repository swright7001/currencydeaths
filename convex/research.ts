import { ConvexError, v } from "convex/values";
import { historicalDateToKey } from "../lib/data/historical-date";
import { internalMutation, query } from "./_generated/server";
import {
  currencyEventTypeValidator,
  currencyStatusValidator,
  currencyTypeValidator,
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
  primaryFailureCause: v.union(v.null(), failureCauseValidator),
  failureCauses: v.array(failureCauseValidator),
  summary: v.union(v.null(), v.string()),
  historicalContext: v.union(v.null(), v.string()),
  recordState: recordStateValidator,
});

const metricWithSourceValidator = v.object({
  metric: v.string(),
  observationDate: v.string(),
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

function requireObservationDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    throw new ConvexError("Observation date must be a valid ISO calendar date (YYYY-MM-DD).");
  }
  try {
    historicalDateToKey({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      precision: "day",
    });
  } catch {
    throw new ConvexError("Observation date must be a valid ISO calendar date (YYYY-MM-DD).");
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
    const startKey = historicalDateToKey(args.startDate);
    const endKey = args.endDate === undefined ? null : historicalDateToKey(args.endDate);
    if (endKey !== null && endKey < startKey) {
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
    observationDate: v.string(),
    value: v.number(),
    unit: v.string(),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
  },
  returns: v.id("currencyMetrics"),
  handler: async (ctx, args) => {
    requireObservationDate(args.observationDate);
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
    return await ctx.db.insert("currencyMetrics", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createDollarMetric = internalMutation({
  args: {
    metric: v.string(),
    observationDate: v.string(),
    value: v.number(),
    unit: v.string(),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
  },
  returns: v.id("dollarMetrics"),
  handler: async (ctx, args) => {
    requireObservationDate(args.observationDate);
    if ((await ctx.db.get(args.sourceId)) === null) {
      throw new ConvexError("Referenced source does not exist.");
    }
    const now = Date.now();
    return await ctx.db.insert("dollarMetrics", { ...args, createdAt: now, updatedAt: now });
  },
});

export const getCurrencyBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      currency: currencySummaryValidator,
      country: countryOutputValidator,
      sources: v.array(sourceOutputValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (currency === null) {
      return null;
    }

    const country = await ctx.db.get(currency.countryId);
    if (country === null) {
      throw new ConvexError("Currency country reference is invalid.");
    }
    const sources = await Promise.all(currency.sourceIds.map((sourceId) => ctx.db.get(sourceId)));
    const resolvedSources = sources.filter((source) => source !== null);
    if (resolvedSources.length !== sources.length) {
      throw new ConvexError("Currency source reference is invalid.");
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
  },
});

export const getLatestCurrencyMetric = query({
  args: { currencyId: v.id("currencies"), metric: v.string() },
  returns: v.union(v.null(), metricWithSourceValidator),
  handler: async (ctx, args) => {
    const observation = await ctx.db
      .query("currencyMetrics")
      .withIndex("by_currency_id_and_metric_and_observation_date", (q) =>
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

export const getLatestDollarMetric = query({
  args: { metric: v.string() },
  returns: v.union(v.null(), metricWithSourceValidator),
  handler: async (ctx, args) => {
    const observation = await ctx.db
      .query("dollarMetrics")
      .withIndex("by_metric_and_observation_date", (q) => q.eq("metric", args.metric))
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
