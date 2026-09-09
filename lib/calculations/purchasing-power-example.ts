/** An illustrative 100-unit basket, not a currency or historical series. */
export function purchasingPowerExample(loss: number) {
  const percentageLost = Number.isFinite(loss) ? Math.min(100, Math.max(0, loss)) : 0;
  return { percentageLost, unitsRemaining: 100 - percentageLost };
}
