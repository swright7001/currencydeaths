import { buildFixtureDollarDashboard, formatHistoricalMonth } from "./dollar-dashboard";
import {
  currencyDetailSlugs,
  formatHistoricalDate,
  getCurrencyDetail,
  type CurrencyDetail,
} from "./currency-detail";

export type ComparisonMode = "direct" | "contextual" | "unavailable";

export type ComparisonSource = Readonly<{
  title: string;
  publisher: string;
  url: string;
}>;

export type ComparisonSide = Readonly<{
  value: string | null;
  unit: string;
  timeWindow: string;
  source: ComparisonSource | null;
  unavailableReason?: string;
}>;

export type ComparisonRow = Readonly<{
  key: string;
  label: string;
  mode: ComparisonMode;
  interpretation: string;
  usd: ComparisonSide;
  historical: ComparisonSide;
}>;

export type ComparisonQueryState = "default" | "selected" | "invalid";

const defaultCurrencySlug = "german-papiermark";

function sourceFromDetail(detail: CurrencyDetail): ComparisonSource {
  const source = detail.sources[0];
  if (source === undefined) throw new Error(`Comparison source missing: ${detail.slug}`);
  return { title: source.title, publisher: source.publisher, url: source.url };
}

function formatLifespan(minimum: number, maximum: number) {
  return minimum === maximum ? `${minimum} years` : `${minimum}–${maximum} years`;
}

function unavailable(reason: string, unit: string, timeWindow: string): ComparisonSide {
  return { value: null, unit, timeWindow, source: null, unavailableReason: reason };
}

export const comparisonCurrencyOptions = currencyDetailSlugs.map((slug) => {
  const detail = getCurrencyDetail(slug);
  if (detail === undefined) throw new Error(`Comparison option missing: ${slug}`);
  return { slug, name: detail.name, countryName: detail.countryName } as const;
});

export function resolveComparisonSelection(
  value: string | string[] | undefined,
): Readonly<{ slug: string; state: ComparisonQueryState }> {
  if (value === undefined || value === "") return { slug: defaultCurrencySlug, state: "default" };
  if (typeof value === "string" && currencyDetailSlugs.includes(value)) {
    return { slug: value, state: "selected" };
  }
  return { slug: defaultCurrencySlug, state: "invalid" };
}

