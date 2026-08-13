import type { Metadata } from "next";
import Link from "next/link";
import { confirmWatchlist } from "../../actions/watchlist";
import { TokenActionForm } from "../../../components/watchlist/token-action-form";

export const metadata: Metadata = {
  title: "Confirm Watchlist",
  description: "Confirm a CurrencyDeaths research watchlist request.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/watchlist/verify" },
  referrer: "no-referrer",
};

export default async function VerifyWatchlistPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <main id="main-content" className="watchlist-token-page">
      <div className="shell-container">
        <p className="section-kicker">Double opt-in / confirmation</p>
        <h1>Confirm the research watchlist.</h1>
        <p>This step proves that the mailbox owner requested CurrencyDeaths research dispatches.</p>
        <TokenActionForm
          action={confirmWatchlist}
          token={token}
          buttonLabel="Confirm signup"
          idleMessage={token ? "No subscription is active until you confirm." : "This confirmation link is incomplete."}
        />
        <Link href="/">Return to CurrencyDeaths →</Link>
      </div>
    </main>
  );
}
