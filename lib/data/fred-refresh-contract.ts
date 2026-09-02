import {
  dollarMetricDefinitions,
  type DollarMetricFrequency,
  type DollarMetricKey,
  type DollarMetricUnit,
} from "./dollar-metric-contracts";

export const FRED_REFRESH_VERSION = "fred-refresh-v1";
export const FRED_REFRESH_METHODOLOGY_VERSION = "usd-stress-v1.0.0";
export const FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES = 120;
export const FRED_REFRESH_MAX_RESPONSE_BYTES = 2_000_000;
export const FRED_REFRESH_TIMEOUT_MS = 15_000;
export const FRED_REFRESH_MAX_ATTEMPTS = 3;
export const FRED_REFRESH_BACKOFF_MS = [0, 1_000, 4_000] as const;

export type FredRefreshObservation = Readonly<{
  date: string;
  value: number | null;
}>;

export type FredRefreshSeries = Readonly<{
  metric: DollarMetricKey;
  sourceSeriesId: string;
  title: string;
  publisher: string;
  url: string;
  unit: DollarMetricUnit;
  frequency: DollarMetricFrequency;
  sourceUpdatedAt: number;
  observations: readonly FredRefreshObservation[];
}>;

type FredSeriesContract = Readonly<{
  metric: DollarMetricKey;
  sourceSeriesId: string;
  title: string;
  publisher: string;
  url: string;
  frequencyLabel: "Monthly" | "Quarterly";
  unitsLabel: "Billions of Dollars" | "Index 1982-1984=100" | "Percent of GDP";
  seasonalAdjustmentLabel: "Seasonally Adjusted";
}>;

export const fredRefreshSeriesContracts = [
  {
    metric: "m2",
    sourceSeriesId: "M2SL",
    title: "M2 (M2SL)",
    publisher: "Board of Governors of the Federal Reserve System (US), via FRED",
    url: "https://fred.stlouisfed.org/series/M2SL",
    frequencyLabel: "Monthly",
    unitsLabel: "Billions of Dollars",
    seasonalAdjustmentLabel: "Seasonally Adjusted",
  },
  {
    metric: "cpi",
    sourceSeriesId: "CPIAUCSL",
    title: "Consumer Price Index for All Urban Consumers: All Items in U.S. City Average",
    publisher: "U.S. Bureau of Labor Statistics, via FRED",
    url: "https://fred.stlouisfed.org/series/CPIAUCSL",
    frequencyLabel: "Monthly",
    unitsLabel: "Index 1982-1984=100",
    seasonalAdjustmentLabel: "Seasonally Adjusted",
  },
  {
    metric: "federal_debt_to_gdp",
    sourceSeriesId: "GFDEGDQ188S",
    title: "Federal Debt: Total Public Debt as Percent of Gross Domestic Product",
    publisher: "U.S. Office of Management and Budget and Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/series/GFDEGDQ188S",
    frequencyLabel: "Quarterly",
    unitsLabel: "Percent of GDP",
    seasonalAdjustmentLabel: "Seasonally Adjusted",
  },
] as const satisfies readonly FredSeriesContract[];

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function parseIsoDate(value: unknown, label: string) {
  const text = stringValue(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00Z`))) {
    throw new Error(`${label} must be an ISO calendar date.`);
  }
  return text;
}

function parseLastUpdated(value: unknown) {
  const text = stringValue(value, "FRED last_updated");
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) throw new Error("FRED last_updated is invalid.");
  return timestamp;
}

export function parseFredSeriesResponses(
  contract: (typeof fredRefreshSeriesContracts)[number],
  metadataPayload: unknown,
  observationsPayload: unknown,
  retrievedAt: number,
): FredRefreshSeries {
  if (!Number.isFinite(retrievedAt) || retrievedAt <= 0) {
    throw new Error("FRED retrieval time must be positive and finite.");
  }
  const metadataRoot = objectValue(metadataPayload, "FRED metadata response");
  if (!Array.isArray(metadataRoot.seriess) || metadataRoot.seriess.length !== 1) {
    throw new Error("FRED metadata response must contain exactly one series.");
  }
  const metadata = objectValue(metadataRoot.seriess[0], "FRED series metadata");
  if (
    metadata.id !== contract.sourceSeriesId ||
    metadata.frequency !== contract.frequencyLabel ||
    metadata.units !== contract.unitsLabel ||
    metadata.seasonal_adjustment !== contract.seasonalAdjustmentLabel
  ) {
    throw new Error(`FRED metadata contract mismatch for ${contract.sourceSeriesId}.`);
  }
  const sourceUpdatedAt = parseLastUpdated(metadata.last_updated);
  if (sourceUpdatedAt > retrievedAt) {
    throw new Error(`FRED source update is after retrieval for ${contract.sourceSeriesId}.`);
  }

  const observationRoot = objectValue(observationsPayload, "FRED observations response");
  if (!Array.isArray(observationRoot.observations)) {
    throw new Error("FRED observations response must contain an observations array.");
  }
  if (
    observationRoot.observations.length < 2 ||
    observationRoot.observations.length > FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES
  ) {
    throw new Error(`FRED observation count is outside the approved bound for ${contract.sourceSeriesId}.`);
  }
  const observations = observationRoot.observations.map((row, index): FredRefreshObservation => {
    const observation = objectValue(row, `FRED observation ${index}`);
    const date = parseIsoDate(observation.date, `FRED observation ${index} date`);
    const rawValue = stringValue(observation.value, `FRED observation ${index} value`);
    if (rawValue === ".") return { date, value: null };
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new Error(`FRED observation ${index} value must be finite or '.'.`);
    }
    return { date, value };
  });
  for (let index = 1; index < observations.length; index += 1) {
    if (observations[index - 1].date >= observations[index].date) {
      throw new Error(`FRED observations must be unique and chronological for ${contract.sourceSeriesId}.`);
    }
  }
  if (observations.at(-1)?.value === null) {
    throw new Error(`Latest FRED observation is missing for ${contract.sourceSeriesId}.`);
  }

  const definition = dollarMetricDefinitions[contract.metric];
  return {
    metric: contract.metric,
    sourceSeriesId: contract.sourceSeriesId,
    title: contract.title,
    publisher: contract.publisher,
    url: contract.url,
    unit: definition.unit,
    frequency: definition.frequency,
    sourceUpdatedAt,
    observations,
  };
}

export function canonicalizeFredRefresh(series: readonly FredRefreshSeries[]) {
  if (series.length !== fredRefreshSeriesContracts.length) {
    throw new Error("FRED refresh requires the exact approved series set.");
  }
  return JSON.stringify({
    version: FRED_REFRESH_VERSION,
    methodologyVersion: FRED_REFRESH_METHODOLOGY_VERSION,
    series: [...series].sort((left, right) => left.metric.localeCompare(right.metric)),
  });
}
