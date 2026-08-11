import { normalizeRange } from "./normalize-range";
import { assertIsoCalendarDate, isOneYearApart } from "../data/iso-calendar-date";
import {
  validateDollarStressMethodology,
  type DollarStressComponentId,
  type DollarStressMethodology,
} from "../methodology/dollar-stress-score";

type StressInputBase = Readonly<{
  componentId: DollarStressComponentId;
  sourceSeriesId: string;
  freshness: "current" | "stale";
}>;

type StressSourceObservation = Readonly<{
  value: number;
  observationDate: string;
  sourceUpdatedAt: number;
  accessedAt: number;
}>;

export type DollarStressInput =
  | (StressInputBase &
      Readonly<{
        input: Readonly<{
          kind: "year_over_year_percent_change";
          sourceUnit:
            | "billions_usd_seasonally_adjusted"
            | "index_1982_1984_100_seasonally_adjusted";
          current: StressSourceObservation;
          priorYear: StressSourceObservation;
        }>;
      }>)
  | (StressInputBase &
      Readonly<{
        input: Readonly<{
          kind: "direct";
          sourceUnit: "percent_gdp_seasonally_adjusted";
          value: number;
          observationDate: string;
          sourceUpdatedAt: number;
          accessedAt: number;
        }>;
      }>);

export type DollarStressContribution = Readonly<{
  componentId: DollarStressComponentId;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  pointContribution: number;
  freshness: "current" | "stale";
  observationDate: string;
  sourceUpdatedAt: number;
  accessedAt: number;
  sourceSeriesId: string;
  derivation:
    | null
    | Readonly<{
        formula: "((current / prior_year) - 1) * 100";
        current: StressSourceObservation;
        priorYear: StressSourceObservation;
      }>;
}>;

export type DollarStressScoreResult = Readonly<{
  methodologyVersion: string;
  methodologyAsOf: string;
  status: "experimental" | "provisional_stale" | "unavailable";
  score: number | null;
  contributions: readonly DollarStressContribution[];
  missingComponents: readonly DollarStressComponentId[];
  staleComponents: readonly DollarStressComponentId[];
}>;

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validateProvenanceTimes(
  observationTimestamp: number,
  sourceUpdatedAt: number,
  accessedAt: number,
  componentId: DollarStressComponentId,
) {
  if (
    !Number.isFinite(sourceUpdatedAt) ||
    sourceUpdatedAt < observationTimestamp ||
    !Number.isFinite(accessedAt) ||
    accessedAt < sourceUpdatedAt
  ) {
    throw new Error(`Component ${componentId} has invalid source provenance times.`);
  }
}

function deriveComponentValue(
  input: DollarStressInput,
  expectedKind: "year_over_year_percent_change" | "direct",
  expectedSourceUnit: string,
) {
  if (input.input.kind !== expectedKind) {
    throw new Error(`Component ${input.componentId} requires ${expectedKind} input.`);
  }
  if (input.input.sourceUnit !== expectedSourceUnit) {
    throw new Error(
      `Component ${input.componentId} requires source unit ${expectedSourceUnit}.`,
    );
  }

  if (input.input.kind === "direct") {
    const observationTimestamp = assertIsoCalendarDate(
      input.input.observationDate,
      "Stress input observation date",
    );
    validateProvenanceTimes(
      observationTimestamp,
      input.input.sourceUpdatedAt,
      input.input.accessedAt,
      input.componentId,
    );
    if (!Number.isFinite(input.input.value)) {
      throw new Error(`Stress input ${input.componentId} must be finite.`);
    }
    return {
      value: input.input.value,
      observationDate: input.input.observationDate,
      sourceUpdatedAt: input.input.sourceUpdatedAt,
      accessedAt: input.input.accessedAt,
      derivation: null,
    };
  }

  const { current, priorYear } = input.input;
  const currentTimestamp = assertIsoCalendarDate(
    current.observationDate,
    "Current observation date",
  );
  const priorYearTimestamp = assertIsoCalendarDate(
    priorYear.observationDate,
    "Prior-year observation date",
  );
  validateProvenanceTimes(
    currentTimestamp,
    current.sourceUpdatedAt,
    current.accessedAt,
    input.componentId,
  );
  validateProvenanceTimes(
    priorYearTimestamp,
    priorYear.sourceUpdatedAt,
    priorYear.accessedAt,
    input.componentId,
  );
  if (!isOneYearApart(priorYear.observationDate, current.observationDate)) {
    throw new Error(
      `Component ${input.componentId} requires observations exactly one year apart.`,
    );
  }
  if (![current.value, priorYear.value].every(Number.isFinite)) {
    throw new Error(`Stress input ${input.componentId} observations must be finite.`);
  }
  if (priorYear.value <= 0) {
    throw new Error(`Component ${input.componentId} prior-year value must be positive.`);
  }
  return {
    value: ((current.value / priorYear.value) - 1) * 100,
    observationDate: current.observationDate,
    sourceUpdatedAt: current.sourceUpdatedAt,
    accessedAt: current.accessedAt,
    derivation: {
      formula: "((current / prior_year) - 1) * 100" as const,
      current,
      priorYear,
    },
  };
}

