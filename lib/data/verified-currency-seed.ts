import type { HistoricalDate } from "./historical-date";

export const VERIFIED_CURRENCY_SEED_VERSION = "currency-research-v1" as const;
export const VERIFIED_CURRENCY_SEED_ACCESSED_AT = Date.UTC(2026, 7, 11);

export type VerifiedSeedSource = Readonly<{
  key: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: "central_bank" | "international_institution" | "academic";
}>;

export type VerifiedSeedCountry = Readonly<{
  name: string;
  slug: string;
  isoCode: string;
  region: "africa" | "asia" | "europe" | "middle_east" | "north_america" | "oceania" | "south_america" | "global" | "other";
}>;

export type VerifiedSeedClaim = Readonly<{
  field: string;
  statement: string;
  sourceKeys: readonly string[];
  ambiguity?: string;
}>;

export type VerifiedSeedCurrency = Readonly<{
  name: string;
  slug: string;
  countrySlug: string;
  symbol?: string;
  currencyType: "fiat" | "commodity_backed" | "other";
  status: "replaced" | "redenominated" | "collapsed";
  startDate: HistoricalDate;
  endDate: HistoricalDate;
  replacementCurrencyName: string;
  primaryFailureCause: "hyperinflation" | "currency_union";
  failureCauses: readonly (
    | "hyperinflation"
    | "war"
    | "currency_union"
    | "redenomination"
    | "monetary_reform"
    | "loss_of_confidence"
    | "replacement"
  )[];
  summary: string;
  historicalContext: string;
  sourceKeys: readonly string[];
  claims: readonly VerifiedSeedClaim[];
}>;

export type VerifiedCurrencyDataset = Readonly<{
  version: string;
  accessedAt: number;
  countries: readonly VerifiedSeedCountry[];
  sources: readonly VerifiedSeedSource[];
  currencies: readonly VerifiedSeedCurrency[];
}>;

