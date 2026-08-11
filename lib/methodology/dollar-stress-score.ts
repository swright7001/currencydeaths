import {
  dollarMetricDefinitions,
  type DollarMetricKey,
  type DollarMetricUnit,
} from "../data/dollar-metric-contracts";
import { assertIsoCalendarDate } from "../data/iso-calendar-date";

export const dollarStressComponentIds = [
  "monetary_expansion",
  "consumer_price_inflation",
  "federal_debt_burden",
] as const;

export type DollarStressComponentId = (typeof dollarStressComponentIds)[number];
export type DollarStressOutputUnit =
  | "percent_change_year_over_year"
  | "percent_gdp";
export type DollarStressInputKind = "year_over_year_percent_change" | "direct";

type ApprovedDollarStressComponentContract = Readonly<{
  sourceMetric: DollarMetricKey;
  sourceSeriesId: string;
  sourceUrl: string;
  sourceUnit: DollarMetricUnit;
  outputUnit: DollarStressOutputUnit;
  inputKind: DollarStressInputKind;
}>;

export const approvedDollarStressComponentContracts = {
  monetary_expansion: {
    sourceMetric: "m2",
    sourceSeriesId: "M2SL",
    sourceUrl: "https://fred.stlouisfed.org/series/M2SL",
    sourceUnit: "billions_usd_seasonally_adjusted",
    outputUnit: "percent_change_year_over_year",
    inputKind: "year_over_year_percent_change",
  },
  consumer_price_inflation: {
    sourceMetric: "cpi",
    sourceSeriesId: "CPIAUCSL",
    sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL",
    sourceUnit: "index_1982_1984_100_seasonally_adjusted",
    outputUnit: "percent_change_year_over_year",
    inputKind: "year_over_year_percent_change",
  },
  federal_debt_burden: {
    sourceMetric: "federal_debt_to_gdp",
    sourceSeriesId: "GFDEGDQ188S",
    sourceUrl: "https://fred.stlouisfed.org/series/GFDEGDQ188S",
    sourceUnit: "percent_gdp_seasonally_adjusted",
    outputUnit: "percent_gdp",
    inputKind: "direct",
  },
} as const satisfies Record<
  DollarStressComponentId,
  ApprovedDollarStressComponentContract
>;

export type DollarStressComponentConfig = Readonly<{
  id: DollarStressComponentId;
  label: string;
  inputLabel: string;
  sourceMetric: DollarMetricKey;
  sourceSeriesId: string;
  sourceUrl: string;
  sourceUnit: DollarMetricUnit;
  outputUnit: DollarStressOutputUnit;
  inputKind: DollarStressInputKind;
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

const monetaryExpansionContract = approvedDollarStressComponentContracts.monetary_expansion;
const inflationContract = approvedDollarStressComponentContracts.consumer_price_inflation;
const debtContract = approvedDollarStressComponentContracts.federal_debt_burden;

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
      inputLabel: "M2 year-over-year change",
      ...monetaryExpansionContract,
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
      inputLabel: "CPI year-over-year change",
      ...inflationContract,
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
      inputLabel: "Federal debt as a share of GDP",
      ...debtContract,
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
    "Source series may be revised. A score must retain its model version, both observations for derived rates, and its as-of date.",
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
  assertIsoCalendarDate(methodology.asOf, "Methodology as-of date");
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

    const approved = approvedDollarStressComponentContracts[component.id];
    if (
      component.sourceMetric !== approved.sourceMetric ||
      component.sourceSeriesId !== approved.sourceSeriesId ||
      component.sourceUrl !== approved.sourceUrl ||
      component.sourceUnit !== approved.sourceUnit ||
      component.outputUnit !== approved.outputUnit ||
      component.inputKind !== approved.inputKind ||
      component.sourceSeriesId !==
        dollarMetricDefinitions[component.sourceMetric].sourceSeriesId ||
      component.sourceUnit !== dollarMetricDefinitions[component.sourceMetric].unit
    ) {
      throw new Error(`Component ${component.id} violates its approved identity contract.`);
    }
    weightTotal += component.weight;
  }

  if (Math.abs(weightTotal - 1) > 1e-9) {
    throw new Error(`Component weights must sum to 1; received ${weightTotal}.`);
  }
}

validateDollarStressMethodology(experimentalDollarStressMethodology);
