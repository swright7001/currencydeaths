export type NumericRange = Readonly<{
  minimum: number;
  maximum: number;
}>;

/**
 * Normalizes a finite value onto a 0–100 scale and clamps outliers.
 *
 * The caller owns the meaning and provenance of the range. This helper only
 * performs deterministic arithmetic; it does not assign risk semantics.
 */
export function normalizeRange(value: number, range: NumericRange): number {
  if (![value, range.minimum, range.maximum].every(Number.isFinite)) {
    throw new TypeError("Value and range bounds must be finite numbers.");
  }

  if (range.maximum <= range.minimum) {
    throw new RangeError("Range maximum must be greater than its minimum.");
  }

  const normalized =
    ((value - range.minimum) / (range.maximum - range.minimum)) * 100;

  return Math.min(100, Math.max(0, normalized));
}
