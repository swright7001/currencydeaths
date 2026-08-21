import { buildFixtureDollarDashboard, formatHistoricalMonth } from "./dollar-dashboard";
import {
  formatHistoricalDate,
  getCurrencyDetailFromDataset,
} from "./currency-detail";
import {
  verifiedCurrencySeed,
  type VerifiedCurrencyDataset,
} from "./verified-currency-seed";

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
  sources: readonly ComparisonSource[];
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

function comparisonSources(
  sources: readonly ComparisonSource[],
): readonly ComparisonSource[] {
  const uniqueByUrl = new Map<string, ComparisonSource>();
  for (const source of sources) {
    uniqueByUrl.set(source.url, {
      title: source.title,
      publisher: source.publisher,
      url: source.url,
    });
  }
  return [...uniqueByUrl.values()];
}

function formatLifespan(minimum: number, maximum: number) {
  return minimum === maximum ? `${minimum} years` : `${minimum}–${maximum} years`;
}

function unavailable(reason: string, unit: string, timeWindow: string): ComparisonSide {
  return { value: null, unit, timeWindow, sources: [], unavailableReason: reason };
}

export type ComparisonCurrencyOption = Readonly<{
  slug: string;
  name: string;
  countryName: string;
}>;

export function createComparisonCurrencyOptions(
  dataset: VerifiedCurrencyDataset,
): readonly ComparisonCurrencyOption[] {
  return dataset.currencies.map(({ slug }) => {
    const detail = getCurrencyDetailFromDataset(dataset, slug);
    if (detail === undefined) throw new Error(`Comparison option missing: ${slug}`);
    return { slug, name: detail.name, countryName: detail.countryName } as const;
  });
}

export const comparisonCurrencyOptions = createComparisonCurrencyOptions(verifiedCurrencySeed);

export function resolveComparisonSelection(
  value: string | string[] | undefined,
  options: readonly ComparisonCurrencyOption[] = comparisonCurrencyOptions,
): Readonly<{ slug: string; state: ComparisonQueryState }> {
  const slugs = options.map((option) => option.slug);
  const fallbackSlug = slugs.includes(defaultCurrencySlug) ? defaultCurrencySlug : slugs[0];
  if (fallbackSlug === undefined) throw new Error("Comparison set is empty.");
  if (value === undefined || value === "") return { slug: fallbackSlug, state: "default" };
  if (typeof value === "string" && slugs.includes(value)) {
    return { slug: value, state: "selected" };
  }
  return { slug: fallbackSlug, state: "invalid" };
}

export function buildCurrencyComparison(
  slug: string,
  dataset: VerifiedCurrencyDataset = verifiedCurrencySeed,
) {
  const historical = getCurrencyDetailFromDataset(dataset, slug);
  if (historical === undefined) throw new Error(`Unknown comparison currency: ${slug}`);

  const dashboard = buildFixtureDollarDashboard();
  const dollarMetric = new Map(dashboard.metrics.map((metric) => [metric.key, metric]));
  const m2 = dollarMetric.get("m2")!;
  const cpi = dollarMetric.get("cpi")!;
  const debt = dollarMetric.get("federal_debt_to_gdp")!;
  const startClaim = historical.claims.find((claim) => claim.field === "startDate");
  const endClaim = historical.claims.find((claim) => claim.field.startsWith("endDate"));
  if (startClaim === undefined || endClaim === undefined) {
    throw new Error(`Comparison date claims missing: ${historical.slug}`);
  }
  const lifespanSources = comparisonSources([...startClaim.sources, ...endClaim.sources]);
  const causeSources = comparisonSources(historical.causeClaim.sources);
  const contextSources = comparisonSources(historical.sources);
  const outcomeSources = comparisonSources(endClaim.sources);
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
        sources: lifespanSources,
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
        sources: [m2.source],
      },
      historical: {
        value: historical.causeClaim.statement,
        unit: "documented narrative",
        timeWindow: historicalWindow,
        sources: causeSources,
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
        sources: [cpi.source],
      },
      historical: {
        value: historical.primaryFailureCause.replaceAll("_", " "),
        unit: "verified classification",
        timeWindow: historicalWindow,
        sources: causeSources,
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
        sources: [debt.source],
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
        sources: contextSources,
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
        sources: [],
      },
      historical: {
        value: `${historical.status.replaceAll("_", " ")} → ${historical.replacementCurrencyName}`,
        unit: "verified classification and successor",
        timeWindow: formatHistoricalDate(historical.endDate),
        sources: outcomeSources,
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
