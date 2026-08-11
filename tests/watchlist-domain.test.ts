import { describe, expect, it } from "vitest";
import {
  buildWatchlistConfirmationEmail,
  createWatchlistLookupHash,
  createWatchlistToken,
  createWatchlistTokenHash,
  normalizeWatchlistEmail,
  secretsMatch,
} from "../lib/watchlist";

describe("watchlist domain contracts", () => {
  it("normalizes valid addresses and rejects unsafe or malformed input", () => {
    expect(normalizeWatchlistEmail("  Research@Example.COM ")).toBe("research@example.com");
    expect(normalizeWatchlistEmail("missing-domain")).toBeNull();
    expect(normalizeWatchlistEmail("a..b@example.com")).toBeNull();
    expect(normalizeWatchlistEmail("person@example")).toBeNull();
    expect(normalizeWatchlistEmail("person@-example.com")).toBeNull();
  });

  it("uses keyed lookup hashes and one-way random token hashes", async () => {
    const first = await createWatchlistLookupHash("research@example.com", "secret-one");
    const same = await createWatchlistLookupHash("research@example.com", "secret-one");
    const rotated = await createWatchlistLookupHash("research@example.com", "secret-two");
    const token = createWatchlistToken();

    expect(first).toBe(same);
    expect(rotated).not.toBe(first);
    expect(first).toHaveLength(64);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await createWatchlistTokenHash(token)).toHaveLength(64);
    expect(secretsMatch("shared-secret", "shared-secret")).toBe(true);
    expect(secretsMatch("shared-secret", "other-secret")).toBe(false);
  });

  it("builds confirmation and unsubscribe links without injecting HTML", () => {
    const email = buildWatchlistConfirmationEmail(
      "https://currencydeaths.test/",
      "verify<&token",
      "unsubscribe-token",
    );

    expect(email.verificationUrl).toBe(
      "https://currencydeaths.test/watchlist/verify?token=verify%3C%26token",
    );
    expect(email.unsubscribeUrl).toContain("/watchlist/unsubscribe?token=");
    expect(email.html).not.toContain("verify<&token");
    expect(email.text).toContain(email.verificationUrl);
  });
});
