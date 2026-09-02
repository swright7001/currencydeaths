import { describe, expect, it, vi } from "vitest";
import {
  buildFredEndpoint,
  fetchFredJson,
  FredRequestError,
  validateFredApiKey,
} from "../lib/data/fred-api-client";

function jsonResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("bounded FRED API client", () => {
  it("validates the server credential and builds only approved request shapes", () => {
    expect(() => validateFredApiKey(undefined)).toThrow("fred_api_key_unavailable");
    expect(() => validateFredApiKey("not-a-key")).toThrow("fred_api_key_unavailable");
    const key = "a".repeat(32);
    expect(validateFredApiKey(key)).toBe(key);
    const url = buildFredEndpoint("series/observations", "M2SL", key);
    expect(url.origin).toBe("https://api.stlouisfed.org");
    expect(url.searchParams.get("series_id")).toBe("M2SL");
    expect(url.searchParams.get("limit")).toBe("120");
  });

  it("retries only retryable statuses with the approved backoff", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse("{}", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse('{"ok":true}'));
    const waiter = vi.fn().mockResolvedValue(undefined);
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher,
      waiter,
      maxAttempts: 2,
      backoffMs: [0, 1_000],
    })).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(waiter).toHaveBeenCalledWith(1_000);

    const unauthorized = vi.fn().mockResolvedValue(jsonResponse("{}", { status: 401 }));
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher: unauthorized,
      maxAttempts: 3,
    })).rejects.toMatchObject({ code: "fred_http_401" } satisfies Partial<FredRequestError>);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it("rejects content-type, invalid JSON, and a declared oversized body", async () => {
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher: async () => new Response("{}", { headers: { "content-type": "text/html" } }),
      maxAttempts: 1,
    })).rejects.toMatchObject({ code: "fred_content_type" });
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher: async () => jsonResponse("{"),
      maxAttempts: 1,
    })).rejects.toMatchObject({ code: "fred_invalid_json" });
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher: async () => jsonResponse("{}", { headers: { "content-length": "9" } }),
      maxAttempts: 1,
      maxResponseBytes: 8,
    })).rejects.toMatchObject({ code: "fred_response_too_large" });
  });

  it("enforces the byte cap while streaming a body without Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12345"));
        controller.enqueue(new TextEncoder().encode("67890"));
        controller.close();
      },
    });
    await expect(fetchFredJson(new URL("https://example.test"), {
      fetcher: async () => new Response(body, { headers: { "content-type": "application/json" } }),
      maxAttempts: 1,
      maxResponseBytes: 8,
    })).rejects.toMatchObject({ code: "fred_response_too_large" });
  });

  it("aborts and redacts a timed-out request", async () => {
    const fetcher = vi.fn((_input: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("provider detail", "AbortError")));
      }));
    await expect(fetchFredJson(new URL("https://example.test/private"), {
      fetcher: fetcher as typeof fetch,
      maxAttempts: 1,
      timeoutMs: 5,
    })).rejects.toEqual(expect.objectContaining({ code: "fred_timeout", message: "fred_timeout" }));
  });
});
