import {
  archiveEras,
  archiveFilterOptions,
  currencyArchiveRecords,
  type ArchiveFilterOptions,
  type ArchiveSearchParams,
  type CurrencyArchiveRecord,
} from "./currency-archive";
import type { CurrencyLifespanRange } from "./currency-lifespan";

const lifespanBands = [
  { key: "under_10", label: "Under 10 years", minimum: 0, maximum: 9 },
  { key: "10_29", label: "10–29 years", minimum: 10, maximum: 29 },
  { key: "30_99", label: "30–99 years", minimum: 30, maximum: 99 },
  { key: "100_plus", label: "100+ years", minimum: 100, maximum: Infinity },
] as const;

type LifespanEra = (typeof archiveEras)[number]["value"];

export type LifespanQuery = Readonly<{
  region: string;
  cause: string;
  era: LifespanEra | "";
}>;

export type LifespanResearchRecord = Readonly<{
  slug: string;
  name: string;
  region: string;
  primaryFailureCause: string;
  failureCauses: readonly string[];
  era: LifespanEra;
  endYear: number;
  lifespan: CurrencyLifespanRange;
}>;

function scalar(value: string | readonly string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function allowedValue<T extends string>(value: string, allowed: readonly T[]) {
  return allowed.includes(value as T) ? (value as T) : "";
}

function roundOne(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

const eraValues = archiveEras.map((era) => era.value);

export type LifespanFilterOptions = Readonly<{
  regions: readonly Readonly<{ value: string; label: string }>[];
  causes: readonly Readonly<{ value: string; label: string }>[];
  eras: typeof archiveEras;
}>;

export function createLifespanFilterOptions(
  options: ArchiveFilterOptions,
): LifespanFilterOptions {
  return {
    regions: options.regions.map((value) => ({
      value,
      label: displayLabel(value),
    })),
    causes: options.causes.map((value) => ({
      value,
      label: displayLabel(value),
    })),
    eras: archiveEras,
  };
}

export const lifespanFilterOptions = createLifespanFilterOptions(archiveFilterOptions);

export function parseLifespanQuery(
  params: ArchiveSearchParams,
  options: LifespanFilterOptions = lifespanFilterOptions,
): LifespanQuery {
  const regions = options.regions.map((option) => option.value);
  const causes = options.causes.map((option) => option.value);
  return {
    region: allowedValue(scalar(params.region), regions),
    cause: allowedValue(scalar(params.cause), causes),
    era: allowedValue(scalar(params.era), eraValues),
  };
}

export function createLifespanResearchRecords(
  records: readonly CurrencyArchiveRecord[],
): readonly LifespanResearchRecord[] {
  return records.map((record) => ({
    slug: record.slug,
    name: record.name,
    region: record.region,
    primaryFailureCause: record.primaryFailureCause,
    failureCauses: record.failureCauses,
    era: record.era,
    endYear: record.endDate.year,
    lifespan: record.lifespan,
  }));
}

export const lifespanResearchRecords = createLifespanResearchRecords(currencyArchiveRecords);

export function filterLifespanRecords(
  query: LifespanQuery,
  records: readonly LifespanResearchRecord[] = lifespanResearchRecords,
) {
  return records.filter((record) => {
    if (query.region !== "" && record.region !== query.region) return false;
    if (
      query.cause !== "" &&
      record.primaryFailureCause !== query.cause &&
      !(record.failureCauses as readonly string[]).includes(query.cause)
    ) {
      return false;
    }
    if (query.era !== "" && record.era !== query.era) return false;
    return true;
  });
}

function breakdown(
  records: readonly LifespanResearchRecord[],
  keyFor: (record: LifespanResearchRecord) => string,
) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = keyFor(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, count]) => ({ key, label: displayLabel(key), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function centuryLabel(year: number) {
  const century = Math.floor((year - 1) / 100) + 1;
  const remainder = century % 100;
  const suffix =
    remainder >= 11 && remainder <= 13
      ? "th"
      : century % 10 === 1
        ? "st"
        : century % 10 === 2
          ? "nd"
          : century % 10 === 3
            ? "rd"
            : "th";
  return `${century}${suffix} century`;
}

export function buildLifespanResearch(records: readonly LifespanResearchRecord[]) {
  if (records.length === 0) {
    return {
      count: 0,
      average: null,
      median: null,
      span: null,
      distribution: lifespanBands.map((band) => ({ ...band, count: 0 })),
      crossBandCount: 0,
      shortest: [],
      longest: [],
      byCentury: [],
      byCause: [],
      byRegion: [],
    } as const;
  }

  const minimums = records.map((record) => record.lifespan.minimumYears);
  const maximums = records.map((record) => record.lifespan.maximumYears);
  const distribution = lifespanBands.map((band) => ({
    ...band,
    count: records.filter(
      (record) =>
        record.lifespan.minimumYears >= band.minimum &&
        record.lifespan.maximumYears <= band.maximum,
    ).length,
  }));
  const classifiedCount = distribution.reduce((sum, band) => sum + band.count, 0);
  const ascending = [...records].sort(
    (left, right) =>
      left.lifespan.maximumYears - right.lifespan.maximumYears ||
      left.lifespan.minimumYears - right.lifespan.minimumYears,
  );
  const descending = [...records].sort(
    (left, right) =>
      right.lifespan.minimumYears - left.lifespan.minimumYears ||
      right.lifespan.maximumYears - left.lifespan.maximumYears,
  );

  return {
    count: records.length,
    average: {
      minimumYears: roundOne(mean(minimums)),
      maximumYears: roundOne(mean(maximums)),
    },
    median: {
      minimumYears: roundOne(median(minimums)),
      maximumYears: roundOne(median(maximums)),
    },
    span: {
      minimumYears: Math.min(...minimums),
      maximumYears: Math.max(...maximums),
    },
    distribution,
    crossBandCount: records.length - classifiedCount,
    shortest: ascending.slice(0, Math.min(3, records.length)),
    longest: descending.slice(0, Math.min(3, records.length)),
    byCentury: breakdown(records, (record) => centuryLabel(record.endYear)),
    byCause: breakdown(records, (record) => record.primaryFailureCause),
    byRegion: breakdown(records, (record) => record.region),
  } as const;
}

export function activeLifespanFilterCount(query: LifespanQuery) {
  return Object.values(query).filter(Boolean).length;
}
