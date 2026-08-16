import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell-container site-footer__grid">
        <div className="site-footer__statement">
          <p className="section-kicker">Research standard</p>
          <p>
            History first. Sources visible. Interpretation clearly marked.
          </p>
        </div>

        <div className="site-footer__index">
          <span>Independent monetary research</span>
          <span>Educational use</span>
          <span>No live claims in this release</span>
        </div>

        <div className="site-footer__legal">
          <Link href="/about">About</Link>
          <Link href="/methodology/dollar-stress-score">Methodology</Link>
          <span>© {new Date().getFullYear()} CurrencyDeaths</span>
        </div>
      </div>
    </footer>
  );
}
