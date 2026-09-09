import { describe, expect, it } from "vitest";
import { buildDissolutionCurrencies } from "../lib/data/dissolution-currencies";
import { verifiedCurrencySeed } from "../lib/data/verified-currency-seed";
import { currencyArtwork } from "../lib/data/currency-artwork";

describe("archive-driven exhibit choices", () => {
  it("preserves dataset order and context without inventing a separate currency list", () => {
    const dataset = { ...verifiedCurrencySeed, currencies: [...verifiedCurrencySeed.currencies].reverse() };
    const choices = buildDissolutionCurrencies(dataset);
    expect(choices.map((choice) => choice.slug)).toEqual(dataset.currencies.map((currency) => currency.slug));
    for (const choice of choices) {
      expect(choice.summary).toBe(dataset.currencies.find((currency) => currency.slug === choice.slug)?.summary);
      expect(currencyArtwork[choice.slug]?.source).toMatch(/^https:\/\/commons.wikimedia.org\//);
    }
  });
  it("distinguishes euro replacement from inflation illustrations", () => {
    const choices = buildDissolutionCurrencies(verifiedCurrencySeed);
    expect(choices.filter((choice) => choice.isCurrencyUnion).map((choice) => choice.slug)).toEqual(["greek-drachma"]);
    expect(buildDissolutionCurrencies({ ...verifiedCurrencySeed, currencies: [] })).toEqual([]);
  });
});
