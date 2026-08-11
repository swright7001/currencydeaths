export const WATCHLIST_CONSENT_VERSION = "watchlist-research-v1";
export const WATCHLIST_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const WATCHLIST_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const WATCHLIST_RATE_LIMIT_MAX_ATTEMPTS = 5;

export type WatchlistPublicStatus =
  | "accepted"
  | "confirmed"
  | "invalid_request"
  | "invalid_or_expired"
  | "rate_limited"
  | "configuration_unavailable"
  | "temporary_error";

export type WatchlistPublicResult = Readonly<{
  status: WatchlistPublicStatus;
}>;

const emailLocalPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const domainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeWatchlistEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || /[\u0000-\u001f\u007f]/.test(email)) {
    return null;
  }
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (
    local.length < 1 ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !emailLocalPattern.test(local)
  ) {
    return null;
  }
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !domainLabelPattern.test(label))) {
    return null;
  }
  return email;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createWatchlistLookupHash(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function createWatchlistTokenHash(token: string) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

export function createWatchlistToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function secretsMatch(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildWatchlistConfirmationEmail(
  publicUrl: string,
  verificationToken: string,
  unsubscribeToken: string,
) {
  const baseUrl = publicUrl.replace(/\/$/, "");
  const verificationUrl = `${baseUrl}/watchlist/verify?token=${encodeURIComponent(verificationToken)}`;
  const unsubscribeUrl = `${baseUrl}/watchlist/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const escapedVerificationUrl = escapeHtml(verificationUrl);
  const escapedUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  return {
    subject: "Confirm your CurrencyDeaths research watchlist",
    html: `<p>Confirm that you want CurrencyDeaths research dispatches.</p><p><a href="${escapedVerificationUrl}">Confirm watchlist signup</a></p><p>If you did not request this, you can <a href="${escapedUnsubscribeUrl}">decline and unsubscribe</a>.</p>`,
    text: `Confirm your CurrencyDeaths research watchlist: ${verificationUrl}\n\nIf you did not request this, decline and unsubscribe: ${unsubscribeUrl}`,
    verificationUrl,
    unsubscribeUrl,
  } as const;
}
