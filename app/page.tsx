export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section
        aria-labelledby="project-title"
        className="w-full max-w-2xl border border-zinc-800 bg-zinc-950 p-8 sm:p-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-red-500">
          Research project foundation
        </p>
        <h1
          id="project-title"
          className="mt-4 text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl"
        >
          CurrencyDeaths
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
          An educational monetary-history and purchasing-power research project.
          The research experience is being built through independently reviewed,
          source-disciplined releases.
        </p>
        <p className="mt-10 border-l-2 border-red-700 pl-4 text-sm leading-6 text-zinc-500">
          No live data, risk score, or currency claims are published in this
          foundation release.
        </p>
      </section>
    </main>
  );
}
