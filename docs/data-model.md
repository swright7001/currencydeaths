# CurrencyDeaths data model

The Convex schema is a provenance-first research boundary. It stores source observations and historical classifications; it does not turn missing evidence into a number or an interpretation into a fact.

## Historical dates and lifespan

Historical dates carry an explicit `year`, `month`, or `day` precision. A missing month or day means the source did not establish that precision. It is not silently converted to January 1.

`dateKey` fields exist on timeline events and metric observations only to provide chronological index ordering while retaining the original precision object. Currency chronology validation treats imprecise dates as intervals: it rejects only a definitely inverted end interval and does not reject two intervals that could overlap. Currency lifespan is never stored as editable truth. Consumers derive it from `startDate`, `endDate`, an explicit as-of date for active currencies, and a versioned rounding/inclusion methodology.

The current date contract supports years 1–9999. Earlier historical eras require a separately reviewed extension rather than negative-year guesswork.

## Classification semantics

- `status` describes the researched monetary regime: active, dead, replaced, redenominated, collapsed, or historical. “Historical” is the neutral fallback when a stronger outcome label is not defensible.
- `currencyType` distinguishes fiat, commodity-backed, union, colonial, transitional, and other systems. It prevents fiat-specific conclusions from being applied to unlike systems.
- `primaryFailureCause` is optional. `failureCauses` can contain multiple supported contributing classifications. Absence means unclassified, not “none.”
- `recordState` is either `development_fixture` or `verified`. Verified currencies and events require at least one source. Development fixtures must remain visibly identified by consumers.
- `seedVersion` is optional ownership metadata used only by reviewed, version-pinned seed operations. A seed must refuse collisions with non-seed records and must never imply that a local seed was imported to production.
- `replacementCurrencyName` preserves a researched successor when the successor does not yet have its own currency record. `replacementCurrencyId` remains available for a later normalized relationship.
- Metrics exist only when an observation exists. Their observation dates carry the same year/month/day precision as historical records, and values must be finite numbers. Query contracts return `null` when an observation or optional field is unavailable; they never coerce missing data to zero or invent calendar precision.

## Provenance and references

Currency records and events cite bounded arrays of source IDs. Metric observations cite one source. Public research queries resolve those references and return publisher, URL, publication precision, access time, and source type with the value.

Ingestion mutations are internal. They reject duplicate slugs/URLs, missing country/currency/source references, invalid date precision, end dates before start dates, unsourced verified records, and invalid ISO observation dates. The only deletion boundary is the version-pinned local seed rollback documented in [verified-currency-seed-v1.md](./verified-currency-seed-v1.md); general research deletion remains unavailable.

## Index policy

Every implemented read path uses a named index. Slug and URL lookups are unique; archive classifications and chronological metric/event paths have ordered indexes. Public queries are point lookups or indexed first-record reads—there are no unbounded table scans.

## Deferred decisions

This issue does not load historical data, define the final metric-key catalog, calculate lifespans or stress scores, expose subscriber mutations, or deploy a production database. Subscriber storage is present for the later consent-aware watchlist issue; verification tokens, abuse controls, Resend actions, and public enrollment remain deferred.
