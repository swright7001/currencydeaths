import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const snapshotUrl = new URL("../data/dollar-metric-snapshot.json", import.meta.url);
const outputUrl = new URL("../data/dollar-stress-baseline.json", import.meta.url);
const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));

const approved = {
  M2SL: {
    metric: "m2",
    firstDate: "1965-01-01",
    lastDate: "2026-07-01",
    expectedDownloadSha256: "7a6e79e6f5d9ded0f53abe7907677f4f73a29ddd731022239ddc19b34b670c45",
  },
  CPIAUCSL: {
    metric: "cpi",
    firstDate: "1965-01-01",
    lastDate: "2026-07-01",
    expectedDownloadSha256: "5a102ceb6a4c5fe5a2e0319d6feca89b55dde6199e51de0760f42791a949cdaa",
  },
  GFDEGDQ188S: {
    metric: "federal_debt_to_gdp",
    firstDate: "1966-01-01",
    lastDate: "2026-01-01",
    expectedDownloadSha256: "2bd1ca53fa2cf7bfc51999e6eb1414a4de395eb0f84bb785f6b97ee0a2ca16d8",
  },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsv(buffer, contract) {
  const lines = buffer.toString("utf8").trimEnd().split(/\r?\n/);
  const observations = [];
  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(",");
    if (date < contract.firstDate || date > contract.lastDate) continue;
    const trimmed = rawValue?.trim() ?? "";
    observations.push({
      date,
      value: trimmed === "" ? null : Number(trimmed),
    });
  }
  return observations;
}

const sources = [];
const observations = {};
for (const [seriesId, contract] of Object.entries(approved)) {
  const source = snapshot.sources.find((item) => item.sourceSeriesId === seriesId);
  if (!source) throw new Error(`Missing approved snapshot source ${seriesId}.`);
  const response = await fetch(source.downloadUrl);
  if (!response.ok) throw new Error(`FRED download failed for ${seriesId}: ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const downloadSha256 = sha256(bytes);
  if (downloadSha256 !== contract.expectedDownloadSha256) {
    throw new Error(`FRED ${seriesId} changed; review a new immutable source snapshot.`);
  }
  sources.push({
    metric: contract.metric,
    sourceSeriesId: seriesId,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    downloadUrl: source.downloadUrl,
    downloadSha256,
    sourceUpdatedAt: source.sourceUpdatedAt,
    unit: source.unit,
    frequency: source.frequency,
  });
  observations[contract.metric] = parseCsv(bytes, contract);
}

const artifact = {
  version: "usd-stress-baseline-2026-09-02",
  methodologyVersion: "usd-stress-v1.0.0",
  retrievedAt: snapshot.retrievedAt,
  baseline: {
    startDate: "1966-01-01",
    endDate: "2025-12-31",
    lowerPercentile: 0.2,
    upperPercentile: 0.95,
    percentileMethod: "r7_linear",
  },
  expectedLatestPeriods: {
    m2: "2026-07-01",
    cpi: "2026-07-01",
    federal_debt_to_gdp: "2026-01-01",
  },
  sources,
  observations,
};

artifact.observationSha256 = sha256(JSON.stringify(artifact.observations));
await writeFile(outputUrl, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ version: artifact.version, observationSha256: artifact.observationSha256 })}\n`);
