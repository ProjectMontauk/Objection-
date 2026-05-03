import Link from "next/link";
import { FlowStepsVisualizer } from "@/components/flow/FlowStepsVisualizer";
import { MisrepresentedLoopVideo } from "@/components/MisrepresentedLoopVideo";
import { SiteShell } from "@/components/flow/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      <MisrepresentedLoopVideo />
      <main className="wip-shell mx-auto w-full max-w-6xl flex-1 border-b border-rule">
        <section className="bg-field-muted px-6 py-12 sm:px-10 sm:py-16">
          <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Interview vs. press
          </p>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Misrepresented in the media?
          </h2>
          <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink-muted">
            Citizen Kane compares your recording to the published article: how
            faithfully quotes and context hold up, what was left out, and an
            overall read—so you can see the gap between the room and the story.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/flow/recording"
              className="inline-block border-2 border-double border-rule bg-cta-bg px-8 py-3.5 font-sans text-base font-semibold text-cta-fg transition hover:bg-cta-hover"
            >
              Start verification
            </Link>
          </div>
          <FlowStepsVisualizer />
          <p className="mt-8 max-w-lg font-sans text-xs leading-relaxed text-ink-muted">
            Four steps from upload to truthfulness scorecard. Copy or share the
            compact card if you like—treat every score as editorial signal, not
            a legal finding.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
