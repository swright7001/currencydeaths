import { currencyLifespanRange } from "./currency-lifespan";
import type { HistoricalDate } from "./historical-date";
import { absoluteSiteUrl } from "../site-url";
import {
  verifiedCurrencySeed,
  type VerifiedCurrencyDataset,
  type VerifiedSeedCurrency,
  type VerifiedSeedSource,
} from "./verified-currency-seed";
function resolveSources(
  keys: readonly string[],
  sourcesByKey: ReadonlyMap<string, VerifiedSeedSource>,
) {
  return keys.map((key) => {
    const source = sourcesByKey.get(key);
    if (source === undefined) throw new Error(`Unknown detail source: ${key}`);
    return source;
  });
}

export function formatHistoricalDate(date: HistoricalDate) {
  if (date.precision === "year") return String(date.year);

  const value = new Date(0);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(date.year, date.month! - 1, date.day ?? 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: date.precision === "day" ? "numeric" : undefined,
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function historicalDateToIso(date: HistoricalDate) {
  const year = String(date.year).padStart(4, "0");
  if (date.precision === "year") return year;
  const month = String(date.month).padStart(2, "0");
  if (date.precision === "month") return `${year}-${month}`;
  return `${year}-${month}-${String(date.day).padStart(2, "0")}`;
}

export const currencyDetailSlugs = verifiedCurrencySeed.currencies.map(
  (currency) => currency.slug,
);

export function getCurrencyDetailFromDataset(
  dataset: VerifiedCurrencyDataset,
  slug: string,
) {
  const currencies: readonly VerifiedSeedCurrency[] = dataset.currencies;
  const countriesBySlug = new Map(
    dataset.countries.map((country) => [country.slug, country]),
  );
  const sourcesByKey = new Map<string, VerifiedSeedSource>(
    dataset.sources.map((source) => [source.key, source]),
  );
  const currency = currencies.find(
    (candidate) => candidate.slug === slug,
  );
  if (currency === undefined) return undefined;

  const country = countriesBySlug.get(currency.countrySlug);
  if (country === undefined) throw new Error(`Unknown detail country: ${currency.countrySlug}`);

  const lifespan = currencyLifespanRange({
    startDate: currency.startDate,
    endDate: currency.endDate,
    status: currency.status,
  });
  if (lifespan === null) throw new Error(`Missing detail lifespan: ${slug}`);

  const claims = currency.claims.map((claim) => ({
    ...claim,
    sources: resolveSources(claim.sourceKeys, sourcesByKey),
  }));
  const startClaim = claims.find((claim) => claim.field === "startDate");
  const endClaim = claims.find((claim) => claim.field.startsWith("endDate"));
  const causeClaim = claims.find((claim) => claim.field === "primaryFailureCause");
  if (startClaim === undefined || endClaim === undefined || causeClaim === undefined) {
    throw new Error(`Incomplete detail claim ledger: ${slug}`);
  }

  return {
    ...currency,
    countryName: country.name,
    region: country.region,
    sources: resolveSources(currency.sourceKeys, sourcesByKey),
    claims,
    causeClaim,
    lifespan,
    timeline: [
      {
        key: "recorded-start",
        title: "Recorded regime begins",
        date: currency.startDate,
        statement: startClaim.statement,
        ambiguity: startClaim.ambiguity,
        sources: startClaim.sources,
      },
      {
        key: "recorded-transition",
        title: "Recorded transition",
        date: currency.endDate,
        statement: endClaim.statement,
        ambiguity: endClaim.ambiguity,
        sources: endClaim.sources,
      },
    ],
  };
}

export function getCurrencyDetail(slug: string) {
  return getCurrencyDetailFromDataset(verifiedCurrencySeed, slug);
}

export type CurrencyDetail = NonNullable<ReturnType<typeof getCurrencyDetail>>;

export function createCurrencyDetailStructuredData(detail: CurrencyDetail) {
  const url = absoluteSiteUrl(`/deaths/${detail.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${detail.name} monetary history`,
    description: detail.summary,
    url,
    mainEntity: {
      "@type": "Thing",
      name: detail.name,
      identifier: detail.slug,
      description: detail.historicalContext,
      additionalProperty: [
        { "@type": "PropertyValue", name: "Country", value: detail.countryName },
        {
          "@type": "PropertyValue",
          name: "Recorded start",
          value: historicalDateToIso(detail.startDate),
        },
        {
          "@type": "PropertyValue",
          name: "Recorded end",
          value: historicalDateToIso(detail.endDate),
        },
        { "@type": "PropertyValue", name: "Status", value: detail.status },
        {
          "@type": "PropertyValue",
          name: "Primary documented cause",
          value: detail.primaryFailureCause,
        },
        {
          "@type": "PropertyValue",
          name: "Recorded successor",
          value: detail.replacementCurrencyName,
        },
      ],
    },
    citation: detail.sources.map((source) => source.url),
  } as const;
}
