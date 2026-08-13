"use client";

import Link from "next/link";

export default function RootError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main id="main-content" className="archive-state-page">
      <div className="shell-container archive-state-card" role="alert">
        <p className="section-kicker">Research view / interrupted</p>
        <h1>The page could not be assembled.</h1>
        <p>
          No value or conclusion has been inferred from the failure. Retry the
          request or return to the source-backed archive.
        </p>
        <div className="global-state-actions">
          <button type="button" onClick={reset}>Retry page</button>
          <Link href="/deaths">Open the archive</Link>
        </div>
      </div>
    </main>
  );
}
