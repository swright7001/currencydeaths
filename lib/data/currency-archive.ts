import { currencyLifespanRange } from "./currency-lifespan";
import {
  verifiedCurrencySeed,
  type VerifiedCurrencyDataset,
  type VerifiedSeedCurrency,
} from "./verified-currency-seed";

export const archiveEras = [
  { value: "before_1900", label: "Before 1900" },
  { value: "1900_1945", label: "1900–1945" },
  { value: "1946_1999", label: "1946–1999" },
  { value: "2000_present", label: "2000–present" },
] as const;

export const archiveLifespanBands = [
  { value: "under_10", label: "Under 10 years" },
  { value: "10_29", label: "10–29 years" },
  { value: "30_99", label: "30–99 years" },
  { value: "100_plus", label: "100+ years" },
] as const;

type Era = (typeof archiveEras)[number]["value"];
type LifespanBand = (typeof archiveLifespanBands)[number]["value"];

export type ArchiveQuery = Readonly<{
  search: string;
  country: string;
  region: string;
  era: Era | "";
  cause: string;
  currencyType: string;
  status: string;
  lifespan: LifespanBand | "";
}>;

export type ArchiveSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

function firstValue(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function allowedValue<T extends string>(value: string, allowed: readonly T[]) {
  return allowed.includes(value as T) ? (value as T) : "";
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export type ArchiveFilterOptions = Readonly<{
  countries: readonly Readonly<{ value: string; label: string }>[];
  regions: readonly string[];
  causes: readonly string[];
  currencyTypes: readonly string[];
  statuses: readonly string[];
}>;

export function createArchiveFilterOptions(
  dataset: VerifiedCurrencyDataset,
): ArchiveFilterOptions {
  return {
    countries: [...dataset.countries]
      .map(({ slug, name }) => ({ value: slug, label: name }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    regions: uniqueSorted(dataset.countries.map((country) => country.region)),
    causes: uniqueSorted(
      dataset.currencies.flatMap((currency) => currency.failureCauses),
    ),
    currencyTypes: uniqueSorted(
      dataset.currencies.map((currency) => currency.currencyType),
    ),
    statuses: uniqueSorted(dataset.currencies.map((currency) => currency.status)),
  };
}

export const archiveFilterOptions = createArchiveFilterOptions(verifiedCurrencySeed);

const eraValues = archiveEras.map((era) => era.value);
const lifespanValues = archiveLifespanBands.map((band) => band.value);

export function parseArchiveQuery(
  params: ArchiveSearchParams,
  options: ArchiveFilterOptions = archiveFilterOptions,
): ArchiveQuery {
  return {
    search: firstValue(params.q).trim().slice(0, 80),
    country: allowedValue(
      firstValue(params.country),
      options.countries.map((country) => country.value),
    ),
    region: allowedValue(firstValue(params.region), options.regions),
    era: allowedValue(firstValue(params.era), eraValues),
    cause: allowedValue(firstValue(params.cause), options.causes),
    currencyType: allowedValue(
      firstValue(params.type),
      options.currencyTypes,
    ),
    status: allowedValue(firstValue(params.status), options.statuses),
    lifespan: allowedValue(firstValue(params.lifespan), lifespanValues),
  };
}

function transitionEra(endYear: number): Era {
  if (endYear < 1900) return "before_1900";
  if (endYear <= 1945) return "1900_1945";
  if (endYear <= 1999) return "1946_1999";
  return "2000_present";
}

function lifespanBand(minimum: number, maximum: number): LifespanBand | null {
  const classify = (years: number): LifespanBand => {
    if (years < 10) return "under_10";
    if (years < 30) return "10_29";
    if (years < 100) return "30_99";
    return "100_plus";
  };

  const minimumBand = classify(minimum);
  return minimumBand === classify(maximum) ? minimumBand : null;
}

function searchable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase();
}

export type CurrencyArchiveRecord = VerifiedSeedCurrency & Readonly<{
  countryName: string;
  region: string;
  era: Era;
  lifespan: NonNullable<ReturnType<typeof currencyLifespanRange>>;
  lifespanBand: LifespanBand | null;
  searchText: string;
}>;

export function createCurrencyArchiveRecords(
  dataset: VerifiedCurrencyDataset,
): readonly CurrencyArchiveRecord[] {
  const countriesBySlug = new Map(
    dataset.countries.map((country) => [country.slug, country]),
  );
  return dataset.currencies.map((currency) => {
    const country = countriesBySlug.get(currency.countrySlug);
    if (country === undefined) {
      throw new Error(`Unknown archive country: ${currency.countrySlug}`);
    }

    const lifespan = currencyLifespanRange({
      startDate: currency.startDate,
      endDate: currency.endDate,
      status: currency.status,
    });
    if (lifespan === null) {
      throw new Error(`Missing closed lifespan: ${currency.slug}`);
    }

    return {
      ...currency,
      countryName: country.name,
      region: country.region,
      era: transitionEra(currency.endDate.year),
      lifespan,
      lifespanBand: lifespanBand(lifespan.minimumYears, lifespan.maximumYears),
      searchText: searchable(
        [
          currency.name,
          country.name,
          currency.summary,
          currency.historicalContext,
          currency.replacementCurrencyName,
          ...currency.failureCauses,
        ].join(" "),
      ),
    };
  });
}

export const currencyArchiveRecords = createCurrencyArchiveRecords(verifiedCurrencySeed);

export function filterCurrencyArchive(
  query: ArchiveQuery,
  records: readonly CurrencyArchiveRecord[] = currencyArchiveRecords,
) {
  const search = searchable(query.search);

  return records.filter((record) => {
    if (search !== "" && !record.searchText.includes(search)) return false;
    if (query.country !== "" && record.countrySlug !== query.country) return false;
    if (query.region !== "" && record.region !== query.region) return false;
    if (query.era !== "" && record.era !== query.era) return false;
    if (
      query.cause !== "" &&
      !(record.failureCauses as readonly string[]).includes(query.cause)
    ) {
      return false;
    }
    if (query.currencyType !== "" && record.currencyType !== query.currencyType) {
      return false;
    }
    if (query.status !== "" && record.status !== query.status) return false;
    if (query.lifespan !== "" && record.lifespanBand !== query.lifespan) return false;
    return true;
  });
}

export function activeArchiveFilterCount(query: ArchiveQuery) {
  return Object.values(query).filter((value) => value !== "").length;
}

export function displayArchiveLabel(value: string) {
  return value.replaceAll("_", " ");
}
