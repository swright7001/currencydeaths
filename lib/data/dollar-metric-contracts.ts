import { historicalDateToKey, type HistoricalDate } from "./historical-date";

export const dollarMetricKeys = ["m2", "cpi", "federal_debt_to_gdp"] as const;
export type DollarMetricKey = (typeof dollarMetricKeys)[number];

export const dollarMetricFrequencies = ["monthly", "quarterly"] as const;
export type DollarMetricFrequency = (typeof dollarMetricFrequencies)[number];

export const dollarMetricUnits = [
  "billions_usd_seasonally_adjusted",
  "index_1982_1984_100_seasonally_adjusted",
  "percent_gdp_seasonally_adjusted",
] as const;
export type DollarMetricUnit = (typeof dollarMetricUnits)[number];

export const dollarMetricDefinitions = {
  m2: {
    frequency: "monthly",
    unit: "billions_usd_seasonally_adjusted",
    sourceSeriesId: "M2SL",
    freshnessWindowDays: 45,
  },
  cpi: {
    frequency: "monthly",
    unit: "index_1982_1984_100_seasonally_adjusted",
    sourceSeriesId: "CPIAUCSL",
    freshnessWindowDays: 45,
  },
  federal_debt_to_gdp: {
    frequency: "quarterly",
    unit: "percent_gdp_seasonally_adjusted",
    sourceSeriesId: "GFDEGDQ188S",
    freshnessWindowDays: 120,
  },
} as const satisfies Record<
  DollarMetricKey,
  Readonly<{
    frequency: DollarMetricFrequency;
    unit: DollarMetricUnit;
    sourceSeriesId: string;
    freshnessWindowDays: number;
  }>
>;

export type DollarMetricObservationInput = Readonly<{
  metric: DollarMetricKey;
  observationDate: HistoricalDate;
  value: number;
  unit: DollarMetricUnit;
  frequency: DollarMetricFrequency;
  sourceSeriesId: string;
  sourceUpdatedAt: number;
}>;

export function validateDollarMetricObservation(
  observation: DollarMetricObservationInput,
) {
  const definition = dollarMetricDefinitions[observation.metric];
  historicalDateToKey(observation.observationDate);

  if (!Number.isFinite(observation.value)) {
    throw new Error("Dollar metric value must be a finite number.");
  }
  if (observation.unit !== definition.unit) {
    throw new Error(`Metric ${observation.metric} requires unit ${definition.unit}.`);
  }
  if (observation.frequency !== definition.frequency) {
    throw new Error(
      `Metric ${observation.metric} requires frequency ${definition.frequency}.`,
    );
  }
  if (observation.sourceSeriesId !== definition.sourceSeriesId) {
    throw new Error(
      `Metric ${observation.metric} requires source series ${definition.sourceSeriesId}.`,
    );
  }
  if (observation.observationDate.precision !== "month") {
    throw new Error("Initial dollar metric contracts require month-precision observations.");
  }
  if (!Number.isFinite(observation.sourceUpdatedAt) || observation.sourceUpdatedAt <= 0) {
    throw new Error("Dollar metric source update time must be a positive timestamp.");
  }
}

function monthOrdinal(date: HistoricalDate) {
  if (date.precision !== "month" || date.month === undefined) {
    throw new Error("Gap analysis requires month-precision observations.");
  }
  return date.year * 12 + date.month - 1;
}

export type DollarMetricGap = Readonly<{
  afterDate: HistoricalDate;
  beforeDate: HistoricalDate;
  missingPeriods: number;
}>;

export function findDollarMetricGaps(
  observations: readonly Pick<DollarMetricObservationInput, "observationDate">[],
  frequency: DollarMetricFrequency,
) {
  const stepMonths = frequency === "monthly" ? 1 : 3;
  const ascending = [...observations].sort(
    (a, b) => historicalDateToKey(a.observationDate) - historicalDateToKey(b.observationDate),
  );
  const gaps: DollarMetricGap[] = [];

  for (let index = 1; index < ascending.length; index += 1) {
    const previous = ascending[index - 1].observationDate;
    const current = ascending[index].observationDate;
    const distance = monthOrdinal(current) - monthOrdinal(previous);
    if (distance > stepMonths) {
      gaps.push({
        afterDate: previous,
        beforeDate: current,
        missingPeriods: Math.floor(distance / stepMonths) - 1,
      });
    }
  }
  return gaps;
}

export function calculateDollarMetricFreshness(
  metric: DollarMetricKey,
  sourceUpdatedAt: number,
  asOf: number,
) {
  if (!Number.isFinite(asOf) || asOf < sourceUpdatedAt) {
    throw new Error("Freshness as-of time must be at or after the source update time.");
  }
  const elapsedMs = asOf - sourceUpdatedAt;
  const ageDays = Math.floor(elapsedMs / 86_400_000);
  const thresholdDays = dollarMetricDefinitions[metric].freshnessWindowDays;
  return {
    asOf,
    sourceUpdatedAt,
    ageDays,
    thresholdDays,
    state:
      elapsedMs <= thresholdDays * 86_400_000
        ? ("current" as const)
        : ("stale" as const),
  };
}

export function calculateDollarMetricObservationAgeMs(
  metric: DollarMetricKey,
  observationDate: HistoricalDate,
  asOf: number,
) {
  if (
    observationDate.precision !== "month" ||
    observationDate.month === undefined ||
    !Number.isFinite(asOf)
  ) {
    throw new Error("Observation freshness requires a month-precision date and finite as-of time.");
  }
  const frequency = dollarMetricDefinitions[metric].frequency;
  if (frequency === "quarterly" && ![1, 4, 7, 10].includes(observationDate.month)) {
    throw new Error("Quarterly freshness requires a calendar-quarter start month.");
  }
  const endingMonth = frequency === "quarterly" ? observationDate.month + 2 : observationDate.month;
  const periodEndedAt = Date.UTC(observationDate.year, endingMonth, 0, 23, 59, 59, 999);
  if (asOf < periodEndedAt) {
    throw new Error("Freshness as-of time must be at or after the observation period.");
  }
  return asOf - periodEndedAt;
}

export function calculateDollarMetricObservationAgeDays(
  metric: DollarMetricKey,
  observationDate: HistoricalDate,
  asOf: number,
) {
  return Math.floor(
    calculateDollarMetricObservationAgeMs(metric, observationDate, asOf) / 86_400_000,
  );
}
