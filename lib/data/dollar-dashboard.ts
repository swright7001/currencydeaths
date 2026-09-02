import {
  calculateDollarStressScore,
  calculateDollarStressSensitivity,
  type DollarStressContribution,
  type DollarStressInput,
} from "../calculations/dollar-stress-score";
import {
  dollarStressMethodologyV1,
  getDollarStressBand,
} from "../methodology/dollar-stress-score";
import {
  calculateDollarMetricObservationAgeMs,
  calculateDollarMetricFreshness,
  dollarMetricKeys,
  findDollarMetricGaps,
  type DollarMetricKey,
} from "./dollar-metric-contracts";
import {
  assertDollarMetricSnapshotIntegrity,
  dollarMetricSnapshot,
} from "./dollar-metric-snapshot";
import {
  buildVerifiedDollarStressInputs,
  dollarStressBaseline,
} from "./dollar-stress-baseline";
import type {
  DollarMetricQueryObservation,
  DollarMetricSeriesContract,
} from "./dollar-metric-query-contract";
import { FRED_REFRESH_VERSION } from "./fred-refresh-contract";
import { historicalDateToKey, type HistoricalDate } from "./historical-date";

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
  latest: DollarMetricQueryObservation;
  observations: readonly DollarMetricQueryObservation[];
  source: DollarMetricQueryObservation["source"];
  freshness: DollarMetricSeriesContract["freshness"];
}>;

