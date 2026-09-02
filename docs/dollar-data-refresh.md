# Dollar data refresh operations

MAR-185 adds one controlled refresh path for the three series approved by methodology `usd-stress-v1.0.0`.

## Provider inventory

| Provider | Series | Purpose | Authentication | Cost ceiling |
| --- | --- | --- | --- | --- |
| Federal Reserve Bank of St. Louis FRED API | `M2SL` | M2 money stock | Server-only `FRED_API_KEY` | $0 |
| Federal Reserve Bank of St. Louis FRED API | `CPIAUCSL` | CPI-U, all items | Server-only `FRED_API_KEY` | $0 |
| Federal Reserve Bank of St. Louis FRED API | `GFDEGDQ188S` | Federal debt / GDP | Server-only `FRED_API_KEY` | $0 |

Each run makes one metadata request and one observations request per series. It accepts at most 120 observations per series and 360 observations total. Each request has a 15-second timeout and at most three attempts with 0, 1, and 4-second delays. The scheduled cadence is Monday at 14:00 UTC.

## Safety contract

- Validate authentication, HTTP status, JSON content type, response size, series identity, units, frequency, seasonal adjustment, chronology, finite values, source timestamps, and the exact three-series set before mutation.
- Require the latest observation period and source update to fit the approved stress-method windows: 75 days for monthly M2/CPI and 180 days for quarterly debt/GDP. Observation age is measured from the actual month or quarter end.
- Preserve `.` FRED values as explicit missing observations. Never coerce them to zero or interpolate them.
- Hash only source data and metadata for batch identity. Retrieval time remains provenance, so unchanged source responses do not create a new batch.
- Write a complete immutable revision batch and move the active pointer in one Convex transaction. A failed or partial batch never becomes readable.
- Keep the prior complete batch addressable for rollback. The UI reads one active batch and withholds the score if any required series, prior-year input, or freshness contract fails.
- Emit only bounded run metadata and redacted error codes. Never record the API key or provider response body.

## Activation

1. Add `FRED_API_KEY` only to the production Convex deployment.
2. Run the internal action in `dry_run` mode and verify all three source identities, observation counts, missing counts, and the payload digest. Dry-run performs zero database writes.
3. Run once in `manual` mode. Confirm one active batch, at most 360 revisions, and source/retrieval dates on `/dollar` and `/`.
4. Deploy `convex/crons.ts` only after the exact provider contract has owner approval.

Do not place the key in `.env`, `NEXT_PUBLIC_*`, Vercel, source control, command output, or Linear evidence.

## Failure and rollback

Provider failures leave the last complete active batch untouched and add a redacted failed-run record. To roll back, first remove or disable the scheduled cron, deploy that change, then invoke `dollarMetricRefreshStore:rollbackActiveBatch`. The mutation swaps the active and previous complete batch pointers; immutable revisions remain for audit. Re-enable scheduling only after the incident is understood and a dry-run passes.

If no active refresh batch exists, the already verified repository snapshot remains the read baseline. Once an active batch exists, configured Convex read failures do not silently fall back to repository data.
