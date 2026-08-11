import {
  calculateDollarMetricFreshness,
  dollarMetricDefinitions,
  dollarMetricKeys,
  type DollarMetricKey,
} from "./dollar-metric-contracts";
import {
  assertDollarMetricFixtureIntegrity,
  dollarMetricFixtures,
  type DollarMetricFixtureObservation,
} from "./dollar-metric-fixtures";
import { historicalDateToKey, type HistoricalDate } from "./historical-date";
import { experimentalDollarStressMethodology } from "../methodology/dollar-stress-score";

const metricLabels: Record<DollarMetricKey, string> = {
  m2: "M2 money stock",
  cpi: "Consumer Price Index",
  federal_debt_to_gdp: "Federal debt / GDP",
};

const metricUnits: Record<DollarMetricKey, string> = {
  m2: "TRILLION USD · SA",
  cpi: "INDEX 1982–84=100 · SA",
  federal_debt_to_gdp: "% OF GDP · SA",
};

export type DollarDashboardMetric = Readonly<{
  key: DollarMetricKey;
  label: string;
  displayValue: string;
  unitLabel: string;
  trend: "up" | "down" | "flat";
  trendValue: string;
  trendContext: string;
  latest: DollarMetricFixtureObservation;
  observations: readonly DollarMetricFixtureObservation[];
  source: (typeof dollarMetricFixtures.sources)[number];
  freshness: ReturnType<typeof calculateDollarMetricFreshness>;
}>;

export type DollarDashboardModel = Readonly<{
  fixtureVersion: string;
  accessedAt: number;
  metrics: readonly DollarDashboardMetric[];
  stress: Readonly<{
    status: "unavailable";
    methodologyVersion: string;
    missingComponents: readonly Readonly<{
      id: string;
      label: string;
      weight: number;
      reason: string;
    }>[];
  }>;
}>;

export function formatHistoricalMonth(date: HistoricalDate) {
  if (date.precision !== "month" || date.month === undefined) {
    throw new Error("Dollar dashboard requires month-precision observations.");
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(date.year, date.month - 1, 1)));
}

export function formatUtcDate(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("Dollar dashboard timestamp must be positive and finite.");
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatMetricValue(metric: DollarMetricKey, value: number) {
  if (metric === "m2") return (value / 1_000).toFixed(2);
  if (metric === "cpi") return value.toFixed(3);
  return value.toFixed(1);
}

function buildTrend(observations: readonly DollarMetricFixtureObservation[]) {
  const latest = observations[observations.length - 1];
  const previous = observations[observations.length - 2];
  if (latest === undefined || previous === undefined) {
    return { trend: "flat" as const, value: "—", context: "insufficient history" };
  }
  const change = ((latest.value / previous.value) - 1) * 100;
  const trend: "up" | "down" | "flat" =
    Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down";
  return {
    trend,
    value: `${change > 0 ? "+" : ""}${change.toFixed(2)}%`,
    context: `from ${formatHistoricalMonth(previous.observationDate)}`,
  };
}

export function buildFixtureDollarDashboard(
  asOf = dollarMetricFixtures.accessedAt,
): DollarDashboardModel {
  assertDollarMetricFixtureIntegrity();

  const metrics = dollarMetricKeys.map((key): DollarDashboardMetric => {
    const observations = dollarMetricFixtures.observations
      .filter((observation) => observation.metric === key)
      .sort(
        (left, right) =>
          historicalDateToKey(left.observationDate) -
          historicalDateToKey(right.observationDate),
      );
    const latest = observations[observations.length - 1];
    if (latest === undefined) throw new Error(`Dollar dashboard fixture is missing ${key}.`);
    const source = dollarMetricFixtures.sources.find(
      (candidate) => candidate.key === latest.sourceKey,
    );
    if (source === undefined) throw new Error(`Dollar dashboard source is missing ${key}.`);
    const trend = buildTrend(observations);

    return {
      key,
      label: metricLabels[key],
      displayValue: formatMetricValue(key, latest.value),
      unitLabel: metricUnits[key],
      trend: trend.trend,
      trendValue: trend.value,
      trendContext: trend.context,
      latest,
      observations,
      source,
      freshness: calculateDollarMetricFreshness(key, latest.sourceUpdatedAt, asOf),
    };
  });

  return {
    fixtureVersion: dollarMetricFixtures.version,
    accessedAt: dollarMetricFixtures.accessedAt,
    metrics,
    stress: {
      status: "unavailable",
      methodologyVersion: experimentalDollarStressMethodology.version,
      missingComponents: experimentalDollarStressMethodology.components.map((component) => ({
        id: component.id,
        label: component.label,
        weight: component.weight,
        reason:
          component.inputKind === "year_over_year_percent_change"
            ? "Prior-year observation is absent from the development fixture."
            : "Exact-day provenance is not represented by the month-precision fixture.",
      })),
    },
  };
}

export function metricDefinitionForDashboard(metric: DollarMetricKey) {
  return dollarMetricDefinitions[metric];
}
