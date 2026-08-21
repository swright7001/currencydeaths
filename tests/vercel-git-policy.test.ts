import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type VercelGitPolicy = Readonly<{
  $schema?: unknown;
  git?: Readonly<{
    deploymentEnabled?: unknown;
  }>;
  github?: unknown;
}>;

async function readVercelGitPolicy(): Promise<VercelGitPolicy> {
  const contents = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  return JSON.parse(contents) as VercelGitPolicy;
}

describe("Vercel Git deployment policy", () => {
  it("disables Git-triggered deployments from main while leaving preview branches enabled", async () => {
    const policy = await readVercelGitPolicy();

    expect(policy).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      git: {
        deploymentEnabled: {
          main: false,
        },
      },
    });
  });

  it("does not use the deprecated GitHub enablement switch", async () => {
    const policy = await readVercelGitPolicy();

    expect(policy.github).toBeUndefined();
  });
});
