import { describe, expect, it, vi } from "vitest";
import {
  ResearchDataError,
  loadResearchCollection,
  loadResearchCurrency,
  parseConvexResearchCollection,
} from "../lib/data/research-repository";
import {
  verifiedCurrencySeed,
  type VerifiedSeedCurrency,
} from "../lib/data/verified-currency-seed";

const configuredUrl = "https://careful-research-123.convex.cloud";

function convexSource(sourceKey: string) {
  const source = verifiedCurrencySeed.sources.find((candidate) => candidate.key === sourceKey);
  if (source === undefined) throw new Error(`missing test source ${sourceKey}`);
  return {
    id: `source:${source.key}`,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    publicationDate: null,
    accessedAt: verifiedCurrencySeed.accessedAt,
    sourceType: source.sourceType,
  };
}

function convexRecord(slug: string) {
  const currency: VerifiedSeedCurrency | undefined = verifiedCurrencySeed.currencies.find(
    (candidate) => candidate.slug === slug,
  );
  if (currency === undefined) throw new Error(`missing test currency ${slug}`);
  const country = verifiedCurrencySeed.countries.find(
    (candidate) => candidate.slug === currency.countrySlug,
  );
  if (country === undefined) throw new Error(`missing test country ${currency.countrySlug}`);
  return {
    currency: {
      id: `currency:${currency.slug}`,
      name: currency.name,
      slug: currency.slug,
      symbol: currency.symbol ?? null,
      currencyType: currency.currencyType,
      status: currency.status,
      startDate: currency.startDate,
      endDate: currency.endDate,
      replacementCurrencyId: null,
      replacementCurrencyName: currency.replacementCurrencyName,
      primaryFailureCause: currency.primaryFailureCause,
      failureCauses: [...currency.failureCauses],
      summary: currency.summary,
      historicalContext: currency.historicalContext,
      recordState: "verified",
    },
    country: {
      id: `country:${country.slug}`,
      name: country.name,
      slug: country.slug,
      isoCode: country.isoCode,
      region: country.region,
    },
    sources: currency.sourceKeys.map(convexSource),
  };
}

function convexCollection() {
  return {
    version: verifiedCurrencySeed.version,
    records: verifiedCurrencySeed.currencies.map((currency) => convexRecord(currency.slug)),
  };
}

function fetcher(listValue: unknown, slugValue: unknown = null) {
  return {
    list: vi.fn(async () => listValue),
    bySlug: vi.fn(async () => slugValue),
  };
}

describe("server research repository", () => {
  it("uses the repository seed only when Convex is unconfigured", async () => {
    const transport = fetcher(convexCollection());
    const loaded = await loadResearchCollection({ convexUrl: "", fetcher: transport });

    expect(loaded.source).toBe("repository");
    expect(loaded.sourceLabel).toBe("Repository-backed verified seed");
    expect(loaded.dataset.currencies).toHaveLength(5);
    expect(transport.list).not.toHaveBeenCalled();
  });

  it("loads and validates the complete configured Convex seed with static parity", async () => {
    const transport = fetcher(convexCollection());
    const loaded = await loadResearchCollection({ convexUrl: configuredUrl, fetcher: transport });

    expect(loaded.source).toBe("convex");
    expect(loaded.dataset).toEqual(verifiedCurrencySeed);
    expect(transport.list).toHaveBeenCalledWith(configuredUrl);
  });

  it("loads one configured slug and preserves unknown-slug not-found behavior", async () => {
    const record = convexRecord("greek-drachma");
    const loaded = await loadResearchCurrency("greek-drachma", {
      convexUrl: configuredUrl,
      fetcher: fetcher(null, record),
    });
    expect(loaded?.source).toBe("convex");
    expect(loaded?.dataset.currencies.map((currency) => currency.slug)).toEqual([
      "greek-drachma",
    ]);

    expect(
      await loadResearchCurrency("not-in-the-seed", {
        convexUrl: configuredUrl,
        fetcher: fetcher(null, null),
      }),
    ).toBeNull();
  });

  it("fails closed when configured Convex omits a required verified currency", async () => {
    await expect(
      loadResearchCurrency("german-papiermark", {
        convexUrl: configuredUrl,
        fetcher: fetcher(null, null),
      }),
    ).rejects.toThrow("missing a required verified currency");
  });

  it("rejects a configured slug response for a different approved currency", async () => {
    await expect(
      loadResearchCurrency("german-papiermark", {
        convexUrl: configuredUrl,
        fetcher: fetcher(null, convexRecord("greek-drachma")),
      }),
    ).rejects.toThrow("does not match the requested slug");
  });

  it("rejects empty, malformed, unsupported, duplicate, and missing-source payloads", () => {
    expect(() =>
      parseConvexResearchCollection({ version: verifiedCurrencySeed.version, records: [] }),
    ).toThrow("empty verified seed");

    const unsupported = convexCollection();
    unsupported.records[0].currency.status = "destroyed" as never;
    expect(() => parseConvexResearchCollection(unsupported)).toThrow("currency status");

    const duplicate = convexCollection();
    duplicate.records[1] = duplicate.records[0];
    expect(() => parseConvexResearchCollection(duplicate)).toThrow();

    const missingSource = convexCollection();
    missingSource.records[0].sources = [];
    expect(() => parseConvexResearchCollection(missingSource)).toThrow("source relationships");

    expect(() => parseConvexResearchCollection({ version: 1, records: "invalid" })).toThrow(
      ResearchDataError,
    );
  });

  it("fails closed after configured query errors instead of using repository data", async () => {
    const transport = {
      list: vi.fn(async () => {
        throw new Error("sensitive provider detail");
      }),
      bySlug: vi.fn(async () => null),
    };

    await expect(
      loadResearchCollection({ convexUrl: configuredUrl, fetcher: transport }),
    ).rejects.toMatchObject({
      name: "ResearchDataError",
      message: "The configured research source could not be loaded; no repository fallback was used.",
    });
  });
});
