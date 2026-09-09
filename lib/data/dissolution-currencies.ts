import type { VerifiedCurrencyDataset } from "./verified-currency-seed";

export function buildDissolutionCurrencies(dataset: VerifiedCurrencyDataset) {
  return dataset.currencies.map((currency) => ({
    slug: currency.slug,
    name: currency.name,
    country: dataset.countries.find((country) => country.slug === currency.countrySlug)?.name ?? currency.countrySlug,
    period: `${currency.startDate.year}–${currency.endDate.year}`,
    summary: currency.summary,
    replacement: currency.replacementCurrencyName,
    isCurrencyUnion: currency.primaryFailureCause === "currency_union",
  }));
}

export type DissolutionCurrency = ReturnType<typeof buildDissolutionCurrencies>[number];
