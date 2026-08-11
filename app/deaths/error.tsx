"use client";

export default function DeathsError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main id="main-content" className="archive-state-page">
      <div className="shell-container archive-state-card" role="alert">
        <p className="section-kicker">Archive query / interrupted</p>
        <h1>The record could not be assembled</h1>
        <p>No result has been inferred. Retry the source-backed archive query.</p>
        <button type="button" onClick={reset}>
          Retry archive
        </button>
      </div>
    </main>
  );
}
