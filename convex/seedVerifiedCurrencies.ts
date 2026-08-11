import { ConvexError, v } from "convex/values";
import {
  assertVerifiedCurrencySeedIntegrity,
  verifiedCurrencySeed,
  VERIFIED_CURRENCY_SEED_VERSION,
} from "../lib/data/verified-currency-seed";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const seedVersionValidator = v.literal(VERIFIED_CURRENCY_SEED_VERSION);

const seedResultValidator = v.object({
  version: seedVersionValidator,
  inserted: v.object({ countries: v.number(), sources: v.number(), currencies: v.number() }),
  existing: v.object({ countries: v.number(), sources: v.number(), currencies: v.number() }),
});

function requireSeedOwnership(
  existing: { seedVersion?: string },
  kind: string,
  key: string,
) {
  if (existing.seedVersion !== VERIFIED_CURRENCY_SEED_VERSION) {
    throw new ConvexError(
      `Cannot seed ${kind} ${key}: the unique key is owned by non-seed research data.`,
    );
  }
}

export const apply = internalMutation({
  args: { version: seedVersionValidator },
  returns: seedResultValidator,
  handler: async (ctx) => {
    assertVerifiedCurrencySeedIntegrity();
    const now = Date.now();
    const countryIds = new Map<string, Id<"countries">>();
    const sourceIds = new Map<string, Id<"sources">>();
    const inserted = { countries: 0, sources: 0, currencies: 0 };
    const existingCounts = { countries: 0, sources: 0, currencies: 0 };

    for (const source of verifiedCurrencySeed.sources) {
      const existing = await ctx.db
        .query("sources")
        .withIndex("by_url", (q) => q.eq("url", source.url))
        .unique();
      if (existing !== null) {
        requireSeedOwnership(existing, "source", source.url);
        sourceIds.set(source.key, existing._id);
        existingCounts.sources += 1;
        continue;
      }
      const id = await ctx.db.insert("sources", {
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        accessedAt: verifiedCurrencySeed.accessedAt,
        sourceType: source.sourceType,
        seedVersion: VERIFIED_CURRENCY_SEED_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      sourceIds.set(source.key, id);
      inserted.sources += 1;
    }

    for (const country of verifiedCurrencySeed.countries) {
      const existing = await ctx.db
        .query("countries")
        .withIndex("by_slug", (q) => q.eq("slug", country.slug))
        .unique();
      if (existing !== null) {
        requireSeedOwnership(existing, "country", country.slug);
        countryIds.set(country.slug, existing._id);
        existingCounts.countries += 1;
        continue;
      }
      const id = await ctx.db.insert("countries", {
        ...country,
        seedVersion: VERIFIED_CURRENCY_SEED_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      countryIds.set(country.slug, id);
      inserted.countries += 1;
    }

    for (const currency of verifiedCurrencySeed.currencies) {
      const existing = await ctx.db
        .query("currencies")
        .withIndex("by_slug", (q) => q.eq("slug", currency.slug))
        .unique();
      if (existing !== null) {
        requireSeedOwnership(existing, "currency", currency.slug);
        existingCounts.currencies += 1;
        continue;
      }
      const countryId = countryIds.get(currency.countrySlug);
      if (countryId === undefined) throw new ConvexError(`Missing seed country ${currency.countrySlug}.`);
      const resolvedSourceIds = currency.sourceKeys.map((key) => sourceIds.get(key));
      if (resolvedSourceIds.some((id) => id === undefined)) {
        throw new ConvexError(`Missing seed source for ${currency.slug}.`);
      }
      await ctx.db.insert("currencies", {
        name: currency.name,
        slug: currency.slug,
        countryId,
        ...( "symbol" in currency ? { symbol: currency.symbol } : {}),
        currencyType: currency.currencyType,
        status: currency.status,
        startDate: currency.startDate,
        endDate: currency.endDate,
        replacementCurrencyName: currency.replacementCurrencyName,
        primaryFailureCause: currency.primaryFailureCause,
        failureCauses: [...currency.failureCauses],
        summary: currency.summary,
        historicalContext: currency.historicalContext,
        sourceIds: resolvedSourceIds as Id<"sources">[],
        recordState: "verified",
        seedVersion: VERIFIED_CURRENCY_SEED_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      inserted.currencies += 1;
    }

    return { version: VERIFIED_CURRENCY_SEED_VERSION, inserted, existing: existingCounts };
  },
});

export const remove = internalMutation({
  args: { version: seedVersionValidator },
  returns: v.object({
    version: seedVersionValidator,
    removed: v.object({ countries: v.number(), sources: v.number(), currencies: v.number() }),
  }),
  handler: async (ctx) => {
    const [currencies, sources, countries] = await Promise.all([
      ctx.db
        .query("currencies")
        .withIndex("by_seed_version", (q) => q.eq("seedVersion", VERIFIED_CURRENCY_SEED_VERSION))
        .take(verifiedCurrencySeed.currencies.length + 1),
      ctx.db
        .query("sources")
        .withIndex("by_seed_version", (q) => q.eq("seedVersion", VERIFIED_CURRENCY_SEED_VERSION))
        .take(verifiedCurrencySeed.sources.length + 1),
      ctx.db
        .query("countries")
        .withIndex("by_seed_version", (q) => q.eq("seedVersion", VERIFIED_CURRENCY_SEED_VERSION))
        .take(verifiedCurrencySeed.countries.length + 1),
    ]);
    if (
      currencies.length > verifiedCurrencySeed.currencies.length ||
      sources.length > verifiedCurrencySeed.sources.length ||
      countries.length > verifiedCurrencySeed.countries.length
    ) {
      throw new ConvexError("Seed namespace contains unexpected records; removal aborted.");
    }
    const [allCurrencies, allSources, allCountries, event, currencyMetric, dollarMetric, methodology, subscriber] =
      await Promise.all([
        ctx.db.query("currencies").take(verifiedCurrencySeed.currencies.length + 1),
        ctx.db.query("sources").take(verifiedCurrencySeed.sources.length + 1),
        ctx.db.query("countries").take(verifiedCurrencySeed.countries.length + 1),
        ctx.db.query("currencyEvents").first(),
        ctx.db.query("currencyMetrics").first(),
        ctx.db.query("dollarMetrics").first(),
        ctx.db.query("methodologies").first(),
        ctx.db.query("emailSubscribers").first(),
      ]);
    const containsOnlySeedGraph =
      allCurrencies.length === currencies.length &&
      allSources.length === sources.length &&
      allCountries.length === countries.length &&
      allCurrencies.every((record) => record.seedVersion === VERIFIED_CURRENCY_SEED_VERSION) &&
      allSources.every((record) => record.seedVersion === VERIFIED_CURRENCY_SEED_VERSION) &&
      allCountries.every((record) => record.seedVersion === VERIFIED_CURRENCY_SEED_VERSION) &&
      event === null &&
      currencyMetric === null &&
      dollarMetric === null &&
      methodology === null &&
      subscriber === null;
    if (!containsOnlySeedGraph) {
      throw new ConvexError(
        "Seed removal is allowed only when the database contains the isolated seed graph; no records were removed.",
      );
    }
    for (const currency of currencies) await ctx.db.delete(currency._id);
    for (const source of sources) await ctx.db.delete(source._id);
    for (const country of countries) await ctx.db.delete(country._id);
    return {
      version: VERIFIED_CURRENCY_SEED_VERSION,
      removed: {
        countries: countries.length,
        sources: sources.length,
        currencies: currencies.length,
      },
    };
  },
});
