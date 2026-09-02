import { describe, expect, it } from "vitest";
import snapshot from "../data/dollar-metric-snapshot.json";
import { validateSnapshot } from "../scripts/validate-dollar-snapshot.mjs";

function cloneSnapshot() {
  return structuredClone(snapshot);
}

describe("dollar metric snapshot artifact", () => {
  it("validates the committed official-source artifact", () => {
    expect(validateSnapshot(snapshot)).toMatchObject({
      version: "usd-metrics-verified-2026-09-02",
      sources: 3,
      observations: 15,
      digest: snapshot.observationSha256,
    });
  });

  it("rejects altered observation values", () => {
    const altered = cloneSnapshot();
    altered.observations[0].value += 1;
    expect(() => validateSnapshot(altered)).toThrow("checksum mismatch");
  });

  it("rejects source provenance and unit mismatches", () => {
    const altered = cloneSnapshot();
    altered.sources[0].sourceSeriesId = "NOT_M2";
    expect(() => validateSnapshot(altered)).toThrow("Provenance mismatch");
  });

  it("rejects duplicate observation dates", () => {
    const altered = cloneSnapshot();
    altered.observations[1].observationDate = altered.observations[0].observationDate;
    expect(() => validateSnapshot(altered)).toThrow("Duplicate observation");
  });
});
