import { describe, expect, it } from "vitest";
import { purchasingPowerExample } from "../lib/calculations/purchasing-power-example";

describe("illustrative purchasing power", () => {
  it("preserves the full basket and reaches zero at complete loss", () => {
    expect(purchasingPowerExample(0).unitsRemaining).toBe(100);
    expect(purchasingPowerExample(100).unitsRemaining).toBe(0);
    expect(purchasingPowerExample(35).unitsRemaining).toBe(65);
  });
  it("bounds loss and treats non-finite input as the intact starting state", () => {
    expect(purchasingPowerExample(-5).percentageLost).toBe(0);
    expect(purchasingPowerExample(110).percentageLost).toBe(100);
    expect(purchasingPowerExample(NaN).unitsRemaining).toBe(100);
  });
});
