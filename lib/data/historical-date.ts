export type HistoricalDatePrecision = "year" | "month" | "day";

export type HistoricalDate = Readonly<{
  year: number;
  month?: number;
  day?: number;
  precision: HistoricalDatePrecision;
}>;

export type HistoricalDateBounds = Readonly<{
  earliestKey: number;
  latestKey: number;
}>;

function isIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function historicalDateToKey(date: HistoricalDate): number {
  if (!isIntegerInRange(date.year, 1, 9999)) {
    throw new Error("Historical year must be an integer from 1 through 9999.");
  }

  if (date.precision === "year") {
    if (date.month !== undefined || date.day !== undefined) {
      throw new Error("Year-precision dates cannot include a month or day.");
    }

    return date.year * 10_000;
  }

  if (date.month === undefined || !isIntegerInRange(date.month, 1, 12)) {
    throw new Error("Month- and day-precision dates require a valid month.");
  }

  if (date.precision === "month") {
    if (date.day !== undefined) {
      throw new Error("Month-precision dates cannot include a day.");
    }

    return date.year * 10_000 + date.month * 100;
  }

  if (date.day === undefined || !isIntegerInRange(date.day, 1, 31)) {
    throw new Error("Day-precision dates require a valid day.");
  }

  const candidate = new Date(0);
  candidate.setUTCHours(0, 0, 0, 0);
  candidate.setUTCFullYear(date.year, date.month - 1, date.day);
  if (
    candidate.getUTCFullYear() !== date.year ||
    candidate.getUTCMonth() !== date.month - 1 ||
    candidate.getUTCDate() !== date.day
  ) {
    throw new Error("Historical date is not a valid calendar date.");
  }

  return date.year * 10_000 + date.month * 100 + date.day;
}

export function historicalDateToBounds(date: HistoricalDate): HistoricalDateBounds {
  historicalDateToKey(date);

  if (date.precision === "year") {
    return {
      earliestKey: date.year * 10_000 + 101,
      latestKey: date.year * 10_000 + 1231,
    };
  }

  if (date.precision === "month") {
    const month = date.month!;
    const finalDay = new Date(Date.UTC(date.year, month, 0)).getUTCDate();
    return {
      earliestKey: date.year * 10_000 + month * 100 + 1,
      latestKey: date.year * 10_000 + month * 100 + finalDay,
    };
  }

  const exactKey = date.year * 10_000 + date.month! * 100 + date.day!;
  return { earliestKey: exactKey, latestKey: exactKey };
}
