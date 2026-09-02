import baselineArtifact from "../../data/dollar-stress-baseline.json";
import type { DollarStressInput } from "../calculations/dollar-stress-score";
import {
  approvedDollarStressComponentContracts,
  dollarStressMethodologyV1,
  type DollarStressComponentId,
} from "../methodology/dollar-stress-score";

type BaselineMetric = "m2" | "cpi" | "federal_debt_to_gdp";
type BaselineObservation = Readonly<{ date: string; value: number | null }>;

const componentMetric: Record<DollarStressComponentId, BaselineMetric> = {
  monetary_expansion: "m2",
  consumer_price_inflation: "cpi",
  federal_debt_burden: "federal_debt_to_gdp",
};

function priorYearDate(date: string) {
  return `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
}

function periodEnd(date: string, frequency: "monthly" | "quarterly") {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const endMonth = frequency === "quarterly" ? month + 2 : month;
  return Date.UTC(year, endMonth, 0, 23, 59, 59, 999);
}

function percentileR7(values: readonly number[], percentile: number) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) throw new Error("Dollar stress baseline cannot be empty.");
  const h = (sorted.length - 1) * percentile;
  const lower = Math.floor(h);
  const upper = Math.ceil(h);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (h - lower);
}

function requireValue(
  values: ReadonlyMap<string, number | null>,
  date: string,
  label: string,
) {
  const value = values.get(date);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} is absent or invalid at the latest required period ${date}.`);
  }
  return value;
}

function sourceFor(metric: BaselineMetric) {
  const source = baselineArtifact.sources.find((candidate) => candidate.metric === metric);
  if (source === undefined) throw new Error(`Dollar stress source missing: ${metric}.`);
  return source;
}

function observationsFor(metric: BaselineMetric): readonly BaselineObservation[] {
  return baselineArtifact.observations[metric] as readonly BaselineObservation[];
}

function freshnessFor(componentId: DollarStressComponentId) {
  const metric = componentMetric[componentId];
  const source = sourceFor(metric);
  const component = dollarStressMethodologyV1.components.find(
    (candidate) => candidate.id === componentId,
  );
  if (component === undefined) throw new Error(`Dollar stress component missing: ${componentId}.`);
  const asOf = Date.parse(baselineArtifact.retrievedAt);
  const sourceUpdatedAt = Date.parse(source.sourceUpdatedAt);
  const latestDate = baselineArtifact.expectedLatestPeriods[metric];
  const periodEndedAt = periodEnd(latestDate, source.frequency as "monthly" | "quarterly");
  const maximumAge = component.freshnessDays * 86_400_000;
  return {
    freshness:
      asOf >= sourceUpdatedAt &&
      asOf >= periodEndedAt &&
      asOf - sourceUpdatedAt <= maximumAge &&
      asOf - periodEndedAt <= maximumAge
        ? ("current" as const)
        : ("stale" as const),
    sourceUpdatedAt,
    accessedAt: asOf,
    latestDate,
  };
}

export function calculateDollarStressBaselineAnchors() {
  const anchors = {} as Record<
    DollarStressComponentId,
    Readonly<{ count: number; lower: number; upper: number }>
  >;
  for (const component of dollarStressMethodologyV1.components) {
    const metric = componentMetric[component.id];
    const rows = observationsFor(metric);
    const values = new Map(rows.map((row) => [row.date, row.value]));
    const sample = rows
      .filter(
        (row) =>
          row.date >= baselineArtifact.baseline.startDate &&
          row.date <= baselineArtifact.baseline.endDate,
      )
      .flatMap((row) => {
        if (row.value === null) return [];
        if (component.inputKind === "direct") return [row.value];
        const prior = values.get(priorYearDate(row.date));
        return typeof prior === "number" && prior > 0
          ? [((row.value / prior) - 1) * 100]
          : [];
      });
    anchors[component.id] = {
      count: sample.length,
      lower: percentileR7(sample, baselineArtifact.baseline.lowerPercentile),
      upper: percentileR7(sample, baselineArtifact.baseline.upperPercentile),
    };
  }
  return anchors;
}

export function buildVerifiedDollarStressInputs(): readonly DollarStressInput[] {
  return dollarStressMethodologyV1.components.map((component): DollarStressInput => {
    const metric = componentMetric[component.id];
    const values = new Map(observationsFor(metric).map((row) => [row.date, row.value]));
    const timing = freshnessFor(component.id);
    const currentValue = requireValue(values, timing.latestDate, component.label);
    const base = {
      componentId: component.id,
      sourceSeriesId: approvedDollarStressComponentContracts[component.id].sourceSeriesId,
      freshness: timing.freshness,
    } as const;
    if (component.inputKind === "direct") {
      return {
        ...base,
        input: {
          kind: "direct",
          sourceUnit: "percent_gdp_seasonally_adjusted",
          value: currentValue,
          observationDate: timing.latestDate,
          sourceUpdatedAt: timing.sourceUpdatedAt,
          accessedAt: timing.accessedAt,
        },
      };
    }
    const priorDate = priorYearDate(timing.latestDate);
    const priorValue = requireValue(values, priorDate, `${component.label} prior-year input`);
    return {
      ...base,
      input: {
        kind: "year_over_year_percent_change",
        sourceUnit: component.sourceUnit,
        current: {
          value: currentValue,
          observationDate: timing.latestDate,
          sourceUpdatedAt: timing.sourceUpdatedAt,
          accessedAt: timing.accessedAt,
        },
        priorYear: {
          value: priorValue,
          observationDate: priorDate,
          sourceUpdatedAt: timing.sourceUpdatedAt,
          accessedAt: timing.accessedAt,
        },
      },
    };
  });
}

export const dollarStressBaseline = {
  version: baselineArtifact.version,
  retrievedAt: Date.parse(baselineArtifact.retrievedAt),
  anchors: calculateDollarStressBaselineAnchors(),
  sourceByMetric: Object.fromEntries(
    baselineArtifact.sources.map((source) => [source.metric, source]),
  ),
} as const;

for (const component of dollarStressMethodologyV1.components) {
  const anchor = dollarStressBaseline.anchors[component.id];
  if (
    Math.abs(anchor.lower - component.healthyBoundary) > 1e-12 ||
    Math.abs(anchor.upper - component.extremeBoundary) > 1e-12
  ) {
    throw new Error(`Dollar stress methodology does not match baseline: ${component.id}.`);
  }
}
