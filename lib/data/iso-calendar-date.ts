const isoCalendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertIsoCalendarDate(value: string, label: string) {
  const match = isoCalendarDatePattern.exec(value);
  if (match === null) throw new Error(`${label} must use YYYY-MM-DD.`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a real calendar date.`);
  }
}

export function isOneYearApart(prior: string, current: string) {
  assertIsoCalendarDate(prior, "Prior observation date");
  assertIsoCalendarDate(current, "Current observation date");
  const [priorYear, priorMonth, priorDay] = prior.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = current.split("-").map(Number);
  return (
    currentYear === priorYear + 1 &&
    currentMonth === priorMonth &&
    currentDay === priorDay
  );
}
