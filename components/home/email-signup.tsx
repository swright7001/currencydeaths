"use client";

import { useActionState } from "react";
import { submitWatchlist, type WatchlistActionState } from "../../app/actions/watchlist";

const initialWatchlistActionState: WatchlistActionState = {
  status: "idle",
  message: "",
};

export function EmailSignup() {
  const [state, formAction, pending] = useActionState(
    submitWatchlist,
    initialWatchlistActionState,
  );
  const hasMessage = state.status !== "idle";

  return (
    <form className="email-signup" action={formAction} aria-describedby="watchlist-consent watchlist-status">
      <div className="email-signup__field">
        <label htmlFor="watchlist-email">Email address</label>
        <div>
          <input
            id="watchlist-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={pending}
            placeholder="research@example.com"
          />
          <button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Join watchlist"}
          </button>
        </div>
      </div>
      <div className="email-signup__honeypot" aria-hidden="true">
        <label htmlFor="watchlist-company">Company</label>
        <input id="watchlist-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="email-signup__consent" id="watchlist-consent">
        <input name="consent" type="checkbox" required disabled={pending} />
        <span>I agree to receive CurrencyDeaths research and watchlist emails. No financial alerts yet. Unsubscribe anytime.</span>
      </label>
      <p
        id="watchlist-status"
        className="email-signup__status"
        data-state={state.status}
        aria-live="polite"
      >
        {hasMessage ? state.message : "Double opt-in required. Your address stays pending until confirmed."}
      </p>
    </form>
  );
}
