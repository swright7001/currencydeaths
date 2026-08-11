"use client";

import { useActionState } from "react";
import type { WatchlistActionState } from "../../app/actions/watchlist";

type TokenAction = (
  previousState: WatchlistActionState,
  formData: FormData,
) => Promise<WatchlistActionState>;

export function TokenActionForm({
  action,
  token,
  buttonLabel,
  idleMessage,
}: Readonly<{
  action: TokenAction;
  token: string;
  buttonLabel: string;
  idleMessage: string;
}>) {
  const initialState: WatchlistActionState = {
    status: "idle",
    message: idleMessage,
  };
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form className="watchlist-token-form" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pending || token.length === 0}>
        {pending ? "Processing…" : buttonLabel}
      </button>
      <p aria-live="polite" data-state={state.status}>{state.message}</p>
    </form>
  );
}
