const STEPS = [
  { n: "1", title: "Upload MP4", subtitle: "of the video" },
  { n: "2", title: "Article link", subtitle: "URL or paste" },
  { n: "3", title: "AI analysis", subtitle: "model comparison" },
  { n: "4", title: "Truthfulness score", subtitle: "scorecard produced" },
] as const;

export function FlowStepsVisualizer() {
  return (
    <div
      className="mt-10 w-full max-w-3xl border border-rule bg-field px-4 py-5 sm:px-6"
      aria-label="Verification flow"
    >
      <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        How it works
      </p>
      <ol className="mt-4 grid grid-cols-1 divide-y divide-rule sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {STEPS.map((s) => (
          <li key={s.n} className="min-w-0 py-3 sm:px-2 sm:py-3">
            <div className="flex flex-col">
              <span className="flex h-8 w-8 items-center justify-center border border-rule bg-tag-bg font-sans text-xs font-bold text-tag-fg">
                {s.n}
              </span>
              <span className="mt-2 font-sans text-sm font-semibold text-ink">
                {s.title}
              </span>
              <span className="mt-0.5 font-sans text-xs leading-snug text-ink-muted">
                {s.subtitle}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
