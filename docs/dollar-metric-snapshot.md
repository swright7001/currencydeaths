# Dollar metric verified snapshot

`data/dollar-metric-snapshot.json` is a dated research artifact, not a live feed. It contains five observations for each currently approved series:

- `M2SL` — Board of Governors M2, monthly, billions of dollars, seasonally adjusted.
- `CPIAUCSL` — Bureau of Labor Statistics CPI-U all items, monthly, 1982–84 index, seasonally adjusted.
- `GFDEGDQ188S` — federal debt as a percentage of GDP, quarterly, seasonally adjusted.

The artifact records the FRED series page and CSV URL, retrieval timestamp, source update timestamp, units, frequency, observation dates, and the SHA-256 checksum of each complete CSV response retrieved on September 2, 2026. FRED observations can be revised after retrieval, so the committed values must never be described as live.

Run the deterministic artifact checks with:

```bash
npm run data:validate
```

The validator rejects unsupported series, unofficial URLs, missing download checksums, invalid dates or numbers, source/unit/frequency mismatches, duplicate or non-chronological observations, and any alteration to the committed observation set. A later refresh must be a separately reviewed snapshot version; it must not silently rewrite this artifact or its retrieval evidence.
