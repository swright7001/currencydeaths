import { describe, expect, it } from "vitest";

import {
  ConvexEnvironmentError,
  getOptionalConvexUrl,
  requireConvexUrl,
} from "../lib/env/convex";

describe("Convex environment validation", () => {
  it("keeps the credential-free foundation usable when Convex is optional", () => {
    expect(getOptionalConvexUrl(undefined)).toBeNull();
    expect(getOptionalConvexUrl("   ")).toBeNull();
  });

  it("accepts secure cloud URLs and local HTTP deployments", () => {
    expect(getOptionalConvexUrl("https://example.convex.cloud/ ")).toBe(
      "https://example.convex.cloud",
    );
    expect(getOptionalConvexUrl("http://localhost:3210")).toBe(
      "http://localhost:3210",
    );
  });

  it("rejects malformed and insecure remote URLs", () => {
    expect(() => getOptionalConvexUrl("not-a-url")).toThrow(
      ConvexEnvironmentError,
    );
    expect(() => getOptionalConvexUrl("http://example.com")).toThrow(
      /must use HTTPS/,
    );
  });

  it("fails clearly when Convex is required but not configured", () => {
    expect(() => requireConvexUrl(undefined)).toThrow(
      "NEXT_PUBLIC_CONVEX_URL is required",
    );
  });
});
