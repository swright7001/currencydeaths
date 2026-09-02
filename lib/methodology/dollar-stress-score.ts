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
  freshnessDays: 75 | 180;
}>;

export type DollarStressBand = Readonly<{
  minimum: number;
  maximum: number;
  label: "Lower" | "Moderate" | "Elevated" | "High" | "Extreme";
}>;

export type DollarStressSensitivityScenario = Readonly<{
  id: "equal" | "monetary_emphasis" | "inflation_emphasis" | "fiscal_emphasis";
  label: string;
  weights: Readonly<Record<DollarStressComponentId, number>>;
}>;

export type DollarStressMethodology = Readonly<{
  version: string;
  status: "production_approved_experimental";
  asOf: string;
  baselineVersion: string;
  baselineWindow: Readonly<{ startDate: string; endDate: string }>;
  percentileMethod: "r7_linear";
  lowerPercentile: 0.2;
  upperPercentile: 0.95;
  scorePrecision: 1;
  missingDataPolicy: "withhold_score";
  staleDataPolicy: "withhold_score";
  components: readonly DollarStressComponentConfig[];
  bands: readonly DollarStressBand[];
  sensitivityScenarios: readonly DollarStressSensitivityScenario[];
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

export const dollarStressMethodologyV1 = {
  version: "usd-stress-v1.0.0",
  status: "production_approved_experimental",
  asOf: "2026-09-02",
  baselineVersion: "usd-stress-baseline-2026-09-02",
  baselineWindow: { startDate: "1966-01-01", endDate: "2025-12-31" },
  percentileMethod: "r7_linear",
  lowerPercentile: 0.2,
  upperPercentile: 0.95,
  scorePrecision: 1,
  missingDataPolicy: "withhold_score",
  staleDataPolicy: "withhold_score",
  components: [
    {
      id: "monetary_expansion",
      label: "Monetary expansion",
      inputLabel: "M2 year-over-year change",
      ...monetaryExpansionContract,
      transform: "linear_clamped",
      healthyBoundary: 4.099001367791724,
      extremeBoundary: 12.9551796761639,
      weight: 1 / 3,
      freshnessDays: 75,
      rationale:
        "Uses annual change and frozen 1966–2025 percentile anchors. Historical M2 definition changes reduce comparability, and contraction stress is outside this one-sided component.",
    },
    {
      id: "consumer_price_inflation",
      label: "Consumer-price inflation",
      inputLabel: "CPI year-over-year change",
      ...inflationContract,
      transform: "linear_clamped",
      healthyBoundary: 1.9720237923649453,
      extremeBoundary: 10.497793251393505,
      weight: 1 / 3,
      freshnessDays: 75,
      rationale:
        "Uses annual CPI-U change and frozen 1966–2025 percentile anchors. It does not cover every household, asset prices, or deflation stress.",
    },
    {
      id: "federal_debt_burden",
      label: "Federal debt burden",
      inputLabel: "Federal debt as a share of GDP",
      ...debtContract,
      transform: "linear_clamped",
      healthyBoundary: 35.000358,
      extremeBoundary: 119.64705399999998,
      weight: 1 / 3,
      freshnessDays: 180,
      rationale:
        "Places gross federal debt against output using frozen 1966–2025 percentile anchors. Values at or above p95 saturate at 100.",
    },
  ],
  bands: [
    { minimum: 0, maximum: 19.9, label: "Lower" },
    { minimum: 20, maximum: 39.9, label: "Moderate" },
    { minimum: 40, maximum: 59.9, label: "Elevated" },
    { minimum: 60, maximum: 79.9, label: "High" },
    { minimum: 80, maximum: 100, label: "Extreme" },
  ],
  sensitivityScenarios: [
    {
      id: "equal",
      label: "Approved equal weights",
      weights: {
        monetary_expansion: 1 / 3,
        consumer_price_inflation: 1 / 3,
        federal_debt_burden: 1 / 3,
      },
    },
    {
      id: "monetary_emphasis",
      label: "Illustrative monetary emphasis",
      weights: {
        monetary_expansion: 0.45,
        consumer_price_inflation: 0.3,
        federal_debt_burden: 0.25,
      },
    },
    {
      id: "inflation_emphasis",
      label: "Illustrative inflation emphasis",
      weights: {
        monetary_expansion: 0.3,
        consumer_price_inflation: 0.45,
        federal_debt_burden: 0.25,
      },
    },
    {
      id: "fiscal_emphasis",
      label: "Illustrative fiscal emphasis",
      weights: {
        monetary_expansion: 0.25,
        consumer_price_inflation: 0.3,
        federal_debt_burden: 0.45,
      },
    },
  ],
  limitations: [
    "The equal weights and display bands are approved research policy choices, not empirically calibrated crisis thresholds.",
    "Three indicators cannot capture institutions, policy credibility, reserve demand, political conditions, or market structure.",
    "A similar score in two periods does not imply the same cause, path, timing, or outcome.",
    "Source series may be revised. A score must retain its model version, both observations for derived rates, and its as-of date.",
    "The score measures selected historical stress signals; it is not a probability and does not predict a currency death date.",
    "M2 and CPI use one-sided transforms, so monetary contraction and deflationary stress are outside the v1 score.",
    "The debt component clips at its historical p95 anchor, so higher ratios cannot add more than 100 component points.",
  ],
  changeHistory: [
    {
      version: "usd-stress-v1.0.0",
      date: "2026-09-02",
      summary:
        "Owner-approved three-component experimental index with a frozen 1966–2025 baseline and no time-to-failure countdown.",
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
  if (methodology.components.length !== dollarStressComponentIds.length) {
    throw new Error("Methodology must contain the exact approved component set.");
  }
  if (
    methodology.baselineVersion !== "usd-stress-baseline-2026-09-02" ||
    methodology.baselineWindow.startDate !== "1966-01-01" ||
    methodology.baselineWindow.endDate !== "2025-12-31" ||
    methodology.percentileMethod !== "r7_linear" ||
    methodology.lowerPercentile !== 0.2 ||
    methodology.upperPercentile !== 0.95
  ) {
    throw new Error("Methodology baseline contract mismatch.");
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
    if (
      (component.inputKind === "year_over_year_percent_change" && component.freshnessDays !== 75) ||
      (component.inputKind === "direct" && component.freshnessDays !== 180)
    ) {
      throw new Error(`Component ${component.id} violates its freshness contract.`);
    }
    weightTotal += component.weight;
  }

  if (dollarStressComponentIds.some((componentId) => !ids.has(componentId))) {
    throw new Error("Methodology must contain the exact approved component set.");
  }

  if (Math.abs(weightTotal - 1) > 1e-9) {
    throw new Error(`Component weights must sum to 1; received ${weightTotal}.`);
  }
  if (
    methodology.bands.length !== 5 ||
    methodology.bands[0]?.minimum !== 0 ||
    methodology.bands.at(-1)?.maximum !== 100
  ) {
    throw new Error("Methodology requires the approved 0–100 band register.");
  }
  if (methodology.sensitivityScenarios.length !== 4) {
    throw new Error("Methodology requires the approved sensitivity register.");
  }
  for (const scenario of methodology.sensitivityScenarios) {
    const total = dollarStressComponentIds.reduce(
      (sum, id) => sum + scenario.weights[id],
      0,
    );
    if (Math.abs(total - 1) > 1e-9) {
      throw new Error(`Sensitivity weights must sum to 1: ${scenario.id}.`);
    }
  }
}

export function getDollarStressBand(score: number, methodology = dollarStressMethodologyV1) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Dollar stress score must be between 0 and 100.");
  }
  const band = methodology.bands.find(
    (candidate) => score >= candidate.minimum && score <= candidate.maximum,
  );
  if (band === undefined) throw new Error(`No stress band configured for score ${score}.`);
  return band;
}

validateDollarStressMethodology(dollarStressMethodologyV1);
