import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the Research",
  description:
    "How CurrencyDeaths separates sourced monetary history, derived analysis, development fixtures, and interpretation.",
  alternates: { canonical: "/about" },
};

const evidenceStates = [
  {
    label: "Sourced",
    detail: "A claim is tied to a named publication and an access date.",
  },
  {
    label: "Derived",
    detail: "A calculation exposes its inputs, formula, and versioned method.",
  },
  {
    label: "Development fixture",
    detail: "Illustrative interface data is visibly separated from live evidence.",
  },
  {
    label: "Interpretation",
    detail: "Editorial framing is identified so it cannot masquerade as a measured fact.",
  },
  {
    label: "Unavailable",
    detail: "Missing evidence stays missing. It is never silently converted to zero.",
  },
] as const;

const researchRules = [
  "Currency replacement, redenomination, collapse, and historical retirement remain distinct outcomes.",
  "Date precision is preserved; year-level evidence does not become an invented day or month.",
  "The Dollar Stress Score is an experimental index, not a collapse probability or predicted death date.",
  "The cinematic hero displays the approved index and component evidence; it is not a time-to-failure countdown.",
  "Historical similarities provide context. They do not prove that two monetary systems share an outcome.",
] as const;

export default function AboutPage() {
  return (
    <main id="main-content" className="about-page">
      <section className="about-hero">
        <div className="shell-container about-hero__grid">
          <div>
            <p className="section-kicker">About / research charter</p>
            <h1>
              Study the ending.
              <em>Question the analogy.</em>
            </h1>
            <p>
              CurrencyDeaths is an educational monetary-history archive and
              dollar-stress research instrument. Its job is to make difficult
              history legible without turning uncertainty into spectacle.
            </p>
          </div>

          <aside aria-label="Current release boundary">
            <span>Release boundary / 01</span>
            <strong>Research build</strong>
            <p>
              The archive begins with a limited, reviewed seed. It is not a
              representative census of every currency or monetary system.
            </p>
          </aside>
        </div>
      </section>

      <section className="shell-container about-purpose" aria-labelledby="purpose-title">
        <header>
          <p className="section-kicker">Mission / three jobs</p>
          <h2 id="purpose-title">History before prophecy.</h2>
        </header>
        <div className="about-purpose__grid">
          <article>
            <span aria-hidden="true">01</span>
            <h3>Archive</h3>
            <p>
              Document how currencies began, changed, and ended with sources
              close to the claims they support.
            </p>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <h3>Explain</h3>
            <p>
              Separate political context, economic mechanisms, and lived
              consequences instead of reducing every ending to one cause.
            </p>
          </article>
          <article>
            <span aria-hidden="true">03</span>
            <h3>Compare</h3>
            <p>
              Place current dollar indicators beside history while keeping
              comparison distinct from prediction.
            </p>
          </article>
        </div>
      </section>

      <section className="about-evidence" aria-labelledby="evidence-title">
        <div className="shell-container">
          <header>
            <div>
              <p className="section-kicker">Evidence states / always visible</p>
              <h2 id="evidence-title">Know what you are looking at.</h2>
            </div>
            <p>
              Every important number or claim should announce its evidence state
              before it asks for belief.
            </p>
          </header>
          <ol className="about-evidence__grid">
            {evidenceStates.map((state, index) => (
              <li key={state.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{state.label}</h3>
                <p>{state.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell-container about-standard" aria-labelledby="standard-title">
        <div>
          <p className="section-kicker">Research standard / non-negotiable</p>
          <h2 id="standard-title">Provocative frame. Auditable core.</h2>
          <p>
            The visual language can carry tension. The research layer must carry
            provenance, limitations, and the ability to say “unavailable.”
          </p>
          <Link href="/methodology/dollar-stress-score">
            Inspect the stress-score method →
          </Link>
        </div>
        <ol>
          {researchRules.map((rule, index) => (
            <li key={rule}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <p>{rule}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-resolution" aria-labelledby="resolution-title">
        <div className="shell-container about-resolution__grid">
          <div>
            <p className="section-kicker">Start with the record</p>
            <h2 id="resolution-title">Read the source trail, then form the view.</h2>
          </div>
          <Link href="/deaths">Explore verified cases →</Link>
        </div>
      </section>
    </main>
  );
}
