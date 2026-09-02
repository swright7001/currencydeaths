# Dollar Stress Score v1.0.0

Status: owner-approved experimental methodology. This index is not a probability,
forecast, investment recommendation, or predicted currency-death date.

## Data contract

The immutable `data/dollar-stress-baseline.json` artifact contains the official
FRED observations needed for the frozen January 1966–December 2025 normalization
window and the July 2026 / Q1 2026 calculation snapshot. It records series
identity, publisher, URLs, units, frequencies, source-update and retrieval times,
whole-download SHA-256 values, and an observation digest.

Approved series:

- `M2SL`: seasonally adjusted monthly M2, Board of Governors.
- `CPIAUCSL`: seasonally adjusted monthly CPI-U all items, BLS.
- `GFDEGDQ188S`: quarterly total federal public debt as a share of GDP, OMB and
  Federal Reserve Bank of St. Louis.

The CPI source has a blank `2025-10-01` cell. The artifact preserves it as `null`.
It is excluded from the historical percentile sample, but the same fallback is
not allowed for a latest expected production period. Valid negative year-over-year
inflation remains valid.

## Calculation

M2 and CPI use `((current / same month prior year) - 1) × 100`. Debt/GDP uses the
source level directly. For each transformed baseline sample, sort finite values
ascending and compute p20 and p95 with R-7 / NumPy-linear interpolation:
`h=(n−1)p`, linearly interpolating between `floor(h)` and `ceil(h)`.

Normalize each current value with:

`clamp(((value - p20) / (p95 - p20)) × 100, 0, 100)`

| Component | Valid sample | p20 | p95 | Weight |
| --- | ---: | ---: | ---: | ---: |
| M2 YoY | 720 | 4.099001367791724% | 12.9551796761639% | 1/3 |
| CPI YoY | 719 | 1.9720237923649453% | 10.497793251393505% | 1/3 |
| Debt/GDP | 240 | 35.000358% | 119.64705399999998% | 1/3 |

All source values, transformations, anchors, normalized values, contributions,
and exact one-third weights remain unrounded. Only the final composite is rounded
to one decimal.

The verified 2026-09-02 vector is:

- M2: 5.414179019772547% → 14.850397159884665
- CPI: 3.303856050706311% → 15.62125582613533
- Debt/GDP: 122.59387% → 100 (clipped above p95)
- Composite: 43.490550995339994 → **43.5 / 100 — Elevated selected stress**

## Freshness and failure behavior

`scoreAsOf` is the immutable artifact retrieval time. The latest reported or
expected period available by that time must be validated; the implementation never
searches backward around a missing or invalid latest value. Monthly source-update
and period-end ages must each be at most 75 days; quarterly ages must each be at
most 180 days.

Any missing, blank, invalid, stale, future-dated, conflicting, or contract-mismatched
component suppresses the complete score. There is no reweighting, carry-forward,
or last-known-value substitution. Revisions enter only through a new immutable,
reviewed artifact and do not rewrite historical score versions.

## Display bands and sensitivity

The equal-width labels Lower (0–19.9), Moderate (20–39.9), Elevated (40–59.9),
High (60–79.9), and Extreme (80–100) are display policy—not empirical crisis
thresholds. Illustrative alternative weights produce 36.4 (monetary emphasis),
36.5 (inflation emphasis), and 53.4 (fiscal emphasis), demonstrating that the
composite is sensitive to policy choices.

## Known limits and hero decision

M2 contains historical definition changes. CPI-U does not represent every household
or asset price. The one-sided M2 and CPI components do not capture contraction or
deflationary stress. Gross debt/GDP omits maturity, interest cost, currency
denomination, assets, fiscal capacity, and reserve demand. Debt is already clipped
at 100 under the p95 rule.

No v1 input maps the score to time. The product therefore displays a large Dollar
Stress Index and component strip, not a time-to-failure countdown. “Countdown to
Zero” remains art direction only.

## Reproduction

`npm run data:validate` verifies both dollar artifacts and independently reproduces
the v1 anchors and test vector. `npm run data:prepare-stress-baseline` is a one-time
reproduction helper pinned to the recorded full-download hashes; it fails when FRED
has revised a download so a changed source cannot silently replace this artifact.
