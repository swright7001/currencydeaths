import {
  dollarMetricDefinitions,
  type DollarMetricKey,
} from "../data/dollar-metric-contracts";

export const dollarStressComponentIds = [
  "monetary_expansion",
  "consumer_price_inflation",
  "federal_debt_burden",
] as const;

export type DollarStressComponentId = (typeof dollarStressComponentIds)[number];

export type DollarStressComponentConfig = Readonly<{
  id: DollarStressComponentId;
  label: string;
  sourceMetric: DollarMetricKey;
  sourceSeriesId: string;
  sourceUrl: string;
  inputLabel: string;
  unit: "percent_change_year_over_year" | "percent_gdp";
  transform: "linear_clamped";
  healthyBoundary: number;
  extremeBoundary: number;
  weight: number;
  rationale: string;
}>;

export type DollarStressMethodology = Readonly<{
  version: string;
  status: "experimental_not_production_approved";
  asOf: string;
  scorePrecision: 1;
  missingDataPolicy: "withhold_score";
  staleDataPolicy: "calculate_and_flag";
  components: readonly DollarStressComponentConfig[];
  limitations: readonly string[];
  changeHistory: readonly Readonly<{
    version: string;
    date: string;
    summary: string;
  }>[];
}>;

export const experimentalDollarStressMethodology = {
  version: "usd-stress-experimental-0.1.0",
  status: "experimental_not_production_approved",
  asOf: "2026-08-11",
  scorePrecision: 1,
  missingDataPolicy: "withhold_score",
  staleDataPolicy: "calculate_and_flag",
  components: [
    {
      id: "monetary_expansion",
      label: "Monetary expansion",
      sourceMetric: "m2",
      sourceSeriesId: "M2SL",
      sourceUrl: "https://fred.stlouisfed.org/series/M2SL",
      inputLabel: "M2 year-over-year change",
      unit: "percent_change_year_over_year",
      transform: "linear_clamped",
      healthyBoundary: -5,
      extremeBoundary: 25,
      weight: 0.35,
      rationale:
        "Uses the annual rate of change rather than the money-stock level so different eras remain more comparable.",
    },
    {
      id: "consumer_price_inflation",
      label: "Consumer-price inflation",
      sourceMetric: "cpi",
      sourceSeriesId: "CPIAUCSL",
      sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL",
      inputLabel: "CPI year-over-year change",
      unit: "percent_change_year_over_year",
      transform: "linear_clamped",
      healthyBoundary: 0,
      extremeBoundary: 15,
      weight: 0.35,
      rationale:
        "Treats sustained consumer-price acceleration as one stress signal without calling it a collapse forecast.",
    },
    {
      id: "federal_debt_burden",
      label: "Federal debt burden",
      sourceMetric: "federal_debt_to_gdp",
      sourceSeriesId: "GFDEGDQ188S",
      sourceUrl: "https://fred.stlouisfed.org/series/GFDEGDQ188S",
      inputLabel: "Federal debt as a share of GDP",
      unit: "percent_gdp",
      transform: "linear_clamped",
      healthyBoundary: 40,
      extremeBoundary: 180,
      weight: 0.3,
      rationale:
        "Places debt in relation to economic output; the boundary is an experimental comparison range, not a default threshold.",
    },
  ],
  limitations: [
    "The boundaries and weights are research assumptions awaiting owner approval for any production label.",
    "Three indicators cannot capture institutions, policy credibility, reserve demand, political conditions, or market structure.",
    "A similar score in two periods does not imply the same cause, path, timing, or outcome.",
    "Source series may be revised. A score must retain its model version, input observations, and as-of date.",
    "The score measures selected historical stress signals; it is not a probability and does not predict a currency death date.",
  ],
  changeHistory: [
    {
      version: "usd-stress-experimental-0.1.0",
      date: "2026-08-11",
      summary:
        "Initial three-component research configuration. Not approved for production labeling.",
    },
  ],
} as const satisfies DollarStressMethodology;

export function validateDollarStressMethodology(
  methodology: DollarStressMethodology,
) {
  if (!methodology.version.trim()) throw new Error("Methodology version is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(methodology.asOf)) {
    throw new Error("Methodology as-of date must use YYYY-MM-DD.");
  }
  if (methodology.components.length === 0) {
    throw new Error("Methodology requires at least one component.");
  }

  const ids = new Set<DollarStressComponentId>();
  let weightTotal = 0;
  for (const component of methodology.components) {
    if (ids.has(component.id)) throw new Error(`Duplicate component: ${component.id}.`);
    ids.add(component.id);
    if (!Number.isFinite(component.weight) || component.weight <= 0 || component.weight > 1) {
      throw new Error(`Component ${component.id} has an invalid weight.`);
    }
    if (
      !Number.isFinite(component.healthyBoundary) ||
      !Number.isFinite(component.extremeBoundary) ||
      component.extremeBoundary <= component.healthyBoundary
    ) {
      throw new Error(`Component ${component.id} has invalid normalization boundaries.`);
    }
    if (
      component.sourceSeriesId !==
      dollarMetricDefinitions[component.sourceMetric].sourceSeriesId
    ) {
      throw new Error(`Component ${component.id} has an invalid source-series contract.`);
    }
    weightTotal += component.weight;
  }

  if (Math.abs(weightTotal - 1) > 1e-9) {
    throw new Error(`Component weights must sum to 1; received ${weightTotal}.`);
  }
}

validateDollarStressMethodology(experimentalDollarStressMethodology);
