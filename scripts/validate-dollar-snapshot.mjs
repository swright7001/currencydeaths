import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultFile = new URL("../data/dollar-metric-snapshot.json", import.meta.url);
const expected = {
  m2: ["M2SL", "billions_usd_seasonally_adjusted", "monthly"],
  cpi: ["CPIAUCSL", "index_1982_1984_100_seasonally_adjusted", "monthly"],
  federal_debt_to_gdp: ["GFDEGDQ188S", "percent_gdp_seasonally_adjusted", "quarterly"],
};

export function observationDigest(observations) {
  return createHash("sha256").update(JSON.stringify(observations)).digest("hex");
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Snapshot must be an object.");
  if (!/^usd-metrics-verified-\d{4}-\d{2}-\d{2}$/.test(snapshot.version)) {
    throw new Error("Snapshot version must identify a dated verified dataset.");
  }
  if (!Number.isFinite(Date.parse(snapshot.retrievedAt))) throw new Error("Invalid retrieval timestamp.");
  if (!Array.isArray(snapshot.sources) || snapshot.sources.length !== 3) {
    throw new Error("Snapshot requires exactly three approved sources.");
  }
  if (!Array.isArray(snapshot.observations) || snapshot.observations.length === 0) {
    throw new Error("Snapshot requires observations.");
  }

  const sources = new Map();
  for (const source of snapshot.sources) {
    if (sources.has(source.key)) throw new Error(`Duplicate source key: ${source.key}.`);
    if (!/^https:\/\/fred\.stlouisfed\.org\//.test(source.url) ||
        !/^https:\/\/fred\.stlouisfed\.org\//.test(source.downloadUrl)) {
      throw new Error(`Source ${source.key} must use an official FRED URL.`);
    }
    if (!/^[a-f0-9]{64}$/.test(source.downloadSha256)) {
      throw new Error(`Source ${source.key} requires a SHA-256 download checksum.`);
    }
    if (!Number.isFinite(Date.parse(source.sourceUpdatedAt))) {
      throw new Error(`Source ${source.key} requires a valid update timestamp.`);
    }
    sources.set(source.key, source);
  }

  const identities = new Set();
  const lastDate = new Map();
  for (const observation of snapshot.observations) {
    const contract = expected[observation.metric];
    if (!contract) throw new Error(`Unsupported metric: ${observation.metric}.`);
    const source = sources.get(observation.sourceKey);
    if (!source) throw new Error(`Unknown source: ${observation.sourceKey}.`);
    const [series, unit, frequency] = contract;
    if (source.sourceSeriesId !== series || source.unit !== unit || source.frequency !== frequency) {
      throw new Error(`Provenance mismatch for ${observation.metric}.`);
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(observation.observationDate)) {
      throw new Error(`Observation date must preserve month precision: ${observation.observationDate}.`);
    }
    if (!Number.isFinite(observation.value)) throw new Error("Observation value must be finite.");
    const identity = `${observation.metric}:${observation.observationDate}`;
    if (identities.has(identity)) throw new Error(`Duplicate observation: ${identity}.`);
    identities.add(identity);
    const previous = lastDate.get(observation.metric);
    if (previous && observation.observationDate <= previous) {
      throw new Error(`Observations must be chronological for ${observation.metric}.`);
    }
    lastDate.set(observation.metric, observation.observationDate);
  }

  const digest = observationDigest(snapshot.observations);
  if (digest !== snapshot.observationSha256) {
    throw new Error("Observation checksum mismatch; snapshot values were altered.");
  }
  return { version: snapshot.version, sources: sources.size, observations: identities.size, digest };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : defaultFile;
  const snapshot = JSON.parse(await readFile(file, "utf8"));
  const result = validateSnapshot(snapshot);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
