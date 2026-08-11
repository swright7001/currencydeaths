import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { modules } from "./test.setup";
import { WATCHLIST_RATE_LIMIT_MAX_ATTEMPTS } from "../lib/watchlist";

const actionSecret = "test-action-secret-value";
const requiredEnvironment = {
  WATCHLIST_ACTION_SECRET: actionSecret,
  SUBSCRIBER_HASH_SECRET: "test-subscriber-hash-secret",
  RESEND_API_KEY: "re_test_provider_key",
  WATCHLIST_FROM_EMAIL: "CurrencyDeaths <research@example.com>",
  WATCHLIST_PUBLIC_URL: "https://currencydeaths.test",
} as const;

function request(body: Record<string, unknown>) {
  return {
    method: "POST",
    headers: {
      authorization: `Bearer ${actionSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  } satisfies RequestInit;
}

async function bodyStatus(response: Response) {
  return (await response.json()) as { status: string };
}

describe("watchlist HTTP lifecycle", () => {
  beforeEach(() => {
    Object.assign(process.env, requiredEnvironment);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of Object.keys(requiredEnvironment)) delete process.env[key];
  });

  it("stores consent, sends once, verifies, and unsubscribes without storing raw tokens", async () => {
    const providerFetch = vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      new Response(JSON.stringify({ id: "email_fixture" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", providerFetch);
    const t = convexTest(schema, modules);

    const signup = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: " Research@Example.COM ",
        consent: true,
        company: "",
        requestKey: "203.0.113.1",
      }),
    );
    expect(signup.status).toBe(200);
    expect(await bodyStatus(signup)).toEqual({ status: "accepted" });
    expect(providerFetch).toHaveBeenCalledOnce();

    const providerRequest = providerFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(providerRequest.headers).get("authorization")).toBe(
      `Bearer ${requiredEnvironment.RESEND_API_KEY}`,
    );
    expect(new Headers(providerRequest.headers).get("idempotency-key")).toMatch(
      /^watchlist-confirmation\/[a-f0-9]{40}$/,
    );
    const providerBody = JSON.parse(String(providerRequest.body)) as { html: string };
    const verificationToken = providerBody.html.match(/verify\?token=([^"&]+)/)?.[1];
    const unsubscribeToken = providerBody.html.match(/unsubscribe\?token=([^"&]+)/)?.[1];
    expect(verificationToken).toBeTruthy();
    expect(unsubscribeToken).toBeTruthy();

    const pending = await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect());
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      email: "research@example.com",
      status: "pending",
      source: "homepage",
      consentVersion: "watchlist-research-v1",
      confirmationAttemptCount: 1,
    });
    expect(pending[0]?.emailHash).toHaveLength(64);
    expect(pending[0]?.verificationTokenHash).toHaveLength(64);
    expect(pending[0]?.unsubscribeTokenHash).toHaveLength(64);
    expect(JSON.stringify(pending[0])).not.toContain(verificationToken);
    expect(JSON.stringify(pending[0])).not.toContain(unsubscribeToken);

    const duplicate = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "research@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.1",
      }),
    );
    expect(await bodyStatus(duplicate)).toEqual({ status: "accepted" });
    expect(providerFetch).toHaveBeenCalledOnce();

    const confirmed = await t.fetch(
      "/watchlist/verify",
      request({ token: decodeURIComponent(verificationToken!) }),
    );
    expect(await bodyStatus(confirmed)).toEqual({ status: "confirmed" });
    const reused = await t.fetch(
      "/watchlist/verify",
      request({ token: decodeURIComponent(verificationToken!) }),
    );
    expect(await bodyStatus(reused)).toEqual({ status: "invalid_or_expired" });

    const unsubscribed = await t.fetch(
      "/watchlist/unsubscribe",
      request({ token: decodeURIComponent(unsubscribeToken!) }),
    );
    expect(await bodyStatus(unsubscribed)).toEqual({ status: "accepted" });
    const records = await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect());
    expect(records[0]).toMatchObject({ status: "unsubscribed" });
    expect(records[0]?.verificationTokenHash).toBeUndefined();
    expect(records[0]?.unsubscribeTokenHash).toBeUndefined();
  });

  it("fails closed on absent configuration before storing an address", async () => {
    delete process.env.RESEND_API_KEY;
    const providerFetch = vi.fn();
    vi.stubGlobal("fetch", providerFetch);
    const t = convexTest(schema, modules);

    const response = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "research@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.2",
      }),
    );
    expect(response.status).toBe(503);
    expect(await bodyStatus(response)).toEqual({ status: "configuration_unavailable" });
    expect(providerFetch).not.toHaveBeenCalled();
    expect(await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect())).toEqual([]);
  });

  it("rejects an expired verification token without activating the subscriber", async () => {
    const providerFetch = vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => new Response(JSON.stringify({ id: "email_fixture" }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);
    const t = convexTest(schema, modules);
    await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "expired@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.9",
      }),
    );
    const providerRequest = providerFetch.mock.calls[0]?.[1] as RequestInit;
    const providerBody = JSON.parse(String(providerRequest.body)) as { html: string };
    const verificationToken = providerBody.html.match(/verify\?token=([^"&]+)/)?.[1];
    expect(verificationToken).toBeTruthy();
    await t.run(async (ctx) => {
      const subscriber = await ctx.db.query("emailSubscribers").unique();
      await ctx.db.patch(subscriber!._id, { verificationTokenExpiresAt: 0 });
    });

    const response = await t.fetch(
      "/watchlist/verify",
      request({ token: decodeURIComponent(verificationToken!) }),
    );
    expect(await bodyStatus(response)).toEqual({ status: "invalid_or_expired" });
    const subscriber = await t.run(async (ctx) => ctx.db.query("emailSubscribers").unique());
    expect(subscriber?.status).toBe("pending");
  });

  it("rolls back a new record and stays non-enumerating when the provider rejects delivery", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rejected", { status: 422 })));
    const t = convexTest(schema, modules);
    const response = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "failure@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.3",
      }),
    );
    expect(response.status).toBe(200);
    expect(await bodyStatus(response)).toEqual({ status: "accepted" });
    expect(await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect())).toEqual([]);
  });

  it("returns the same public outcome for existing and unknown addresses during an outage", async () => {
    const providerFetch = vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "email_fixture" }), { status: 200 }))
      .mockResolvedValue(new Response("rejected", { status: 503 }));
    vi.stubGlobal("fetch", providerFetch);
    const t = convexTest(schema, modules);
    await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "existing@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.10",
      }),
    );

    const existing = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "existing@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.11",
      }),
    );
    const unknown = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "unknown@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.12",
      }),
    );
    expect(await bodyStatus(existing)).toEqual({ status: "accepted" });
    expect(await bodyStatus(unknown)).toEqual({ status: "accepted" });
    expect(providerFetch).toHaveBeenCalledTimes(2);
    const records = await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect());
    expect(records.map((record) => record.email)).toEqual(["existing@example.com"]);
  });

  it("limits repeated attempts by a keyed request identifier", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "email_fixture" }), { status: 200 })),
    );
    const t = convexTest(schema, modules);
    for (let index = 0; index < WATCHLIST_RATE_LIMIT_MAX_ATTEMPTS; index += 1) {
      const response = await t.fetch(
        "/watchlist/subscribe",
        request({
          email: `research-${index}@example.com`,
          consent: true,
          company: "",
          requestKey: "203.0.113.4",
        }),
      );
      expect(response.status).toBe(200);
    }
    const limited = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "research-limited@example.com",
        consent: true,
        company: "",
        requestKey: "203.0.113.4",
      }),
    );
    expect(limited.status).toBe(429);
    expect(await bodyStatus(limited)).toEqual({ status: "rate_limited" });
  });

  it("uses a generic success response for honeypot submissions", async () => {
    const providerFetch = vi.fn();
    vi.stubGlobal("fetch", providerFetch);
    const t = convexTest(schema, modules);
    const response = await t.fetch(
      "/watchlist/subscribe",
      request({
        email: "bot@example.com",
        consent: true,
        company: "filled-by-bot",
        requestKey: "203.0.113.5",
      }),
    );
    expect(await bodyStatus(response)).toEqual({ status: "accepted" });
    expect(providerFetch).not.toHaveBeenCalled();
    expect(await t.run(async (ctx) => ctx.db.query("emailSubscribers").collect())).toEqual([]);
  });
});
