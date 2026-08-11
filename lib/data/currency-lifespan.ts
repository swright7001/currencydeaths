import { historicalDateToBounds, type HistoricalDate } from "./historical-date";

export type CurrencyLifecycleStatus =
  | "active"
  | "dead"
  | "replaced"
  | "redenominated"
  | "collapsed"
  | "historical";

export type CurrencyLifespanRange = Readonly<{
  minimumYears: number;
  maximumYears: number;
  basis: "closed" | "as_of";
}>;

function keyToUtcDate(key: number) {
  const year = Math.floor(key / 10_000);
  const month = Math.floor((key % 10_000) / 100);
  const day = key % 100;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function completedYears(startKey: number, endKey: number) {
  const start = keyToUtcDate(startKey);
  const end = keyToUtcDate(endKey);
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  const beforeAnniversary =
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

export function currencyLifespanRange(args: {
  startDate: HistoricalDate;
  endDate?: HistoricalDate;
  status: CurrencyLifecycleStatus;
  asOfDate?: HistoricalDate;
}): CurrencyLifespanRange | null {
  const useAsOf = args.endDate === undefined && args.status === "active";
  const effectiveEnd = args.endDate ?? (useAsOf ? args.asOfDate : undefined);
  if (effectiveEnd === undefined) return null;

  const start = historicalDateToBounds(args.startDate);
  const end = historicalDateToBounds(effectiveEnd);
  if (end.latestKey < start.earliestKey) {
    throw new Error("Currency lifespan end cannot precede its start.");
  }

  return {
    minimumYears: completedYears(start.latestKey, end.earliestKey),
    maximumYears: completedYears(start.earliestKey, end.latestKey),
    basis: useAsOf ? "as_of" : "closed",
  };
}
