export const DOLLAR_STRESS_HORIZON_VERSION = "usd-stress-horizon-v1.0.0";
export const DOLLAR_STRESS_HORIZON_THRESHOLD = 80;

export const dollarStressHorizonScenarioIds = [
  "current_trajectory",
  "fiscal_acceleration",
  "stabilization",
] as const;

export type DollarStressHorizonScenarioId =
  (typeof dollarStressHorizonScenarioIds)[number];

export type DollarStressHorizonScenario = Readonly<{
  id: DollarStressHorizonScenarioId;
  label: string;
  midpoint: Readonly<{ years: number; months: number; days: 0 }> | null;
  range: Readonly<{ minimumYears: number; maximumYears: number }> | null;
  summary: string;
}>;

export const dollarStressHorizonScenarios = [
  {
    id: "current_trajectory",
    label: "Current trajectory",
    midpoint: { years: 11, months: 2, days: 0 },
    range: { minimumYears: 8, maximumYears: 14 },
    summary:
      "Approved current-trajectory policy scenario—not a predicted currency death date.",
  },
  {
    id: "fiscal_acceleration",
    label: "Fiscal acceleration",
    midpoint: { years: 6, months: 1, days: 0 },
    range: { minimumYears: 4, maximumYears: 8 },
    summary:
      "Approved faster fiscal-stress policy scenario—not a predicted currency death date.",
  },
  {
    id: "stabilization",
    label: "Stabilization",
    midpoint: null,
    range: null,
    summary:
      "This policy scenario does not publish a finite threshold-crossing horizon.",
  },
] as const satisfies readonly DollarStressHorizonScenario[];

const bandExplanations: Readonly<Record<string, string>> = {
  Lower: "the lowest of the five display bands",
  Moderate: "above the lower band and below elevated, high, and extreme",
  Elevated: "above calmer conditions but below high and extreme",
  High: "the second-highest display band, below extreme",
  Extreme: "the highest of the five display bands",
};

export function explainDollarStressReading(score: number, band: string) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Dollar Stress Index score must be between 0 and 100.");
  }
  const bandMeaning = bandExplanations[band];
  if (bandMeaning === undefined) {
    throw new Error(`Unsupported Dollar Stress Index band: ${band}.`);
  }
  return `${score.toFixed(1)} means ${band.toLowerCase()} pressure across money growth, consumer prices, and federal debt—${bandMeaning}. It is not a ${score.toFixed(1)}% chance that the dollar fails.`;
}

export function buildDollarStressHorizon(
  score: number | null,
  band: string | null,
) {
  if (score === null || band === null) {
    return {
      status: "unavailable" as const,
      version: DOLLAR_STRESS_HORIZON_VERSION,
      threshold: DOLLAR_STRESS_HORIZON_THRESHOLD,
      scenarios: [] as readonly DollarStressHorizonScenario[],
      plainLanguage: null,
    };
  }

  return {
    status: "illustrative" as const,
    version: DOLLAR_STRESS_HORIZON_VERSION,
    threshold: DOLLAR_STRESS_HORIZON_THRESHOLD,
    scenarios: dollarStressHorizonScenarios,
    plainLanguage: explainDollarStressReading(score, band),
  };
}
