import { normalizeRange } from "./normalize-range";
import {
  validateDollarStressMethodology,
  type DollarStressComponentId,
  type DollarStressMethodology,
} from "../methodology/dollar-stress-score";

export type DollarStressInput = Readonly<{
  componentId: DollarStressComponentId;
  value: number;
  unit: "percent_change_year_over_year" | "percent_gdp";
  sourceSeriesId: string;
  observationDate: string;
  freshness: "current" | "stale";
}>;

export type DollarStressContribution = Readonly<{
  componentId: DollarStressComponentId;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  pointContribution: number;
  freshness: "current" | "stale";
  observationDate: string;
  sourceSeriesId: string;
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

function requireObservationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Stress input observation date must use YYYY-MM-DD.");
  }
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
    if (!Number.isFinite(input.value)) {
      throw new Error(`Stress input ${input.componentId} must be finite.`);
    }
    if (input.freshness !== "current" && input.freshness !== "stale") {
      throw new Error(`Stress input ${input.componentId} has invalid freshness.`);
    }
    requireObservationDate(input.observationDate);
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
    if (input.unit !== component.unit) {
      throw new Error(`Component ${component.id} requires unit ${component.unit}.`);
    }
    if (input.sourceSeriesId !== component.sourceSeriesId) {
      throw new Error(
        `Component ${component.id} requires source series ${component.sourceSeriesId}.`,
      );
    }

    const normalized = normalizeRange(input.value, {
      minimum: component.healthyBoundary,
      maximum: component.extremeBoundary,
    });
    const points = normalized * component.weight;
    unroundedScore += points;
    if (input.freshness === "stale") staleComponents.push(component.id);
    contributions.push({
      componentId: component.id,
      rawValue: input.value,
      normalizedScore: round(normalized, methodology.scorePrecision),
      weight: component.weight,
      pointContribution: round(points, methodology.scorePrecision),
      freshness: input.freshness,
      observationDate: input.observationDate,
      sourceSeriesId: input.sourceSeriesId,
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
