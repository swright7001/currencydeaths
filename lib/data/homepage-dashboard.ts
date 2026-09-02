import {
  createCurrencyArchiveRecords,
  displayArchiveLabel,
} from "./currency-archive";
import {
  buildSnapshotDollarDashboard,
  formatUtcDate,
  type DollarDashboardModel,
} from "./dollar-dashboard";
import {
  buildLifespanResearch,
  createLifespanResearchRecords,
} from "./lifespan-research";
import {
  verifiedCurrencySeed,
  type VerifiedCurrencyDataset,
} from "./verified-currency-seed";
import type { ResearchDeliverySource } from "./research-repository";

export const homepageDeliveryStates = ["ready", "loading", "error", "stale"] as const;
export type HomepageDeliveryState = (typeof homepageDeliveryStates)[number];

export type HomepageComparisonRow = Readonly<{
  currency: string;
  period: string;
  evidence: "fixture" | "sourced" | "stale" | "unavailable";
  event: string;
  outcome: string;
  isDollar?: boolean;
}>;

function rangeLabel(range: Readonly<{ minimumYears: number; maximumYears: number }> | null) {
  if (range === null) return null;
  return range.minimumYears === range.maximumYears
    ? `${range.minimumYears} years`
    : `${range.minimumYears}–${range.maximumYears} years`;
}

function outcomeLabel(status: string, successor: string) {
  const relationship = status === "collapsed" ? "followed by" : "successor";
  return `${displayArchiveLabel(status)}; ${relationship}: ${successor}`;
}

function deliveryNotice(state: HomepageDeliveryState) {
  if (state === "loading") {
    return { role: "status" as const, title: "Research modules loading", detail: "The dashboard frame remains available while approved records are assembled." };
  }
  if (state === "error") {
    return { role: "alert" as const, title: "Research modules unavailable", detail: "No values are substituted. Use the linked archive and methodology pages while this view is unavailable." };
  }
  if (state === "stale") {
    return { role: "status" as const, title: "Research refresh due", detail: "Stored source-backed values remain labeled stale until their source records are refreshed." };
  }
  return null;
}

export function buildHomepageDashboard(
  deliveryState: HomepageDeliveryState = "ready",
  dataset: VerifiedCurrencyDataset = verifiedCurrencySeed,
  researchSource: ResearchDeliverySource = "repository",
  dollar: DollarDashboardModel = buildSnapshotDollarDashboard(),
) {
  const currencyArchiveRecords = createCurrencyArchiveRecords(dataset);
  const lifespan = buildLifespanResearch(
    createLifespanResearchRecords(currencyArchiveRecords),
  );
  const statusCounts = new Map<string, number>();
  for (const record of currencyArchiveRecords) {
    statusCounts.set(record.status, (statusCounts.get(record.status) ?? 0) + 1);
  }
  const sourceState = deliveryState === "stale" ? ("stale" as const) : ("sourced" as const);

  return {
    deliveryState,
    deliveryNotice: deliveryNotice(deliveryState),
    stress: {
      state: dollar.stress.score === null ? ("unavailable" as const) : ("sourced" as const),
      value: dollar.stress.score === null ? null : String(dollar.stress.score),
      band: dollar.stress.band,
      detail:
        dollar.stress.score === null
          ? "One or more required inputs failed the approved freshness or validation policy. No score is published."
          : `${dollar.stress.band} selected stress. Equal-weight composite of three source-verified components; not a failure probability.`,
      methodologyVersion: dollar.stress.methodologyVersion,
      baselineVersion: dollar.stress.baselineVersion,
      componentCount: dollar.stress.contributions.length,
      contributions: dollar.stress.contributions,
      sourceHref: "/methodology/dollar-stress-score",
    },
    lifespan: {
      state: sourceState,
      recordCount: lifespan.count,
      average: rangeLabel(lifespan.average),
      median: rangeLabel(lifespan.median),
      distribution: lifespan.distribution,
      crossBandCount: lifespan.crossBandCount,
      fixtureVersion: dataset.version,
      sourceHref: "/lifespan",
      disclosure: `${researchSource === "convex" ? "Convex-backed" : "Repository-backed"} limited five-record verified seed; not representative of all fiat currencies. Aggregates preserve date-precision ranges.`,
    },
    survival: {
      state: sourceState,
      total: currencyArchiveRecords.length,
      counts: ["collapsed", "replaced", "redenominated", "historical"].map((status) => ({
        label: displayArchiveLabel(status),
        value: statusCounts.get(status) ?? 0,
      })),
      sourceHref: "/deaths",
    },
    currencyCards: currencyArchiveRecords.map((currency) => ({
      name: currency.name,
      slug: currency.slug,
      country: currency.countryName,
      period: `${currency.startDate.year}—${currency.endDate.year}`,
      status: displayArchiveLabel(currency.status),
      cause: displayArchiveLabel(currency.primaryFailureCause),
      summary: currency.summary,
      evidence: sourceState,
    })),
    comparisonRows: [
      {
        currency: "U.S. dollar / current system",
        period: `Snapshot retrieved ${formatUtcDate(dollar.freshnessAsOf)}`,
        evidence: dollar.stress.score === null ? ("unavailable" as const) : ("sourced" as const),
        event:
          dollar.stress.score === null
            ? "Dollar Stress Index unavailable"
            : `${dollar.stress.score} / 100 · ${dollar.stress.band} selected stress`,
        outcome: "No outcome predicted",
        isDollar: true,
      },
      ...currencyArchiveRecords.slice(0, 4).map((currency) => ({
        currency: currency.name,
        period: `${currency.startDate.year}—${currency.endDate.year}`,
        evidence: sourceState,
        event: displayArchiveLabel(currency.primaryFailureCause),
        outcome: outcomeLabel(currency.status, currency.replacementCurrencyName),
      })),
    ] satisfies readonly HomepageComparisonRow[],
    provenance: {
      dollarDatasetVersion: dollar.datasetVersion,
      dollarAsOf: formatUtcDate(dollar.freshnessAsOf),
      currencySeedVersion: dataset.version,
      currencyDelivery: researchSource,
    },
  } as const;
}

export type HomepageDashboardModel = ReturnType<typeof buildHomepageDashboard>;
