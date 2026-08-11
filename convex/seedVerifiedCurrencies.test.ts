import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const version = "currency-research-v1" as const;

describe("verified currency seed mutation", () => {
  it("is idempotent and refuses rollback when unrelated data exists", async () => {
    const t = convexTest(schema, modules);
    const unrelatedCountryId = await t.mutation(internal.research.createCountry, {
      name: "Unrelated Republic",
      slug: "unrelated-republic",
      region: "europe",
    });

    expect(await t.mutation(internal.seedVerifiedCurrencies.apply, { version })).toMatchObject({
      inserted: { countries: 5, sources: 9, currencies: 5 },
      existing: { countries: 0, sources: 0, currencies: 0 },
    });
    expect(await t.mutation(internal.seedVerifiedCurrencies.apply, { version })).toMatchObject({
      inserted: { countries: 0, sources: 0, currencies: 0 },
      existing: { countries: 5, sources: 9, currencies: 5 },
    });

    const counts = await t.run(async (ctx) => ({
      currencies: (await ctx.db.query("currencies").take(20)).length,
      sources: (await ctx.db.query("sources").take(20)).length,
    }));
    expect(counts).toEqual({ currencies: 5, sources: 9 });

    const attachedEventId = await t.run(async (ctx) => {
      const currency = await ctx.db
        .query("currencies")
        .withIndex("by_slug", (q) => q.eq("slug", "german-papiermark"))
        .unique();
      if (currency === null) throw new Error("seed currency missing");
      return await ctx.db.insert("currencyEvents", {
        currencyId: currency._id,
        date: { year: 1923, precision: "year" },
        dateKey: 19_230_000,
        eventType: "other",
        title: "Unrelated follow-up research",
        description: "Proves rollback refuses dependent records.",
        sourceIds: [],
        recordState: "development_fixture",
        createdAt: 0,
        updatedAt: 0,
      });
    });

    await expect(
      t.mutation(internal.seedVerifiedCurrencies.remove, { version }),
    ).rejects.toThrow("isolated seed graph");
    expect(await t.run((ctx) => ctx.db.get(unrelatedCountryId))).not.toBeNull();

    await t.run((ctx) => ctx.db.delete(unrelatedCountryId));
    await expect(
      t.mutation(internal.seedVerifiedCurrencies.remove, { version }),
    ).rejects.toThrow("isolated seed graph");
    await t.run((ctx) => ctx.db.delete(attachedEventId));
    expect(await t.mutation(internal.seedVerifiedCurrencies.remove, { version })).toMatchObject({
      removed: { countries: 5, sources: 9, currencies: 5 },
    });
  });

  it("refuses to claim an existing non-seed unique key", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.research.createCountry, {
      name: "Existing Germany",
      slug: "germany",
      region: "europe",
    });
    await expect(
      t.mutation(internal.seedVerifiedCurrencies.apply, { version }),
    ).rejects.toThrow("unique key is owned by non-seed research data");
  });
});
