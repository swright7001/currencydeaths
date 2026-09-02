import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import artifact from "../data/dollar-stress-baseline.json";
import {
  buildVerifiedDollarStressInputs,
  calculateDollarStressBaselineAnchors,
} from "../lib/data/dollar-stress-baseline";
import { validateDollarStressBaseline } from "../scripts/validate-dollar-stress-baseline.mjs";

function clonedArtifact() {
  return structuredClone(artifact) as typeof artifact;
}

function refreshObservationDigest(candidate: typeof artifact) {
  candidate.observationSha256 = createHash("sha256")
    .update(JSON.stringify(candidate.observations))
    .digest("hex");
}

describe("verified dollar stress baseline", () => {
  it("reproduces the approved counts, anchors, and latest expected inputs", () => {
    const result = validateDollarStressBaseline(artifact);
    expect(result.samples).toEqual({
      m2: {
        count: 720,
        p20: 4.099001367791724,
        p95: 12.9551796761639,
      },
      cpi: {
        count: 719,
        p20: 1.9720237923649453,
        p95: 10.497793251393505,
      },
      federal_debt_to_gdp: {
        count: 240,
        p20: 35.000358,
        p95: 119.64705399999998,
      },
    });
    expect(result.score).toBe(43.5);
    expect(buildVerifiedDollarStressInputs().every((input) => input.freshness === "current"))
      .toBe(true);
    expect(calculateDollarStressBaselineAnchors().consumer_price_inflation.count).toBe(719);
  });

  it("preserves the official blank CPI cell instead of coercing it to zero", () => {
    const blank = artifact.observations.cpi.find((row) => row.date === "2025-10-01");
    expect(blank).toEqual({ date: "2025-10-01", value: null });
    expect(artifact.observations.cpi.some((row) => row.value !== null && row.value < 0)).toBe(false);
    expect(
      artifact.observations.cpi.some((row, index, rows) => {
        const prior = rows.find(
          (candidate) =>
            candidate.date === `${Number(row.date.slice(0, 4)) - 1}${row.date.slice(4)}`,
        );
        return row.value !== null && prior?.value && ((row.value / prior.value) - 1) * 100 < 0;
      }),
    ).toBe(true);
  });

  it("rejects checksum tampering before using altered observations", () => {
    const candidate = clonedArtifact();
    candidate.observations.m2[0].value = 1;
    expect(() => validateDollarStressBaseline(candidate)).toThrow(
      "observation checksum mismatch",
    );

    const sourceTamper = clonedArtifact();
    sourceTamper.sources[0].downloadSha256 = "0".repeat(64);
    expect(() => validateDollarStressBaseline(sourceTamper)).toThrow(
      "Stress source contract mismatch",
    );
  });

  it("rejects missing latest periods and nonchronological records even with a refreshed digest", () => {
    const missingLatest = clonedArtifact();
    (missingLatest.observations.m2.at(-1)! as { value: number | null }).value = null;
    refreshObservationDigest(missingLatest);
    expect(() => validateDollarStressBaseline(missingLatest)).toThrow(
      "Unexpected missing observation for m2",
    );

    const duplicate = clonedArtifact();
    duplicate.observations.federal_debt_to_gdp[1].date =
      duplicate.observations.federal_debt_to_gdp[0].date;
    refreshObservationDigest(duplicate);
    expect(() => validateDollarStressBaseline(duplicate)).toThrow(
      "Invalid or nonchronological observation",
    );
  });
});
