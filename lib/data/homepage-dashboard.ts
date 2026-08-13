import { currencyArchiveRecords, displayArchiveLabel } from "./currency-archive";
import { buildFixtureDollarDashboard, formatUtcDate } from "./dollar-dashboard";
import { buildLifespanResearch, lifespanResearchRecords } from "./lifespan-research";
import { VERIFIED_CURRENCY_SEED_VERSION } from "./verified-currency-seed";

export const homepageDeliveryStates = ["ready", "loading", "error", "stale"] as const;
export type HomepageDeliveryState = (typeof homepageDeliveryStates)[number];

export type HomepageComparisonRow = Readonly<{
  currency: string;
  period: string;
  evidence: "fixture" | "sourced" | "unavailable";
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

export function buildHomepageDashboard(deliveryState: HomepageDeliveryState = "ready") {
  const dollar = buildFixtureDollarDashboard();
  const lifespan = buildLifespanResearch(lifespanResearchRecords);
  const statusCounts = new Map<string, number>();
  for (const record of currencyArchiveRecords) {
    statusCounts.set(record.status, (statusCounts.get(record.status) ?? 0) + 1);
  }
  const sourceState = deliveryState === "stale" ? ("stale" as const) : ("sourced" as const);

  return {
    deliveryState,
    deliveryNotice: deliveryNotice(deliveryState),
    clock: {
      state: "fixture" as const,
      units: [
        { label: "Years" as const, value: "08" },
        { label: "Months" as const, value: "04" },
        { label: "Days" as const, value: "17" },
        { label: "Hours" as const, value: "13" },
      ],
    },
    stress: {
      state: "unavailable" as const,
      value: dollar.stress.score === null ? null : String(dollar.stress.score),
      detail: `${dollar.stress.missingComponents.length} required methodology inputs are unavailable. No score is published.`,
      methodologyVersion: dollar.stress.methodologyVersion,
      sourceHref: "/methodology/dollar-stress-score",
    },
    lifespan: {
      state: sourceState,
      recordCount: lifespan.count,
      average: rangeLabel(lifespan.average),
      median: rangeLabel(lifespan.median),
      distribution: lifespan.distribution,
      crossBandCount: lifespan.crossBandCount,
      fixtureVersion: VERIFIED_CURRENCY_SEED_VERSION,
      sourceHref: "/lifespan",
      disclosure: "Limited five-record verified seed; not representative of all fiat currencies. Aggregates preserve date-precision ranges.",
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
    })),
    comparisonRows: [
      {
        currency: "U.S. dollar / current system",
        period: `Fixture accessed ${formatUtcDate(dollar.freshnessAsOf)}`,
        evidence: "unavailable" as const,
        event: "Comparable stress score unavailable",
        outcome: "No outcome predicted",
        isDollar: true,
      },
      ...currencyArchiveRecords.slice(0, 4).map((currency) => ({
        currency: currency.name,
        period: `${currency.startDate.year}—${currency.endDate.year}`,
        evidence: "sourced" as const,
        event: displayArchiveLabel(currency.primaryFailureCause),
        outcome: outcomeLabel(currency.status, currency.replacementCurrencyName),
      })),
    ] satisfies readonly HomepageComparisonRow[],
    provenance: {
      dollarFixtureVersion: dollar.fixtureVersion,
      dollarAsOf: formatUtcDate(dollar.freshnessAsOf),
      currencySeedVersion: VERIFIED_CURRENCY_SEED_VERSION,
    },
  } as const;
}

export type HomepageDashboardModel = ReturnType<typeof buildHomepageDashboard>;
