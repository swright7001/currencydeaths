import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const version = "currency-research-v1" as const;

describe("verified currency seed mutation", () => {
  it("is idempotent and removable without touching unrelated data", async () => {
    const t = convexTest(schema, modules);
    const unrelatedCountryId = await t.mutation(internal.research.createCountry, {
      name: "Unrelated Republic",
      slug: "unrelated-republic",
      region: "europe",
    });

    expect(await t.mutation(internal.seedVerifiedCurrencies.apply, { version })).toMatchObject({
      inserted: { countries: 5, sources: 8, currencies: 5 },
      existing: { countries: 0, sources: 0, currencies: 0 },
    });
    expect(await t.mutation(internal.seedVerifiedCurrencies.apply, { version })).toMatchObject({
      inserted: { countries: 0, sources: 0, currencies: 0 },
      existing: { countries: 5, sources: 8, currencies: 5 },
    });

    const counts = await t.run(async (ctx) => ({
      currencies: (await ctx.db.query("currencies").take(20)).length,
      sources: (await ctx.db.query("sources").take(20)).length,
    }));
    expect(counts).toEqual({ currencies: 5, sources: 8 });

    expect(await t.mutation(internal.seedVerifiedCurrencies.remove, { version })).toMatchObject({
      removed: { countries: 5, sources: 8, currencies: 5 },
    });
    expect(await t.run((ctx) => ctx.db.get(unrelatedCountryId))).not.toBeNull();
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
