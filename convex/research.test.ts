import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const sourceArgs = {
  title: "Development research source",
  publisher: "Fixture Publisher",
  url: "https://example.test/source",
  accessedAt: Date.UTC(2026, 7, 10),
  sourceType: "academic" as const,
};

describe("monetary-history storage contracts", () => {
  it("rejects duplicate slugs and missing references", async () => {
    const t = convexTest(schema, modules);
    const countryId = await t.mutation(internal.research.createCountry, {
      name: "Fixture Republic",
      slug: "fixture-republic",
      region: "europe",
    });

    await expect(
      t.mutation(internal.research.createCountry, {
        name: "Duplicate",
        slug: "fixture-republic",
        region: "europe",
      }),
    ).rejects.toThrow("country with this slug already exists");

    await expect(
      t.mutation(internal.research.createCurrency, {
        name: "Unsourced Fixture",
        slug: "unsourced-fixture",
        countryId,
        currencyType: "fiat",
        status: "historical",
        startDate: { year: 1900, precision: "year" },
        failureCauses: [],
        sourceIds: [],
        recordState: "verified",
      }),
    ).rejects.toThrow("Verified records require at least one source");

    const missingSourceId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("sources", {
        ...sourceArgs,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(internal.research.createCurrency, {
        name: "Missing Source Fixture",
        slug: "missing-source-fixture",
        countryId,
        currencyType: "fiat",
        status: "historical",
        startDate: { year: 1900, precision: "year" },
        failureCauses: [],
        sourceIds: [missingSourceId],
        recordState: "verified",
      }),
    ).rejects.toThrow("Referenced source does not exist");
  });

  it("returns provenance and preserves unavailable values as null", async () => {
    const t = convexTest(schema, modules);
    const sourceId = await t.mutation(internal.research.createSource, sourceArgs);
    const countryId = await t.mutation(internal.research.createCountry, {
      name: "Fixture Republic",
      slug: "fixture-republic",
      region: "europe",
    });
    const currencyId = await t.mutation(internal.research.createCurrency, {
      name: "Fixture Mark",
      slug: "fixture-mark",
      countryId,
      currencyType: "fiat",
      status: "historical",
      startDate: { year: 1900, precision: "year" },
      failureCauses: [],
      sourceIds: [sourceId],
      recordState: "development_fixture",
    });

    const currency = await t.query(api.research.getCurrencyBySlug, { slug: "fixture-mark" });
    expect(currency).toMatchObject({
      currency: {
        id: currencyId,
        endDate: null,
        primaryFailureCause: null,
        summary: null,
      },
      country: { id: countryId },
      sources: [{ id: sourceId, url: sourceArgs.url }],
    });

    expect(
      await t.query(api.research.getLatestCurrencyMetric, {
        currencyId,
        metric: "peak_inflation",
      }),
    ).toBeNull();

    await t.mutation(internal.research.createCurrencyMetric, {
      currencyId,
      metric: "peak_inflation",
      observationDate: "1923-11-01",
      value: 42,
      unit: "fixture_percent",
      sourceId,
      recordState: "development_fixture",
    });

    expect(
      await t.query(api.research.getLatestCurrencyMetric, {
        currencyId,
        metric: "peak_inflation",
      }),
    ).toMatchObject({
      value: 42,
      notes: null,
      source: { id: sourceId, url: sourceArgs.url },
    });

    expect(await t.query(api.research.getLatestDollarMetric, { metric: "m2" })).toBeNull();
    await t.mutation(internal.research.createDollarMetric, {
      metric: "m2",
      observationDate: "2026-07-01",
      value: 1,
      unit: "fixture_index",
      sourceId,
      recordState: "development_fixture",
    });
    expect(await t.query(api.research.getLatestDollarMetric, { metric: "m2" })).toMatchObject({
      value: 1,
      notes: null,
      source: { id: sourceId },
    });
  });
});
