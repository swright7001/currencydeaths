import {
  FRED_REFRESH_BACKOFF_MS,
  FRED_REFRESH_MAX_ATTEMPTS,
  FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES,
  FRED_REFRESH_MAX_RESPONSE_BYTES,
  FRED_REFRESH_TIMEOUT_MS,
} from "./fred-refresh-contract";

export class FredRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "FredRequestError";
  }
}

type FetchPolicy = Readonly<{
  fetcher?: typeof fetch;
  waiter?: (milliseconds: number) => Promise<unknown>;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: readonly number[];
  maxResponseBytes?: number;
}>;

export function validateFredApiKey(value: string | undefined) {
  if (value === undefined || !/^[a-z0-9]{32}$/.test(value)) {
    throw new FredRequestError("fred_api_key_unavailable");
  }
  return value;
}

export function buildFredEndpoint(
  path: "series" | "series/observations",
  seriesId: string,
  apiKey: string,
) {
  const url = new URL(`https://api.stlouisfed.org/fred/${path}`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  if (path === "series/observations") {
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", String(FRED_REFRESH_MAX_OBSERVATIONS_PER_SERIES));
  }
  return url;
}

async function readBoundedBody(response: Response, maximumBytes: number) {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    const length = Number(lengthHeader);
    if (!Number.isInteger(length) || length < 0) {
      throw new FredRequestError("fred_content_length_invalid");
    }
    if (length > maximumBytes) throw new FredRequestError("fred_response_too_large");
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytesRead += chunk.value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      throw new FredRequestError("fred_response_too_large");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

export async function fetchFredJson(url: URL, policy: FetchPolicy = {}) {
  const fetcher = policy.fetcher ?? fetch;
  const waiter = policy.waiter ?? ((milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const timeoutMs = policy.timeoutMs ?? FRED_REFRESH_TIMEOUT_MS;
  const maxAttempts = policy.maxAttempts ?? FRED_REFRESH_MAX_ATTEMPTS;
  const backoffMs = policy.backoffMs ?? FRED_REFRESH_BACKOFF_MS;
  const maxResponseBytes = policy.maxResponseBytes ?? FRED_REFRESH_MAX_RESPONSE_BYTES;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if ((backoffMs[attempt] ?? 0) > 0) await waiter(backoffMs[attempt] ?? 0);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      const retryable = response.status === 429 || response.status >= 500;
      if (!response.ok) {
        if (retryable && attempt + 1 < maxAttempts) continue;
        throw new FredRequestError(`fred_http_${response.status}`);
      }
      const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim();
      if (contentType !== "application/json") throw new FredRequestError("fred_content_type");
      const text = await readBoundedBody(response, maxResponseBytes);
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new FredRequestError("fred_invalid_json");
      }
    } catch (error) {
      if (error instanceof FredRequestError) throw error;
      if (attempt + 1 >= maxAttempts) {
        throw new FredRequestError(
          error instanceof DOMException && error.name === "AbortError"
            ? "fred_timeout"
            : "fred_network",
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new FredRequestError("fred_attempts_exhausted");
}
