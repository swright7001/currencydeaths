import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeWatchlist } from "../../actions/watchlist";
import { TokenActionForm } from "../../../components/watchlist/token-action-form";

export const metadata: Metadata = {
  title: "Leave Watchlist",
  description: "Process a CurrencyDeaths watchlist unsubscribe request.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/watchlist/unsubscribe" },
  referrer: "no-referrer",
};

export default async function UnsubscribeWatchlistPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <main id="main-content" className="watchlist-token-page">
      <div className="shell-container">
        <p className="section-kicker">Watchlist / leave</p>
        <h1>Stop watchlist email.</h1>
        <p>The result stays generic so this page cannot reveal whether an address was subscribed.</p>
        <TokenActionForm
          action={unsubscribeWatchlist}
          token={token}
          buttonLabel="Process unsubscribe"
          idleMessage={token ? "Submit once to process this request." : "This unsubscribe link is incomplete."}
        />
        <Link href="/">Return to CurrencyDeaths →</Link>
      </div>
    </main>
  );
}
