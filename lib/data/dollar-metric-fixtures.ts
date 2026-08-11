import {
  dollarMetricDefinitions,
  validateDollarMetricObservation,
  type DollarMetricFrequency,
  type DollarMetricKey,
  type DollarMetricUnit,
} from "./dollar-metric-contracts";
import type { HistoricalDate } from "./historical-date";

export const DOLLAR_METRIC_FIXTURE_VERSION = "usd-metrics-development-v1" as const;
export const DOLLAR_METRIC_FIXTURE_ACCESSED_AT = Date.UTC(2026, 7, 11);

export type DollarMetricFixtureSource = Readonly<{
  key: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: "central_bank";
  sourceSeriesId: string;
  sourceUpdatedAt: number;
}>;

export type DollarMetricFixtureObservation = Readonly<{
  metric: DollarMetricKey;
  observationDate: HistoricalDate;
  value: number;
  unit: DollarMetricUnit;
  frequency: DollarMetricFrequency;
  sourceKey: string;
  sourceSeriesId: string;
  sourceUpdatedAt: number;
  notes: string;
}>;

const sources = [
  {
    key: "fred-m2sl",
    title: "M2 (M2SL)",
    publisher: "Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/series/M2SL",
    sourceType: "central_bank",
    sourceSeriesId: "M2SL",
    sourceUpdatedAt: Date.UTC(2026, 6, 28, 17, 1),
  },
  {
    key: "fred-cpiaucsl",
    title: "Consumer Price Index for All Urban Consumers: All Items in U.S. City Average",
    publisher: "Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/series/CPIAUCSL",
    sourceType: "central_bank",
    sourceSeriesId: "CPIAUCSL",
    sourceUpdatedAt: Date.UTC(2026, 6, 14, 13, 10),
  },
  {
    key: "fred-gfdegdq188s",
    title: "Federal Debt: Total Public Debt as Percent of Gross Domestic Product",
    publisher: "Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/series/GFDEGDQ188S",
    sourceType: "central_bank",
    sourceSeriesId: "GFDEGDQ188S",
    sourceUpdatedAt: Date.UTC(2026, 5, 25, 13, 1),
  },
] as const satisfies readonly DollarMetricFixtureSource[];

function monthly(
  metric: "m2" | "cpi",
  sourceKey: string,
  sourceUpdatedAt: number,
  values: readonly Readonly<{ year: number; month: number; value: number }>[],
) {
  const definition = dollarMetricDefinitions[metric];
  return values.map(
    ({ year, month, value }): DollarMetricFixtureObservation => ({
      metric,
      observationDate: { year, month, precision: "month" },
      value,
      unit: definition.unit,
      frequency: definition.frequency,
      sourceKey,
      sourceSeriesId: definition.sourceSeriesId,
      sourceUpdatedAt,
      notes:
        "Development fixture copied from the cited FRED series display; values may be revised and are not live.",
    }),
  );
}

const m2Source = sources[0];
const cpiSource = sources[1];
const debtSource = sources[2];

const observations = [
  ...monthly("m2", m2Source.key, m2Source.sourceUpdatedAt, [
    { year: 2026, month: 2, value: 22_620.3 },
    { year: 2026, month: 3, value: 22_676.1 },
    { year: 2026, month: 4, value: 22_799.9 },
    { year: 2026, month: 5, value: 23_055.6 },
    { year: 2026, month: 6, value: 23_155.2 },
  ]),
  ...monthly("cpi", cpiSource.key, cpiSource.sourceUpdatedAt, [
    { year: 2026, month: 2, value: 327.46 },
    { year: 2026, month: 3, value: 330.293 },
    { year: 2026, month: 4, value: 332.407 },
    { year: 2026, month: 5, value: 333.979 },
    { year: 2026, month: 6, value: 332.568 },
  ]),
  ...[
    { year: 2025, month: 1, value: 120.54515 },
    { year: 2025, month: 4, value: 118.78171 },
    { year: 2025, month: 7, value: 121.02875 },
    { year: 2025, month: 10, value: 122.56815 },
    { year: 2026, month: 1, value: 122.59387 },
  ].map(
    ({ year, month, value }): DollarMetricFixtureObservation => ({
      metric: "federal_debt_to_gdp",
      observationDate: { year, month, precision: "month" },
      value,
      unit: dollarMetricDefinitions.federal_debt_to_gdp.unit,
      frequency: dollarMetricDefinitions.federal_debt_to_gdp.frequency,
      sourceKey: debtSource.key,
      sourceSeriesId: debtSource.sourceSeriesId,
      sourceUpdatedAt: debtSource.sourceUpdatedAt,
      notes:
        "Development fixture copied from the cited FRED series; first month preserves FRED's quarter observation date without inventing a day.",
    }),
  ),
] as const;

export const dollarMetricFixtures = {
  version: DOLLAR_METRIC_FIXTURE_VERSION,
  accessedAt: DOLLAR_METRIC_FIXTURE_ACCESSED_AT,
  sources,
  observations,
} as const;

export function assertDollarMetricFixtureIntegrity() {
  const sourcesByKey = new Map<string, DollarMetricFixtureSource>(
    sources.map((source) => [source.key, source]),
  );
  const uniqueObservations = new Set<string>();

  for (const observation of observations) {
    const source = sourcesByKey.get(observation.sourceKey);
    if (source === undefined) {
      throw new Error(`Unknown dollar metric fixture source: ${observation.sourceKey}.`);
    }
    if (
      source.sourceSeriesId !== observation.sourceSeriesId ||
      source.sourceUpdatedAt !== observation.sourceUpdatedAt
    ) {
      throw new Error(`Dollar metric fixture provenance mismatch for ${observation.metric}.`);
    }
    validateDollarMetricObservation(observation);
    const identity = `${observation.metric}:${observation.observationDate.year}-${observation.observationDate.month}`;
    if (uniqueObservations.has(identity)) {
      throw new Error(`Duplicate dollar metric fixture observation: ${identity}.`);
    }
    uniqueObservations.add(identity);
  }
}