export function buildCurrencyComparison(slug: string) {
  const historical = getCurrencyDetail(slug);
  if (historical === undefined) throw new Error(`Unknown comparison currency: ${slug}`);

  const dashboard = buildFixtureDollarDashboard();
  const dollarMetric = new Map(dashboard.metrics.map((metric) => [metric.key, metric]));
  const m2 = dollarMetric.get("m2")!;
  const cpi = dollarMetric.get("cpi")!;
  const debt = dollarMetric.get("federal_debt_to_gdp")!;
  const historicalSource = sourceFromDetail(historical);
  const historicalWindow = `${formatHistoricalDate(historical.startDate)}–${formatHistoricalDate(historical.endDate)}`;

  const rows: readonly ComparisonRow[] = [
    {
      key: "recorded-span",
      label: "Recorded lifespan",
      mode: "unavailable",
      interpretation: "The historical record has a bounded span. This release has not approved one equivalent start boundary for the modern U.S. dollar regime.",
      usd: unavailable(
        "No approved regime-start definition; an ongoing currency cannot be assigned a completed lifespan.",
        "years",
        "ongoing",
      ),
      historical: {
        value: formatLifespan(historical.lifespan.minimumYears, historical.lifespan.maximumYears),
        unit: "calendar years (derived range)",
        timeWindow: historicalWindow,
        source: historicalSource,
      },
    },
    {
      key: "monetary-expansion",
      label: "Monetary expansion",
      mode: "contextual",
      interpretation: "The USD side is a recent stock observation. The historical side is a sourced causal narrative, not a like-for-like money-supply series.",
      usd: {
        value: m2.displayValue,
        unit: m2.unitLabel,
        timeWindow: formatHistoricalMonth(m2.latest.observationDate),
        source: m2.source,
      },
      historical: {
        value: historical.causeClaim.statement,
        unit: "documented narrative",
        timeWindow: historicalWindow,
        source: historicalSource,
      },
    },
    {
      key: "inflation",
      label: "Inflation evidence",
      mode: "contextual",
      interpretation: "A current price index level and a historical inflation classification answer different questions; neither is normalized here.",
      usd: {
        value: cpi.displayValue,
        unit: cpi.unitLabel,
        timeWindow: formatHistoricalMonth(cpi.latest.observationDate),
        source: cpi.source,
      },
      historical: {
        value: historical.primaryFailureCause.replaceAll("_", " "),
        unit: "verified classification",
        timeWindow: historicalWindow,
        source: historicalSource,
      },
    },
    {
      key: "fiscal-stress",
      label: "Fiscal stress",
      mode: "unavailable",
      interpretation: "The USD fiscal ratio has no approved like-for-like historical series in the verified seed.",
      usd: {
        value: debt.displayValue,
        unit: debt.unitLabel,
        timeWindow: formatHistoricalMonth(debt.latest.observationDate),
        source: debt.source,
      },
      historical: unavailable(
        "No source-approved debt-to-GDP trajectory is stored for this case.",
        "% of GDP",
        historicalWindow,
      ),
    },
    {
      key: "purchasing-power",
      label: "Purchasing-power loss",
      mode: "unavailable",
      interpretation: "CPI levels are not silently converted into a purchasing-power-loss percentage, and the historical seed stores no comparable calculation.",
      usd: unavailable(
        "No approved baseline or purchasing-power transformation is configured.",
        "% loss",
        "baseline not approved",
      ),
      historical: unavailable(
        "No versioned purchasing-power calculation is stored for this case.",
        "% loss",
        historicalWindow,
      ),
    },
    {
      key: "confidence-context",
      label: "Confidence and political context",
      mode: "contextual",
      interpretation: "Narrative context is shown only on the side supported by the current research seed.",
      usd: unavailable(
        "No approved confidence or political-environment measure is in the dollar fixture.",
        "qualitative context",
        "current release",
      ),
      historical: {
        value: historical.historicalContext,
        unit: "documented narrative",
        timeWindow: historicalWindow,
        source: historicalSource,
      },
    },
    {
      key: "reserve-status",
      label: "Reserve-currency status",
      mode: "unavailable",
      interpretation: "Reserve status requires a sourced share series and historical definition; neither is inferred from reputation or outcome.",
      usd: unavailable(
        "Global reserve-share data is not yet in the approved dollar fixture.",
        "% of allocated reserves",
        "not stored",
      ),
      historical: unavailable(
        "No comparable reserve-status series is stored for this case.",
        "% of allocated reserves",
        historicalWindow,
      ),
    },
    {
      key: "outcome",
      label: "Recorded outcome",
      mode: "contextual",
      interpretation: "A historical transition is a recorded outcome. The active USD side is deliberately not assigned a predicted endpoint.",
      usd: {
        value: "No outcome predicted",
        unit: "interpretation boundary",
        timeWindow: "ongoing",
        source: null,
      },
      historical: {
        value: `${historical.status.replaceAll("_", " ")} → ${historical.replacementCurrencyName}`,
        unit: "verified classification and successor",
        timeWindow: formatHistoricalDate(historical.endDate),
        source: historicalSource,
      },
    },
  ];

  return {
    historical,
    fixtureVersion: dashboard.fixtureVersion,
    rows,
    counts: {
      direct: rows.filter((row) => row.mode === "direct").length,
      contextual: rows.filter((row) => row.mode === "contextual").length,
      unavailable: rows.filter((row) => row.mode === "unavailable").length,
    },
  } as const;
}
