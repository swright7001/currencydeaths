import snapshotArtifact from "../../data/dollar-metric-snapshot.json";
import {
  dollarMetricDefinitions,
  validateDollarMetricObservation,
  type DollarMetricFrequency,
  type DollarMetricKey,
  type DollarMetricUnit,
} from "./dollar-metric-contracts";
import type { HistoricalDate } from "./historical-date";

export const DOLLAR_METRIC_SNAPSHOT_VERSION = snapshotArtifact.version;
export const DOLLAR_METRIC_SNAPSHOT_RETRIEVED_AT = Date.parse(
  snapshotArtifact.retrievedAt,
);

export type DollarMetricSnapshotSource = Readonly<{
  key: string;
  title: string;
  publisher: string;
  url: string;
  downloadUrl: string;
  downloadSha256: string;
  sourceType: "central_bank";
  sourceSeriesId: string;
  sourceUpdatedAt: number;
  unit: DollarMetricUnit;
  frequency: DollarMetricFrequency;
}>;

export type DollarMetricSnapshotObservation = Readonly<{
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

function parseMonth(value: string): HistoricalDate {
  const match = /^(\d{4})-(\d{2})-01$/.exec(value);
  if (match === null) {
    throw new Error(`Dollar snapshot date must preserve month precision: ${value}.`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    precision: "month",
  };
}

const sources = snapshotArtifact.sources.map((source): DollarMetricSnapshotSource => ({
  ...source,
  sourceType: "central_bank",
  sourceUpdatedAt: Date.parse(source.sourceUpdatedAt),
  unit: source.unit as DollarMetricUnit,
  frequency: source.frequency as DollarMetricFrequency,
}));

const sourcesByKey = new Map(sources.map((source) => [source.key, source]));

const observations = snapshotArtifact.observations.map(
  (observation): DollarMetricSnapshotObservation => {
    const source = sourcesByKey.get(observation.sourceKey);
    if (source === undefined) {
      throw new Error(`Unknown dollar metric snapshot source: ${observation.sourceKey}.`);
    }
    return {
      metric: observation.metric as DollarMetricKey,
      observationDate: parseMonth(observation.observationDate),
      value: observation.value,
      unit: source.unit,
      frequency: source.frequency,
      sourceKey: source.key,
      sourceSeriesId: source.sourceSeriesId,
      sourceUpdatedAt: source.sourceUpdatedAt,
      notes:
        "Verified dated snapshot retrieved from the cited FRED series; not live. Source observations may be revised.",
    };
  },
);

export const dollarMetricSnapshot = {
  version: DOLLAR_METRIC_SNAPSHOT_VERSION,
  retrievedAt: DOLLAR_METRIC_SNAPSHOT_RETRIEVED_AT,
  observationSha256: snapshotArtifact.observationSha256,
  sources,
  observations,
} as const;

export function assertDollarMetricSnapshotIntegrity(
  snapshot: typeof dollarMetricSnapshot = dollarMetricSnapshot,
) {
  if (!Number.isFinite(snapshot.retrievedAt) || snapshot.retrievedAt <= 0) {
    throw new Error("Dollar metric snapshot retrieval time must be valid.");
  }
  const sourceMap = new Map<string, DollarMetricSnapshotSource>();
  for (const source of snapshot.sources) {
    if (sourceMap.has(source.key)) {
      throw new Error(`Duplicate dollar metric snapshot source: ${source.key}.`);
    }
    if (!/^https:\/\/fred\.stlouisfed\.org\//.test(source.url)) {
      throw new Error(`Dollar metric snapshot source must be official FRED: ${source.key}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(source.downloadSha256)) {
      throw new Error(`Dollar metric snapshot source checksum is invalid: ${source.key}.`);
    }
    sourceMap.set(source.key, source);
  }

  const uniqueObservations = new Set<string>();
  const previousByMetric = new Map<DollarMetricKey, number>();
  for (const observation of snapshot.observations) {
    const source = sourceMap.get(observation.sourceKey);
    if (source === undefined) {
      throw new Error(`Unknown dollar metric snapshot source: ${observation.sourceKey}.`);
    }
    const definition = dollarMetricDefinitions[observation.metric];
    if (
      source.sourceSeriesId !== definition.sourceSeriesId ||
      source.unit !== definition.unit ||
      source.frequency !== definition.frequency ||
      source.sourceUpdatedAt !== observation.sourceUpdatedAt ||
      source.sourceSeriesId !== observation.sourceSeriesId
    ) {
      throw new Error(`Dollar metric snapshot provenance mismatch for ${observation.metric}.`);
    }
    validateDollarMetricObservation(observation);
    const monthKey =
      observation.observationDate.year * 12 +
      (observation.observationDate.month ?? 0);
    const identity = `${observation.metric}:${monthKey}`;
    if (uniqueObservations.has(identity)) {
      throw new Error(`Duplicate dollar metric snapshot observation: ${identity}.`);
    }
    const previous = previousByMetric.get(observation.metric);
    if (previous !== undefined && monthKey <= previous) {
      throw new Error(`Dollar metric snapshot must be chronological: ${observation.metric}.`);
    }
    uniqueObservations.add(identity);
    previousByMetric.set(observation.metric, monthKey);
  }
}
