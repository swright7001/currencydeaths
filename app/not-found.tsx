import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="archive-state-page">
      <div className="shell-container archive-state-card">
        <p className="section-kicker">404 / record absent</p>
        <h1>This page is not in the archive.</h1>
        <p>
          No substitute record has been inferred. Return to the verified currency
          archive or the research homepage.
        </p>
        <div className="global-state-actions">
          <Link href="/deaths">Explore verified records</Link>
          <Link href="/">Return home</Link>
        </div>
      </div>
    </main>
  );
}
