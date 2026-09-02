import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultFile = new URL("../data/dollar-stress-baseline.json", import.meta.url);
const expected = {
  m2: {
    seriesId: "M2SL",
    unit: "billions_usd_seasonally_adjusted",
    frequency: "monthly",
    first: "1965-01-01",
    latest: "2026-07-01",
    fullCount: 739,
    baselineCount: 720,
    p20: 4.099001367791724,
    p95: 12.9551796761639,
    freshnessDays: 75,
    downloadSha256: "7a6e79e6f5d9ded0f53abe7907677f4f73a29ddd731022239ddc19b34b670c45",
  },
  cpi: {
    seriesId: "CPIAUCSL",
    unit: "index_1982_1984_100_seasonally_adjusted",
    frequency: "monthly",
    first: "1965-01-01",
    latest: "2026-07-01",
    fullCount: 739,
    baselineCount: 719,
    p20: 1.9720237923649453,
    p95: 10.497793251393505,
    freshnessDays: 75,
    downloadSha256: "5a102ceb6a4c5fe5a2e0319d6feca89b55dde6199e51de0760f42791a949cdaa",
  },
  federal_debt_to_gdp: {
    seriesId: "GFDEGDQ188S",
    unit: "percent_gdp_seasonally_adjusted",
    frequency: "quarterly",
    first: "1966-01-01",
    latest: "2026-01-01",
    fullCount: 241,
    baselineCount: 240,
    p20: 35.000358,
    p95: 119.64705399999998,
    freshnessDays: 180,
    downloadSha256: "2bd1ca53fa2cf7bfc51999e6eb1414a4de395eb0f84bb785f6b97ee0a2ca16d8",
  },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertNear(actual, expectedValue, label, tolerance = 1e-12) {
  if (Math.abs(actual - expectedValue) > tolerance) {
    throw new Error(`${label} mismatch: ${actual}.`);
  }
}

function percentileR7(values, percentile) {
  if (values.length === 0) throw new Error("Percentile sample cannot be empty.");
  const sorted = [...values].sort((left, right) => left - right);
  const h = (sorted.length - 1) * percentile;
  const lower = Math.floor(h);
  const upper = Math.ceil(h);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (h - lower);
}

function priorYearDate(date) {
  return `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
}

function periodEnd(date, frequency) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const endMonth = frequency === "quarterly" ? month + 2 : month;
  return Date.UTC(year, endMonth, 0, 23, 59, 59, 999);
}

function ageDays(asOf, timestamp) {
  return (asOf - timestamp) / 86_400_000;
}

function normalized(value, lower, upper) {
  return Math.max(0, Math.min(100, ((value - lower) / (upper - lower)) * 100));
}

export function validateDollarStressBaseline(artifact) {
  if (artifact?.version !== "usd-stress-baseline-2026-09-02") {
    throw new Error("Unexpected stress baseline version.");
  }
  if (artifact.methodologyVersion !== "usd-stress-v1.0.0") {
    throw new Error("Stress baseline methodology version mismatch.");
  }
  if (
    artifact.baseline?.startDate !== "1966-01-01" ||
    artifact.baseline?.endDate !== "2025-12-31" ||
    artifact.baseline?.lowerPercentile !== 0.2 ||
    artifact.baseline?.upperPercentile !== 0.95 ||
    artifact.baseline?.percentileMethod !== "r7_linear"
  ) {
    throw new Error("Stress baseline policy mismatch.");
  }
  const asOf = Date.parse(artifact.retrievedAt);
  if (!Number.isFinite(asOf)) throw new Error("Stress baseline retrieval time is invalid.");
  if (artifact.observationSha256 !== sha256(JSON.stringify(artifact.observations))) {
    throw new Error("Stress baseline observation checksum mismatch.");
  }
  if (!Array.isArray(artifact.sources) || artifact.sources.length !== 3) {
    throw new Error("Stress baseline requires exactly three sources.");
  }

  const sourceByMetric = new Map();
  for (const source of artifact.sources) {
    const contract = expected[source.metric];
    if (!contract || sourceByMetric.has(source.metric)) {
      throw new Error(`Unexpected or duplicate stress source: ${source.metric}.`);
    }
    if (
      source.sourceSeriesId !== contract.seriesId ||
      source.unit !== contract.unit ||
      source.frequency !== contract.frequency ||
      !/^https:\/\/fred\.stlouisfed\.org\//.test(source.url) ||
      !/^https:\/\/fred\.stlouisfed\.org\//.test(source.downloadUrl) ||
      source.downloadSha256 !== contract.downloadSha256
    ) {
      throw new Error(`Stress source contract mismatch: ${source.metric}.`);
    }
    const sourceUpdatedAt = Date.parse(source.sourceUpdatedAt);
    if (!Number.isFinite(sourceUpdatedAt) || sourceUpdatedAt > asOf) {
      throw new Error(`Stress source update time is invalid: ${source.metric}.`);
    }
    sourceByMetric.set(source.metric, source);
  }

  const samples = {};
  const currentRaw = {};
  for (const [metric, contract] of Object.entries(expected)) {
    const rows = artifact.observations?.[metric];
    if (!Array.isArray(rows) || rows.length !== contract.fullCount) {
      throw new Error(`Unexpected stored observation count for ${metric}.`);
    }
    if (artifact.expectedLatestPeriods?.[metric] !== contract.latest) {
      throw new Error(`Expected latest period mismatch for ${metric}.`);
    }
    const values = new Map();
    let priorDate = null;
    for (const row of rows) {
      if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(row.date) || row.date <= priorDate) {
        throw new Error(`Invalid or nonchronological observation for ${metric}.`);
      }
      if (contract.frequency === "quarterly" && !/-(01|04|07|10)-01$/.test(row.date)) {
        throw new Error(`Invalid quarterly observation date for ${metric}.`);
      }
      if (row.value !== null && !Number.isFinite(row.value)) {
        throw new Error(`Invalid observation value for ${metric}.`);
      }
      values.set(row.date, row.value);
      priorDate = row.date;
    }
    if (rows[0].date !== contract.first || rows.at(-1).date !== contract.latest) {
      throw new Error(`Observation coverage mismatch for ${metric}.`);
    }
    if (metric === "cpi") {
      const missing = rows.filter((row) => row.value === null).map((row) => row.date);
      if (missing.length !== 1 || missing[0] !== "2025-10-01") {
        throw new Error("CPI must preserve the blank 2025-10-01 source observation.");
      }
    } else if (rows.some((row) => row.value === null)) {
      throw new Error(`Unexpected missing observation for ${metric}.`);
    }

    let sample;
    if (contract.frequency === "monthly") {
      sample = rows
        .filter((row) => row.date >= "1966-01-01" && row.date <= "2025-12-31")
        .flatMap((row) => {
          const prior = values.get(priorYearDate(row.date));
          return row.value !== null && typeof prior === "number" && prior > 0
            ? [((row.value / prior) - 1) * 100]
            : [];
        });
      const latest = values.get(contract.latest);
      const prior = values.get(priorYearDate(contract.latest));
      if (typeof latest !== "number" || typeof prior !== "number" || prior <= 0) {
        throw new Error(`Latest expected YoY inputs are invalid for ${metric}.`);
      }
      currentRaw[metric] = ((latest / prior) - 1) * 100;
    } else {
      sample = rows
        .filter((row) => row.date >= "1966-01-01" && row.date <= "2025-12-31")
        .flatMap((row) => (typeof row.value === "number" ? [row.value] : []));
      const latest = values.get(contract.latest);
      if (typeof latest !== "number") {
        throw new Error(`Latest expected direct input is invalid for ${metric}.`);
      }
      currentRaw[metric] = latest;
    }
    if (sample.length !== contract.baselineCount) {
      throw new Error(`Baseline sample count mismatch for ${metric}.`);
    }
    const p20 = percentileR7(sample, 0.2);
    const p95 = percentileR7(sample, 0.95);
    assertNear(p20, contract.p20, `${metric} p20`);
    assertNear(p95, contract.p95, `${metric} p95`);
    samples[metric] = { count: sample.length, p20, p95 };

    const source = sourceByMetric.get(metric);
    const sourceAge = ageDays(asOf, Date.parse(source.sourceUpdatedAt));
    const periodAge = ageDays(asOf, periodEnd(contract.latest, contract.frequency));
    if (sourceAge < 0 || periodAge < 0 || sourceAge > contract.freshnessDays || periodAge > contract.freshnessDays) {
      throw new Error(`Latest expected period is stale for ${metric}.`);
    }
  }

  const components = {
    m2: normalized(currentRaw.m2, samples.m2.p20, samples.m2.p95),
    cpi: normalized(currentRaw.cpi, samples.cpi.p20, samples.cpi.p95),
    federal_debt_to_gdp: normalized(
      currentRaw.federal_debt_to_gdp,
      samples.federal_debt_to_gdp.p20,
      samples.federal_debt_to_gdp.p95,
    ),
  };
  assertNear(components.m2, 14.850397159884665, "Current M2 component");
  assertNear(components.cpi, 15.62125582613533, "Current CPI component");
  assertNear(components.federal_debt_to_gdp, 100, "Current debt component");
  const unroundedScore =
    components.m2 / 3 + components.cpi / 3 + components.federal_debt_to_gdp / 3;
  assertNear(unroundedScore, 43.490550995339994, "Current composite");
  if (Math.round((unroundedScore + Number.EPSILON) * 10) / 10 !== 43.5) {
    throw new Error("Current composite final rounding mismatch.");
  }

  return { version: artifact.version, samples, currentRaw, components, unroundedScore, score: 43.5 };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : defaultFile;
  const artifact = JSON.parse(await readFile(file, "utf8"));
  process.stdout.write(`${JSON.stringify(validateDollarStressBaseline(artifact))}\n`);
}
