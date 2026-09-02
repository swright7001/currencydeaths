import type {
  DollarMetricFrequency,
  DollarMetricGap,
  DollarMetricKey,
  DollarMetricUnit,
} from "./dollar-metric-contracts";
import type { HistoricalDate } from "./historical-date";

export type DollarMetricQuerySource = Readonly<{
  id: string;
  title: string;
  publisher: string;
  url: string;
  publicationDate: HistoricalDate | null;
  accessedAt: number;
  sourceType: string;
}>;

export type DollarMetricQueryObservation = Readonly<{
  id: string;
  metric: DollarMetricKey;
  observationDate: HistoricalDate;
  value: number;
  unit: DollarMetricUnit;
  frequency: DollarMetricFrequency;
  sourceSeriesId: string;
  sourceUpdatedAt: number;
  fixtureBatchVersion: string | null;
  notes: string | null;
  recordState: "development_fixture" | "verified";
  source: DollarMetricQuerySource;
}>;

export type DollarMetricSeriesContract = Readonly<{
  datasetVersion: string;
  retrievedAt: number;
  metric: DollarMetricKey;
  latest: DollarMetricQueryObservation;
  directionWindow: readonly DollarMetricQueryObservation[];
  contextSeries: readonly DollarMetricQueryObservation[];
  gaps: readonly DollarMetricGap[];
  freshness: Readonly<{
    asOf: number;
    sourceUpdatedAt: number;
    ageDays: number;
    thresholdDays: number;
    state: "current" | "stale";
  }>;
  developmentNotice: string | null;
}>;