export const verifiedCurrencySeed = {
  version: VERIFIED_CURRENCY_SEED_VERSION,
  accessedAt: VERIFIED_CURRENCY_SEED_ACCESSED_AT,
  countries: [
    { name: "Germany", slug: "germany", isoCode: "DE", region: "europe" },
    { name: "Hungary", slug: "hungary", isoCode: "HU", region: "europe" },
    { name: "Zimbabwe", slug: "zimbabwe", isoCode: "ZW", region: "africa" },
    { name: "Venezuela", slug: "venezuela", isoCode: "VE", region: "south_america" },
    { name: "Greece", slug: "greece", isoCode: "GR", region: "europe" },
  ] as const,
  sources: [
    {
      key: "bundesbank-inflation-history",
      title: "Inflation – lessons learnt from history",
      publisher: "Deutsche Bundesbank",
      url: "https://www.bundesbank.de/en/tasks/topics/inflation-lessons-learnt-from-history-666006",
      sourceType: "central_bank",
    },
    {
      key: "bundesbank-purchasing-power",
      title: "Purchasing power comparisons of historical amounts of money",
      publisher: "Deutsche Bundesbank",
      url: "https://www.bundesbank.de/en/statistics/economic-activity-and-prices/national-producer-and-consumer-prices/purchasing-power-comparisons-of-historical-amounts-of-money-795290",
      sourceType: "central_bank",
    },
    {
      key: "mnb-history",
      title: "History",
      publisher: "Magyar Nemzeti Bank",
      url: "https://www.mnb.hu/en/the-central-bank/organisation/history",
      sourceType: "central_bank",
    },
    {
      key: "mnb-pengo-introduction",
      title: "Resources in the Service of the Nation",
      publisher: "Magyar Nemzeti Bank",
      url: "https://en-hitelintezetiszemle.mnb.hu/letoltes/tamas-fulop.pdf",
      sourceType: "academic",
    },
    {
      key: "imf-zimbabwe-history",
      title: "Zimbabwe: Selected Issues, A Brief Monetary History of Zimbabwe",
      publisher: "International Monetary Fund",
      url: "https://www.elibrary.imf.org/view/journals/002/2020/082/article-A004-en.xml",
      sourceType: "international_institution",
    },
    {
      key: "imf-zimbabwe-policy-options",
      title: "Zimbabwe: Challenges and Policy Options after Hyperinflation",
      publisher: "International Monetary Fund",
      url: "https://www.imf.org/external/pubs/ft/dp/2010/afr1003.pdf",
      sourceType: "international_institution",
    },
    {
      key: "imf-venezuela-redenomination",
      title: "Recognizing Reality: Unification of Official and Parallel Market Exchange Rates",
      publisher: "International Monetary Fund",
      url: "https://www.elibrary.imf.org/abstract/journals/001/2021/025/article-A001-en.xml",
      sourceType: "international_institution",
    },
    {
      key: "imf-venezuela-exchange-metadata",
      title: "Metadata: Exchange Rate Database Country Notes",
      publisher: "International Monetary Fund",
      url: "https://data.imf.org/-/media/iData/External-Storage/Documents/7F74AA6D71D2438285DBAC19451D7F7C/en/Metadata-Exchange-Rate-database_Country-notes.pdf",
      sourceType: "international_institution",
    },
    {
      key: "bog-drachma",
      title: "Drachma",
      publisher: "Bank of Greece",
      url: "https://www.bankofgreece.gr/en/the-bank/history/drachma",
      sourceType: "central_bank",
    },
  ] as const satisfies readonly VerifiedSeedSource[],
  currencies: [
    {
      name: "German paper mark (Papiermark)",
      slug: "german-papiermark",
      countrySlug: "germany",
      currencyType: "fiat",
      status: "replaced",
      startDate: { year: 1914, month: 7, day: 31, precision: "day" },
      endDate: { year: 1923, month: 11, precision: "month" },
      replacementCurrencyName: "Rentenmark (stabilization), then Reichsmark",
      primaryFailureCause: "hyperinflation",
      failureCauses: ["war", "hyperinflation", "monetary_reform", "replacement"],
      summary: "Germany's wartime paper-mark regime culminated in the 1923 hyperinflation and was stabilized through currency reform.",
      historicalContext: "The suspension of gold convertibility in 1914 preceded wartime monetary expansion; the Rentenmark stabilized the unit in November 1923, while the Reichsmark became the official successor in 1924.",
      sourceKeys: ["bundesbank-inflation-history", "bundesbank-purchasing-power"],
      claims: [
        { field: "startDate", statement: "Gold convertibility of Mark notes was suspended on 31 July 1914.", sourceKeys: ["bundesbank-purchasing-power"], ambiguity: "The record begins with the paper regime, not the earlier gold-backed Mark." },
        { field: "endDate/status/replacement", statement: "Currency reform replaced the Mark with the Rentenmark in November 1923; the Reichsmark followed as official currency in 1924.", sourceKeys: ["bundesbank-inflation-history", "bundesbank-purchasing-power"] },
        { field: "primaryFailureCause", statement: "The regime culminated in hyperinflation in 1923.", sourceKeys: ["bundesbank-inflation-history"] },
      ],
    },
    {
      name: "Hungarian pengő",
      slug: "hungarian-pengo",
      countrySlug: "hungary",
      currencyType: "fiat",
      status: "replaced",
      startDate: { year: 1927, month: 1, day: 1, precision: "day" },
      endDate: { year: 1946, month: 8, day: 1, precision: "day" },
      replacementCurrencyName: "Hungarian forint",
      primaryFailureCause: "hyperinflation",
      failureCauses: ["war", "hyperinflation", "monetary_reform", "replacement"],
      summary: "The pengő was introduced as a stabilized currency in 1927 and replaced by the forint after the postwar hyperinflation.",
      historicalContext: "The National Bank of Hungary describes the pengő's post-Second World War loss of value as the largest depreciation in history and records the forint's introduction on 1 August 1946.",
      sourceKeys: ["mnb-history", "mnb-pengo-introduction"],
      claims: [
        { field: "startDate", statement: "The pengő became Hungary's official currency on 1 January 1927.", sourceKeys: ["mnb-pengo-introduction"] },
        { field: "endDate/status/replacement", statement: "The forint replaced the pengő on 1 August 1946.", sourceKeys: ["mnb-history"] },
        { field: "primaryFailureCause", statement: "The pengő suffered extreme postwar inflation and loss of value.", sourceKeys: ["mnb-history"] },
      ],
    },
    {
      name: "Zimbabwe dollar (1980–2009 regime)",
      slug: "zimbabwe-dollar-1980",
      countrySlug: "zimbabwe",
      symbol: "Z$",
      currencyType: "fiat",
      status: "collapsed",
      startDate: { year: 1980, precision: "year" },
      endDate: { year: 2009, month: 2, precision: "month" },
      replacementCurrencyName: "Multicurrency system, principally the U.S. dollar",
      primaryFailureCause: "hyperinflation",
      failureCauses: ["hyperinflation", "loss_of_confidence", "monetary_reform", "replacement"],
      summary: "Zimbabwe's post-independence dollar regime ended in hyperinflation and was abandoned for a multicurrency system in early 2009.",
      historicalContext: "This record groups the 1980 dollar and its successive redenominations as one monetary regime; it does not treat each redenomination as a separate long-lived currency.",
      sourceKeys: ["imf-zimbabwe-history", "imf-zimbabwe-policy-options"],
      claims: [
        { field: "startDate", statement: "At independence in 1980, the currency was renamed the Zimbabwe dollar.", sourceKeys: ["imf-zimbabwe-history"], ambiguity: "The IMF passage establishes the year but not a precise introduction day." },
        { field: "endDate/status/replacement", statement: "Zimbabwe abandoned its domestic currency and officially recognized a multicurrency system in February 2009.", sourceKeys: ["imf-zimbabwe-history", "imf-zimbabwe-policy-options"], ambiguity: "The IMF distinguishes the earlier de facto abandonment from official recognition in February; the record uses the official transition at month precision." },
        { field: "primaryFailureCause", statement: "Monetary financing and economic decline culminated in hyperinflation.", sourceKeys: ["imf-zimbabwe-history"] },
      ],
    },
    {
      name: "Venezuelan bolívar fuerte",
      slug: "venezuelan-bolivar-fuerte",
      countrySlug: "venezuela",
      symbol: "Bs.F",
      currencyType: "fiat",
      status: "redenominated",
      startDate: { year: 2008, month: 1, day: 1, precision: "day" },
      endDate: { year: 2018, month: 8, day: 20, precision: "day" },
      replacementCurrencyName: "Bolívar soberano",
      primaryFailureCause: "hyperinflation",
      failureCauses: ["hyperinflation", "redenomination", "monetary_reform", "replacement"],
      summary: "The bolívar fuerte was introduced in 2008 and redenominated into the bolívar soberano in 2018 amid hyperinflation.",
      historicalContext: "The 2018 conversion removed five zeros: 100,000 bolívares fuertes became one bolívar soberano.",
      sourceKeys: ["imf-venezuela-redenomination", "imf-venezuela-exchange-metadata"],
      claims: [
        { field: "startDate", statement: "The bolívar fuerte was introduced on 1 January 2008 at 1,000 old bolívares to one new unit.", sourceKeys: ["imf-venezuela-exchange-metadata"] },
        { field: "endDate/status/replacement", statement: "On 20 August 2018 it was replaced by the bolívar soberano at 100,000 to one.", sourceKeys: ["imf-venezuela-redenomination", "imf-venezuela-exchange-metadata"] },
        { field: "primaryFailureCause", statement: "Hyperinflation was a primary reason for the redenomination.", sourceKeys: ["imf-venezuela-redenomination"] },
      ],
    },
    {
      name: "Greek drachma",
      slug: "greek-drachma",
      countrySlug: "greece",
      symbol: "₯",
      currencyType: "other",
      status: "replaced",
      startDate: { year: 1833, precision: "year" },
      endDate: { year: 2002, month: 2, day: 28, precision: "day" },
      replacementCurrencyName: "Euro",
      primaryFailureCause: "currency_union",
      failureCauses: ["currency_union", "replacement"],
      summary: "Greece's drachma was replaced by euro cash after Greece joined the euro area; this is a currency-union transition, not a collapse classification.",
      historicalContext: "The drachma changed monetary standards across its long history. The record preserves the national-currency span while avoiding the claim that one unchanged fiat regime operated continuously from 1833.",
      sourceKeys: ["bog-drachma"],
      claims: [
        { field: "startDate", statement: "The drachma was Greece's national currency from 1833.", sourceKeys: ["bog-drachma"], ambiguity: "Only year precision is asserted for the full national-currency record." },
        { field: "endDate/status/replacement", statement: "The transition completed on 28 February 2002, when drachma cash ceased legal tender and euro cash replaced it.", sourceKeys: ["bog-drachma"] },
        { field: "primaryFailureCause", statement: "The replacement was a euro-area currency-union transition, not a collapse.", sourceKeys: ["bog-drachma"] },
      ],
    },
  ] as const satisfies readonly VerifiedSeedCurrency[],
} as const satisfies VerifiedCurrencyDataset;

export function assertVerifiedCurrencySeedIntegrity() {
  const sourceKeys = new Set(verifiedCurrencySeed.sources.map((source) => source.key));
  const countrySlugs = new Set(verifiedCurrencySeed.countries.map((country) => country.slug));
  const currencySlugs = new Set<string>();

  for (const currency of verifiedCurrencySeed.currencies) {
    if (currencySlugs.has(currency.slug)) throw new Error(`Duplicate currency slug: ${currency.slug}`);
    currencySlugs.add(currency.slug);
    if (!countrySlugs.has(currency.countrySlug)) throw new Error(`Unknown country: ${currency.countrySlug}`);
    if (!(currency.failureCauses as readonly string[]).includes(currency.primaryFailureCause)) throw new Error(`Primary cause missing from failure causes: ${currency.slug}`);
    for (const key of [...currency.sourceKeys, ...currency.claims.flatMap((claim) => claim.sourceKeys)]) {
      if (!sourceKeys.has(key)) throw new Error(`Unknown source key ${key} on ${currency.slug}`);
    }
    if (currency.claims.length < 3) throw new Error(`Incomplete claim audit: ${currency.slug}`);
  }
}
