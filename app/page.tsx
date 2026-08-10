export default function Home() {
  return (
    <main id="main-content" className="home-opening">
      <div className="shell-container home-opening__grid">
        <section className="home-opening__copy" aria-labelledby="project-title">
          <p className="section-kicker">Monetary history research archive</p>
          <h1 id="project-title">
            Every currency
            <span>leaves a record.</span>
          </h1>
          <p className="home-opening__lede">
            CurrencyDeaths documents how monetary systems changed, failed, and
            were replaced—without turning interpretation into fact.
          </p>
          <div className="home-opening__rule" aria-hidden="true">
            <span />
          </div>
          <p className="home-opening__note">
            The archive is being assembled through source-disciplined,
            independently reviewed releases.
          </p>
        </section>

        <aside className="release-dossier" aria-labelledby="release-title">
          <div className="release-dossier__header">
            <p id="release-title">Foundation status</p>
            <span>CD / 000</span>
          </div>
          <dl>
            <div>
              <dt>Application shell</dt>
              <dd data-status="active">Active</dd>
            </div>
            <div>
              <dt>Historical records</dt>
              <dd>Pending review</dd>
            </div>
            <div>
              <dt>Dollar metrics</dt>
              <dd>Withheld</dd>
            </div>
            <div>
              <dt>Published claims</dt>
              <dd className="metric-numerals">00</dd>
            </div>
          </dl>
          <p className="release-dossier__notice">
            No live data, risk score, countdown date, or historical claim is
            published in this foundation release.
          </p>
        </aside>
      </div>
    </main>
  );
}
