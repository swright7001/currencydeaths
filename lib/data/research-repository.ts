import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { getOptionalConvexUrl } from "../env/convex";
import {
  VERIFIED_CURRENCY_SEED_VERSION,
  verifiedCurrencySeed,
  type VerifiedCurrencyDataset,
  type VerifiedSeedCountry,
  type VerifiedSeedCurrency,
  type VerifiedSeedSource,
} from "./verified-currency-seed";

export type ResearchDeliverySource = "repository" | "convex";

export type LoadedResearchDataset = Readonly<{
  source: ResearchDeliverySource;
  sourceLabel: string;
  dataset: VerifiedCurrencyDataset;
}>;

export class ResearchDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchDataError";
  }
}

type ResearchFetcher = Readonly<{
  list: (url: string) => Promise<unknown>;
  bySlug: (url: string, slug: string) => Promise<unknown>;
}>;

type LoadOptions = Readonly<{
  convexUrl?: string;
  fetcher?: ResearchFetcher;
}>;

const defaultFetcher: ResearchFetcher = {
  list: (url) =>
    fetchQuery(
      api.research.listVerifiedCurrencySeed,
      { version: VERIFIED_CURRENCY_SEED_VERSION },
      { url },
    ),
  bySlug: (url, slug) =>
    fetchQuery(
      api.research.getVerifiedCurrencySeedBySlug,
      { version: VERIFIED_CURRENCY_SEED_VERSION, slug },
      { url },
    ),
};

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ResearchDataError(`Configured research data has an invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ResearchDataError(`Configured research data has an invalid ${label}.`);
  }
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ResearchDataError(`Configured research data has an invalid ${label}.`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ResearchDataError(`Configured research data has an invalid ${label}.`);
  }
  return value;
}

function requireEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new ResearchDataError(`Configured research data does not match ${label}.`);
  }
}

const expectedCurrencies = new Map<string, VerifiedSeedCurrency>(
  verifiedCurrencySeed.currencies.map((currency) => [currency.slug, currency]),
);
const expectedCountries = new Map<string, VerifiedSeedCountry>(
  verifiedCurrencySeed.countries.map((country) => [country.slug, country]),
);
const expectedSources = new Map<string, VerifiedSeedSource>(
  verifiedCurrencySeed.sources.map((source) => [source.url, source]),
);

function parseSource(value: unknown): VerifiedSeedSource {
  const source = objectValue(value, "source record");
  const url = stringValue(source.url, "source URL");
  const expected = expectedSources.get(url);
  if (expected === undefined) {
    throw new ResearchDataError("Configured research data references an unapproved source.");
  }
  requireEqual(source.title, expected.title, `source title for ${url}`);
  requireEqual(source.publisher, expected.publisher, `source publisher for ${url}`);
  requireEqual(source.sourceType, expected.sourceType, `source type for ${url}`);
  requireEqual(source.publicationDate, null, `source publication precision for ${url}`);
  requireEqual(
    finiteNumber(source.accessedAt, `source access date for ${url}`),
    verifiedCurrencySeed.accessedAt,
    `source access date for ${url}`,
  );
  return expected;
}

function parseCountry(value: unknown): VerifiedSeedCountry {
  const country = objectValue(value, "country record");
  const slug = stringValue(country.slug, "country slug");
  const expected = expectedCountries.get(slug);
  if (expected === undefined) {
    throw new ResearchDataError("Configured research data references an unapproved country.");
  }
  requireEqual(country.name, expected.name, `country name for ${slug}`);
  requireEqual(country.isoCode, expected.isoCode, `country code for ${slug}`);
  requireEqual(country.region, expected.region, `country region for ${slug}`);
  return expected;
}

function parseCurrencyRecord(value: unknown): {
  currency: VerifiedSeedCurrency;
  country: VerifiedSeedCountry;
  sources: readonly VerifiedSeedSource[];
} {
  const record = objectValue(value, "currency record");
  const currency = objectValue(record.currency, "currency payload");
  const slug = stringValue(currency.slug, "currency slug");
  const expected = expectedCurrencies.get(slug);
  if (expected === undefined) {
    throw new ResearchDataError("Configured research data contains an unapproved currency.");
  }
  const country = parseCountry(record.country);
  requireEqual(country.slug, expected.countrySlug, `country relationship for ${slug}`);

  requireEqual(currency.name, expected.name, `currency name for ${slug}`);
  requireEqual(currency.symbol, expected.symbol ?? null, `currency symbol for ${slug}`);
  requireEqual(currency.currencyType, expected.currencyType, `currency type for ${slug}`);
  requireEqual(currency.status, expected.status, `currency status for ${slug}`);
  requireEqual(currency.startDate, expected.startDate, `start date for ${slug}`);
  requireEqual(currency.endDate, expected.endDate, `end date for ${slug}`);
  requireEqual(
    currency.replacementCurrencyName,
    expected.replacementCurrencyName,
    `replacement for ${slug}`,
  );
  requireEqual(
    currency.primaryFailureCause,
    expected.primaryFailureCause,
    `primary failure cause for ${slug}`,
  );
  requireEqual(currency.failureCauses, expected.failureCauses, `failure causes for ${slug}`);
  requireEqual(currency.summary, expected.summary, `summary for ${slug}`);
  requireEqual(
    currency.historicalContext,
    expected.historicalContext,
    `historical context for ${slug}`,
  );
  requireEqual(currency.recordState, "verified", `record state for ${slug}`);

  const sources = arrayValue(record.sources, `sources for ${slug}`).map(parseSource);
  const sourceUrls = sources.map((source) => source.url);
  if (new Set(sourceUrls).size !== sourceUrls.length) {
    throw new ResearchDataError(`Configured research data duplicates a source for ${slug}.`);
  }
  const expectedUrls = expected.sourceKeys.map((key) => {
    const source = verifiedCurrencySeed.sources.find((candidate) => candidate.key === key);
    if (source === undefined) throw new ResearchDataError(`Repository source ${key} is missing.`);
    return source.url;
  });
  requireEqual([...sourceUrls].sort(), [...expectedUrls].sort(), `source relationships for ${slug}`);

  return { currency: expected, country, sources };
}

function datasetFromRecords(
  values: readonly unknown[],
  requireCompleteSeed: boolean,
): VerifiedCurrencyDataset {
  if (values.length === 0) {
    throw new ResearchDataError("Configured research data returned an empty verified seed.");
  }
  const parsed = values.map(parseCurrencyRecord);
  const slugs = parsed.map((record) => record.currency.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new ResearchDataError("Configured research data contains duplicate currency slugs.");
  }
  if (requireCompleteSeed) {
    requireEqual(
      [...slugs].sort(),
      verifiedCurrencySeed.currencies.map((currency) => currency.slug).sort(),
      "the complete verified currency seed",
    );
  }

  const includedSlugs = new Set(slugs);
  const includedCountrySlugs = new Set(parsed.map((record) => record.country.slug));
  const includedSourceUrls = new Set(
    parsed.flatMap((record) => record.sources.map((source) => source.url)),
  );
  return {
    version: VERIFIED_CURRENCY_SEED_VERSION,
    accessedAt: verifiedCurrencySeed.accessedAt,
    countries: verifiedCurrencySeed.countries.filter((country) =>
      includedCountrySlugs.has(country.slug),
    ),
    sources: verifiedCurrencySeed.sources.filter((source) => includedSourceUrls.has(source.url)),
    currencies: verifiedCurrencySeed.currencies.filter((currency) =>
      includedSlugs.has(currency.slug),
    ),
  };
}

export function parseConvexResearchCollection(value: unknown): VerifiedCurrencyDataset {
  const result = objectValue(value, "collection response");
  requireEqual(result.version, VERIFIED_CURRENCY_SEED_VERSION, "the verified seed version");
  return datasetFromRecords(arrayValue(result.records, "collection records"), true);
}

export function parseConvexResearchCurrency(value: unknown): VerifiedCurrencyDataset | null {
  if (value === null) return null;
  return datasetFromRecords([value], false);
}

function configuredUrl(options: LoadOptions) {
  return getOptionalConvexUrl(options.convexUrl ?? process.env.NEXT_PUBLIC_CONVEX_URL);
}

export async function loadResearchCollection(
  options: LoadOptions = {},
): Promise<LoadedResearchDataset> {
  const url = configuredUrl(options);
  if (url === null) {
    return {
      source: "repository",
      sourceLabel: "Repository-backed verified seed",
      dataset: verifiedCurrencySeed,
    };
  }
  try {
    const response = await (options.fetcher ?? defaultFetcher).list(url);
    return {
      source: "convex",
      sourceLabel: "Convex-backed verified seed",
      dataset: parseConvexResearchCollection(response),
    };
  } catch (error) {
    if (error instanceof ResearchDataError) throw error;
    throw new ResearchDataError(
      "The configured research source could not be loaded; no repository fallback was used.",
      { cause: error },
    );
  }
}

export async function loadResearchCurrency(
  slug: string,
  options: LoadOptions = {},
): Promise<LoadedResearchDataset | null> {
  const url = configuredUrl(options);
  if (url === null) {
    const currency = verifiedCurrencySeed.currencies.find((candidate) => candidate.slug === slug);
    if (currency === undefined) return null;
    const country = verifiedCurrencySeed.countries.find(
      (candidate) => candidate.slug === currency.countrySlug,
    );
    if (country === undefined) throw new ResearchDataError("Repository country relationship is missing.");
    const sourceKeys = new Set(currency.sourceKeys);
    return {
      source: "repository",
      sourceLabel: "Repository-backed verified seed",
      dataset: {
        version: verifiedCurrencySeed.version,
        accessedAt: verifiedCurrencySeed.accessedAt,
        countries: [country],
        sources: verifiedCurrencySeed.sources.filter((source) => sourceKeys.has(source.key)),
        currencies: [currency],
      },
    };
  }
  try {
    const response = await (options.fetcher ?? defaultFetcher).bySlug(url, slug);
    const dataset = parseConvexResearchCurrency(response);
    if (dataset === null) {
      if (expectedCurrencies.has(slug)) {
        throw new ResearchDataError(
          "Configured research data is missing a required verified currency.",
        );
      }
      return null;
    }
    if (dataset.currencies[0]?.slug !== slug) {
      throw new ResearchDataError(
        "Configured research data returned a currency that does not match the requested slug.",
      );
    }
    return { source: "convex", sourceLabel: "Convex-backed verified seed", dataset };
  } catch (error) {
    if (error instanceof ResearchDataError) throw error;
    throw new ResearchDataError(
      "The configured research source could not be loaded; no repository fallback was used.",
      { cause: error },
    );
  }
}
