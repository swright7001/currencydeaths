"use server";

import { headers } from "next/headers";
import type { WatchlistPublicResult, WatchlistPublicStatus } from "../../lib/watchlist";

export type WatchlistActionState = Readonly<{
  status: "idle" | WatchlistPublicStatus;
  message: string;
}>;

function messageForStatus(status: WatchlistPublicStatus): string {
  switch (status) {
    case "accepted":
      return "If this address is eligible, the request has been received. Check your inbox for a confirmation message.";
    case "confirmed":
      return "Your watchlist email is confirmed.";
    case "invalid_request":
      return "Enter a valid email and confirm consent to continue.";
    case "invalid_or_expired":
      return "This link is invalid or expired. Submit the watchlist form again if needed.";
    case "rate_limited":
      return "Too many attempts were received. Wait an hour before trying again.";
    case "configuration_unavailable":
      return "Watchlist intake is not configured in this environment. No address was stored.";
    case "temporary_error":
      return "The request could not be processed right now. Try again later.";
  }
}

async function invokeWatchlist(
  path: "subscribe" | "verify" | "unsubscribe",
  payload: Record<string, unknown>,
): Promise<WatchlistActionState> {
  const siteUrl = process.env.WATCHLIST_CONVEX_SITE_URL;
  const actionSecret = process.env.WATCHLIST_ACTION_SECRET;
  if (!siteUrl || !actionSecret) {
    const status = "configuration_unavailable" as const;
    return { status, message: messageForStatus(status) };
  }
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/watchlist/${path}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${actionSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as Partial<WatchlistPublicResult>;
    const status = result.status ?? "temporary_error";
    return { status, message: messageForStatus(status) };
  } catch {
    const status = "temporary_error" as const;
    return { status, message: messageForStatus(status) };
  }
}

export async function submitWatchlist(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const requestKey = (forwardedFor || realIp || "unknown").slice(0, 128);
  return invokeWatchlist("subscribe", {
    email: formData.get("email"),
    consent: formData.get("consent") === "on",
    company: formData.get("company"),
    requestKey,
  });
}

export async function confirmWatchlist(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  return invokeWatchlist("verify", { token: formData.get("token") });
}

export async function unsubscribeWatchlist(
  _previousState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  return invokeWatchlist("unsubscribe", { token: formData.get("token") });
}
