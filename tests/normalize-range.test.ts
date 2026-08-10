import { describe, expect, it } from "vitest";

import { normalizeRange } from "../lib/calculations/normalize-range";

describe("normalizeRange", () => {
  it("maps values proportionally onto a 0–100 scale", () => {
    expect(normalizeRange(25, { minimum: 0, maximum: 100 })).toBe(25);
    expect(normalizeRange(15, { minimum: 10, maximum: 30 })).toBe(25);
  });

  it("clamps values outside the configured range", () => {
    expect(normalizeRange(-1, { minimum: 0, maximum: 10 })).toBe(0);
    expect(normalizeRange(11, { minimum: 0, maximum: 10 })).toBe(100);
  });

  it("rejects invalid or non-finite inputs", () => {
    expect(() =>
      normalizeRange(5, { minimum: 10, maximum: 10 }),
    ).toThrow(RangeError);
    expect(() =>
      normalizeRange(Number.NaN, { minimum: 0, maximum: 10 }),
    ).toThrow(TypeError);
  });
});