export type DollarDashboardModel = Readonly<{
  datasetVersion: string;
  retrievedAt: number;
  freshnessBasis: "snapshot_retrieval" | "provider_retrieval" | "explicit_as_of";
  freshnessAsOf: number;
  metrics: readonly DollarDashboardMetric[];
  stress: Readonly<{
    status: "unavailable" | "experimental";
    score: number | null;
    band: string | null;
    methodologyVersion: string;
    baselineVersion: string;
    contributions: readonly Readonly<{
      id: string;
      label: string;
      inputLabel: string;
      rawValue: number;
      normalizedScore: number;
      weight: number;
      pointContribution: number;
      freshness: "current" | "stale";
      observationDate: string;
      sourceUpdatedAt: number;
      accessedAt: number;
      sourceSeriesId: string;
      sourceUrl: string;
      lowerAnchor: number;
      upperAnchor: number;
      saturated: boolean;
      derivation: DollarStressContribution["derivation"];
    }>[];
    sensitivity: readonly Readonly<{ id: string; label: string; score: number }>[];
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

function buildTrend(observations: readonly DollarMetricQueryObservation[]) {
  const latest = observations[observations.length - 1];
  const previous = observations[observations.length - 2];
  if (latest === undefined || previous === undefined) {
    return {
      trend: "flat" as const,
      value: "—",
      context: "relative change unavailable; fewer than 2 observations",
    };
  }
  const change = ((latest.value / previous.value) - 1) * 100;
  const trend: "up" | "down" | "flat" =
    Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down";
  return {
    trend,
    value: `${change > 0 ? "+" : ""}${change.toFixed(2)}%`,
    context: `relative change from ${formatHistoricalMonth(previous.observationDate)}`,
  };
}

const stressMetricByComponent = {
  monetary_expansion: "m2",
  consumer_price_inflation: "cpi",
  federal_debt_burden: "federal_debt_to_gdp",
} as const satisfies Record<DollarStressInput["componentId"], DollarMetricKey>;

function historicalMonthToIso(date: HistoricalDate) {
  if (date.precision !== "month" || date.month === undefined) {
    throw new Error("Dollar stress inputs require month-precision observations.");
  }
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-01`;
}

function buildDollarStressInputFromSeries(
  componentId: DollarStressInput["componentId"],
  series: DollarMetricSeriesContract | undefined,
): DollarStressInput | null {
  if (series === undefined) return null;
  const component = dollarStressMethodologyV1.components.find((item) => item.id === componentId);
  if (
    component === undefined ||
    series.latest.recordState !== "verified" ||
    series.latest.sourceSeriesId !== component.sourceSeriesId ||
    series.latest.unit !== component.sourceUnit
  ) return null;
  const currentDate = historicalMonthToIso(series.latest.observationDate);
  const observationAgeMs = calculateDollarMetricObservationAgeMs(
    series.metric,
    series.latest.observationDate,
    series.freshness.asOf,
  );
  const sourceAgeMs = series.freshness.asOf - series.latest.sourceUpdatedAt;
  const maximumAgeMs = component.freshnessDays * 86_400_000;
  const shared = {
    componentId,
    sourceSeriesId: series.latest.sourceSeriesId,
    freshness:
      sourceAgeMs <= maximumAgeMs && observationAgeMs <= maximumAgeMs
        ? ("current" as const)
        : ("stale" as const),
  } as const;
  if (component.inputKind === "direct") {
    return {
      ...shared,
      input: {
        kind: "direct",
        sourceUnit: "percent_gdp_seasonally_adjusted",
        value: series.latest.value,
        observationDate: currentDate,
        sourceUpdatedAt: series.latest.sourceUpdatedAt,
        accessedAt: series.latest.source.accessedAt,
      },
    };
  }
  const priorDate = `${Number(currentDate.slice(0, 4)) - 1}${currentDate.slice(4)}`;
  const prior = series.contextSeries.find(
    (observation) => historicalMonthToIso(observation.observationDate) === priorDate,
  );
  if (
    prior === undefined ||
    prior.recordState !== "verified" ||
    prior.sourceSeriesId !== component.sourceSeriesId ||
    prior.unit !== component.sourceUnit
  ) return null;
  return {
    ...shared,
    input: {
      kind: "year_over_year_percent_change",
      sourceUnit: component.sourceUnit,
      current: {
        value: series.latest.value,
        observationDate: currentDate,
        sourceUpdatedAt: series.latest.sourceUpdatedAt,
        accessedAt: series.latest.source.accessedAt,
      },
      priorYear: {
        value: prior.value,
        observationDate: priorDate,
        sourceUpdatedAt: prior.sourceUpdatedAt,
        accessedAt: prior.source.accessedAt,
      },
    },
  };
}

function snapshotStressInputMatchesSeries(
  input: DollarStressInput,
  series: DollarMetricSeriesContract | undefined,
) {
  if (series === undefined) return false;
  const expected = input.input.kind === "direct" ? input.input : input.input.current;
  return (
    series.latest.sourceSeriesId === input.sourceSeriesId &&
    historicalMonthToIso(series.latest.observationDate) === expected.observationDate &&
    series.latest.value === expected.value &&
    series.latest.unit === input.input.sourceUnit &&
    series.latest.sourceUpdatedAt === expected.sourceUpdatedAt &&
    series.latest.source.accessedAt === expected.accessedAt &&
    series.latest.recordState === "verified"
  );
}

export function buildSnapshotDollarMetricSeries(
  asOf: number,
): DollarMetricSeriesContract[] {
  assertDollarMetricSnapshotIntegrity();
  return dollarMetricKeys.map((metric) => {
    const sourceSnapshot = dollarMetricSnapshot.sources.find(
      (source) => source.sourceSeriesId ===
        dollarMetricSnapshot.observations.find((item) => item.metric === metric)?.sourceSeriesId,
    );
    if (sourceSnapshot === undefined) throw new Error(`Snapshot query source missing: ${metric}.`);
    const source = {
      id: `verified-snapshot-source:${sourceSnapshot.key}`,
      title: sourceSnapshot.title,
      publisher: sourceSnapshot.publisher,
      url: sourceSnapshot.url,
      publicationDate: null,
      accessedAt: dollarMetricSnapshot.retrievedAt,
      sourceType: sourceSnapshot.sourceType,
    } satisfies DollarMetricQueryObservation["source"];
    const contextSeries = dollarMetricSnapshot.observations
      .filter((item) => item.metric === metric)
      .sort(
        (left, right) =>
          historicalDateToKey(left.observationDate) -
          historicalDateToKey(right.observationDate),
      )
      .map(
        (item): DollarMetricQueryObservation => ({
          id: `verified-snapshot:${metric}:${historicalDateToKey(item.observationDate)}`,
          metric: item.metric,
          observationDate: item.observationDate,
          value: item.value,
          unit: item.unit,
          frequency: item.frequency,
          sourceSeriesId: item.sourceSeriesId,
          sourceUpdatedAt: item.sourceUpdatedAt,
          fixtureBatchVersion: null,
          notes: item.notes,
          recordState: "verified",
          source,
        }),
      );
    const latest = contextSeries[contextSeries.length - 1];
    if (latest === undefined) throw new Error(`Snapshot query series missing: ${metric}.`);
    return {
      datasetVersion: dollarMetricSnapshot.version,
      retrievedAt: dollarMetricSnapshot.retrievedAt,
      metric,
      latest,
      directionWindow: contextSeries.slice(-3),
      contextSeries,
      gaps: findDollarMetricGaps(contextSeries, latest.frequency),
      freshness: calculateDollarMetricFreshness(metric, latest.sourceUpdatedAt, asOf),
      developmentNotice: null,
    } satisfies DollarMetricSeriesContract;
  });
}

export function buildDollarDashboardFromSeries(
  seriesResults: readonly DollarMetricSeriesContract[],
  metadata: Readonly<{ datasetVersion?: string; retrievedAt?: number }> = {},
): DollarDashboardModel {
  const providerBacked = metadata.datasetVersion?.startsWith(`${FRED_REFRESH_VERSION}:`) ?? false;
  const resultByMetric = new Map(seriesResults.map((series) => [series.metric, series]));
  if (resultByMetric.size !== seriesResults.length) {
    throw new Error("Dollar dashboard query results contain duplicate metrics.");
  }
  const freshnessAsOf =
    seriesResults[0]?.freshness.asOf ?? dollarMetricSnapshot.retrievedAt;
  if (seriesResults.some((series) => series.freshness.asOf !== freshnessAsOf)) {
    throw new Error("Dollar dashboard query results require one freshness as-of time.");
  }
  const metrics = dollarMetricKeys.flatMap((key): DollarDashboardMetric[] => {
    const series = resultByMetric.get(key);
    if (series === undefined) return [];
    const trend = buildTrend(series.directionWindow);
    return [{
      key,
      label: metricLabels[key],
      displayValue: formatMetricValue(key, series.latest.value),
      unitLabel: metricUnits[key],
      trend: trend.trend,
      trendValue: trend.value,
      trendContext: trend.context,
      latest: series.latest,
      observations: series.contextSeries,
      source: series.latest.source,
      freshness: series.freshness,
    }];
  });

  const boundStressInputs = !providerBacked
    ? buildVerifiedDollarStressInputs(freshnessAsOf).filter((input) =>
        snapshotStressInputMatchesSeries(
          input,
          resultByMetric.get(stressMetricByComponent[input.componentId]),
        ),
      )
    : dollarStressMethodologyV1.components.flatMap((component) => {
        const input = buildDollarStressInputFromSeries(
          component.id,
          resultByMetric.get(stressMetricByComponent[component.id]),
        );
        return input === null ? [] : [input];
      });
  const stressResult = calculateDollarStressScore(
    dollarStressMethodologyV1,
    boundStressInputs,
  );
  const componentById = new Map(
    dollarStressMethodologyV1.components.map((component) => [component.id, component]),
  );

  return {
    datasetVersion: metadata.datasetVersion ?? dollarMetricSnapshot.version,
    retrievedAt: metadata.retrievedAt ?? dollarMetricSnapshot.retrievedAt,
    freshnessBasis:
      providerBacked
        ? "provider_retrieval"
        : freshnessAsOf === dollarMetricSnapshot.retrievedAt
          ? "snapshot_retrieval"
          : "explicit_as_of",
    freshnessAsOf,
    metrics,
    stress: {
      status: stressResult.status,
      score: stressResult.score,
      band:
        stressResult.score === null
          ? null
          : getDollarStressBand(stressResult.score, dollarStressMethodologyV1).label,
      methodologyVersion: stressResult.methodologyVersion,
      baselineVersion: dollarStressBaseline.version,
      contributions: stressResult.contributions.map((contribution) => {
        const component = componentById.get(contribution.componentId)!;
        return {
          id: contribution.componentId,
          label: component.label,
          inputLabel: component.inputLabel,
          rawValue: contribution.rawValue,
          normalizedScore: contribution.normalizedScore,
          weight: contribution.weight,
          pointContribution: contribution.pointContribution,
          freshness: contribution.freshness,
          observationDate: contribution.observationDate,
          sourceUpdatedAt: contribution.sourceUpdatedAt,
          accessedAt: contribution.accessedAt,
          sourceSeriesId: contribution.sourceSeriesId,
          sourceUrl: component.sourceUrl,
          lowerAnchor: component.healthyBoundary,
          upperAnchor: component.extremeBoundary,
          saturated: contribution.normalizedScore >= 100,
          derivation: contribution.derivation,
        };
      }),
      sensitivity:
        stressResult.score === null
          ? []
          : calculateDollarStressSensitivity(
              dollarStressMethodologyV1,
              stressResult.contributions,
            ),
      missingComponents: stressResult.missingComponents.map((id) => {
        const component = componentById.get(id)!;
        return {
          id,
          label: component.label,
          weight: component.weight,
          reason:
            "The latest expected source period is missing or invalid; the full score is withheld.",
        };
      }),
    },
  };
}

export function buildSnapshotDollarDashboard(
  asOf = dollarMetricSnapshot.retrievedAt,
) {
  return buildDollarDashboardFromSeries(buildSnapshotDollarMetricSeries(asOf));
}