export function calculateDollarStressScore(
  methodology: DollarStressMethodology,
  inputs: readonly DollarStressInput[],
): DollarStressScoreResult {
  validateDollarStressMethodology(methodology);
  const inputByComponent = new Map<DollarStressComponentId, DollarStressInput>();
  const configuredComponentIds = new Set(
    methodology.components.map((component) => component.id),
  );

  for (const input of inputs) {
    if (!configuredComponentIds.has(input.componentId)) {
      throw new Error(`Stress input is not configured: ${input.componentId}.`);
    }
    if (inputByComponent.has(input.componentId)) {
      throw new Error(`Duplicate stress input: ${input.componentId}.`);
    }
    if (input.freshness !== "current" && input.freshness !== "stale") {
      throw new Error(`Stress input ${input.componentId} has invalid freshness.`);
    }
    inputByComponent.set(input.componentId, input);
  }

  const missingComponents: DollarStressComponentId[] = [];
  const staleComponents: DollarStressComponentId[] = [];
  const contributions: DollarStressContribution[] = [];
  let unroundedScore = 0;

  for (const component of methodology.components) {
    const input = inputByComponent.get(component.id);
    if (input === undefined) {
      missingComponents.push(component.id);
      continue;
    }
    if (input.sourceSeriesId !== component.sourceSeriesId) {
      throw new Error(
        `Component ${component.id} requires source series ${component.sourceSeriesId}.`,
      );
    }

    const derived = deriveComponentValue(
      input,
      component.inputKind,
      component.sourceUnit,
    );
    const normalized = normalizeRange(derived.value, {
      minimum: component.healthyBoundary,
      maximum: component.extremeBoundary,
    });
    const points = normalized * component.weight;
    unroundedScore += points;
    if (input.freshness === "stale") staleComponents.push(component.id);
    contributions.push({
      componentId: component.id,
      rawValue: round(derived.value, methodology.scorePrecision),
      normalizedScore: round(normalized, methodology.scorePrecision),
      weight: component.weight,
      pointContribution: round(points, methodology.scorePrecision),
      freshness: input.freshness,
      observationDate: derived.observationDate,
      sourceUpdatedAt: derived.sourceUpdatedAt,
      accessedAt: derived.accessedAt,
      sourceSeriesId: input.sourceSeriesId,
      derivation: derived.derivation,
    });
  }

  if (missingComponents.length > 0) {
    return {
      methodologyVersion: methodology.version,
      methodologyAsOf: methodology.asOf,
      status: "unavailable",
      score: null,
      contributions,
      missingComponents,
      staleComponents,
    };
  }

  return {
    methodologyVersion: methodology.version,
    methodologyAsOf: methodology.asOf,
    status: staleComponents.length > 0 ? "provisional_stale" : "experimental",
    score: round(unroundedScore, methodology.scorePrecision),
    contributions,
    missingComponents,
    staleComponents,
  };
}
