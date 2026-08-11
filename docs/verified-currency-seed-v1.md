# Verified currency research seed v1

Seed namespace: `currency-research-v1`

Source access date: 2026-08-11 UTC

This seed contains five source-vetted research records. It is intentionally small. A `verified` record means that the claims listed below are supported by the cited central-bank or international-institution source; it does not mean every potentially useful metric is available or that a currency replacement was necessarily a failure.

No inflation peak, purchasing-power loss, money-supply value, or lifespan is stored by this seed. Those values remain absent until a source and methodology support them. The Greek drachma is included as a neutral currency-union replacement case. The Zimbabwe entry is explicitly a grouped 1980–2009 monetary regime spanning multiple redenominations.

## Sources

All sources were accessed on 2026-08-11 UTC.

| Key | Publisher | Source | Type |
| --- | --- | --- | --- |
| `bundesbank-inflation-history` | Deutsche Bundesbank | [Inflation – lessons learnt from history](https://www.bundesbank.de/en/tasks/topics/inflation-lessons-learnt-from-history-666006) | Central bank |
| `bundesbank-purchasing-power` | Deutsche Bundesbank | [Purchasing power comparisons of historical amounts of money](https://www.bundesbank.de/en/statistics/economic-activity-and-prices/national-producer-and-consumer-prices/purchasing-power-comparisons-of-historical-amounts-of-money-795290) | Central bank |
| `mnb-history` | Magyar Nemzeti Bank | [History](https://www.mnb.hu/en/the-central-bank/organisation/history) | Central bank |
| `mnb-pengo-introduction` | Magyar Nemzeti Bank | [Resources in the Service of the Nation](https://en-hitelintezetiszemle.mnb.hu/letoltes/tamas-fulop.pdf) | Central bank publication |
| `imf-zimbabwe-history` | International Monetary Fund | [Zimbabwe: Selected Issues — A Brief Monetary History of Zimbabwe](https://www.elibrary.imf.org/view/journals/002/2020/082/article-A004-en.xml) | International institution |
| `imf-venezuela-redenomination` | International Monetary Fund | [Recognizing Reality: Unification of Official and Parallel Market Exchange Rates](https://www.elibrary.imf.org/abstract/journals/001/2021/025/article-A001-en.xml) | International institution |
| `imf-venezuela-exchange-metadata` | International Monetary Fund | [Exchange Rate Database Country Notes](https://data.imf.org/-/media/iData/External-Storage/Documents/7F74AA6D71D2438285DBAC19451D7F7C/en/Metadata-Exchange-Rate-database_Country-notes.pdf) | International institution dataset metadata |
| `bog-drachma` | Bank of Greece | [Drachma](https://www.bankofgreece.gr/en/the-bank/history/drachma) | Central bank |

## Claim-level provenance audit

| Currency | Claim field | Stored claim | Source key(s) | Unresolved ambiguity |
| --- | --- | --- | --- | --- |
| German paper mark | Start | The paper regime begins with suspension of gold convertibility on 31 July 1914. | `bundesbank-purchasing-power` | This is the start of the paper regime, not of the earlier gold-backed Mark. |
| German paper mark | End, status, replacement | Rentenmark stabilization replaced the Mark in November 1923; the Reichsmark became the official successor in 1924. | `bundesbank-inflation-history`, `bundesbank-purchasing-power` | The November end is retained at month precision; stabilization and formal official succession are separate milestones. |
| German paper mark | Primary cause | The regime culminated in the 1923 hyperinflation. | `bundesbank-inflation-history` | Multiple contributing causes are recorded; “hyperinflation” is the primary classification, not a complete causal theory. |
| Hungarian pengő | Start | The pengő became the official currency on 1 January 1927. | `mnb-pengo-introduction` | None identified. |
| Hungarian pengő | End, status, replacement | The forint replaced the pengő on 1 August 1946. | `mnb-history` | None identified. |
| Hungarian pengő | Primary cause | Postwar inflation produced an extreme loss of value. | `mnb-history` | The record also classifies war and reform as contributing causes. |
| Zimbabwe dollar regime | Start | At independence in 1980, the currency was renamed the Zimbabwe dollar. | `imf-zimbabwe-history` | The source supports year precision, not an exact introduction day. |
| Zimbabwe dollar regime | End, status, replacement | The domestic currency was abandoned and a multicurrency system officially recognized in early 2009. | `imf-zimbabwe-history` | February is stored at month precision; legal and de facto transition milestones occurred at different points. |
| Zimbabwe dollar regime | Primary cause | Monetary financing and economic decline culminated in hyperinflation. | `imf-zimbabwe-history` | The record groups successive redenominations rather than presenting them as separate lifespans. |
| Venezuelan bolívar fuerte | Start | Introduced on 1 January 2008 at 1,000 old bolívares per new unit. | `imf-venezuela-exchange-metadata` | None identified. |
| Venezuelan bolívar fuerte | End, status, replacement | Replaced by the bolívar soberano on 20 August 2018 at 100,000 to one. | `imf-venezuela-redenomination`, `imf-venezuela-exchange-metadata` | Classified as `redenominated`, not as a claim that Venezuela stopped having a national currency. |
| Venezuelan bolívar fuerte | Primary cause | Hyperinflation was a primary reason for the redenomination. | `imf-venezuela-redenomination` | The seed does not store a peak inflation estimate. |
| Greek drachma | Start | Greece's national-currency record begins in 1833. | `bog-drachma` | The full span crosses multiple monetary standards, so the currency type must not be interpreted as one unchanged regime. |
| Greek drachma | End, status, replacement | On 28 February 2002 drachma cash ceased legal tender and euro cash replaced it. | `bog-drachma` | The euro existed as book money in Greece before the cash transition completed. |
| Greek drachma | Primary cause | Replacement was a euro-area currency-union transition. | `bog-drachma` | This record is not classified as a collapse or failure. |

## Seed operations

The mutation is internal and version-pinned. It refuses to take ownership of an existing country slug, source URL, or currency slug that was not created by this seed. A second application reports existing records and creates no duplicates.

For an anonymous local Convex deployment:

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev --once
npx convex run seedVerifiedCurrencies:apply '{"version":"currency-research-v1"}'
```

Rollback is scoped to records carrying the exact seed namespace:

```bash
npx convex run seedVerifiedCurrencies:remove '{"version":"currency-research-v1"}'
```

Do not invoke either operation against production without a separately approved data-import issue. The rollback path is intended before other records are attached to seeded countries or sources.
