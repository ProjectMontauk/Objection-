"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DIMENSIONS,
  type ComparePayload,
} from "@/lib/compareTypes";
import {
  averageScore1to10,
  averageScoreOutOf100,
  scoreAsShareable100,
} from "@/lib/scoreDisplay";
import { buildShareSummary } from "./shareSummary";
import { ScoreBar } from "./ScoreBar";
import type { CompareMeta } from "./FlowContext";
import { useFlow } from "./FlowContext";

export function ScoreStep() {
  const router = useRouter();
  const { transcript, articleText, compareResult, compareMeta } = useFlow();

  const [error, setError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const canCompare =
    transcript.trim().length >= 80 && articleText.trim().length >= 80;

  useEffect(() => {
    if (!canCompare) {
      router.replace(
        transcript.trim().length < 80
          ? "/flow/recording"
          : "/flow/article",
      );
      return;
    }
    if (!compareResult) {
      router.replace("/flow/analysis");
    }
  }, [articleText, canCompare, compareResult, router, transcript]);

  const copyShare = useCallback(async () => {
    if (!compareResult) return;
    const text = buildShareSummary(compareResult);
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2500);
    } catch {
      setError("Could not copy to the clipboard.");
    }
  }, [compareResult]);

  const nativeShare = useCallback(async () => {
    if (!compareResult) return;
    const text = buildShareSummary(compareResult);
    try {
      if (navigator.share && navigator.canShare?.({ text })) {
        await navigator.share({ text, title: "Citizen Kane scorecard" });
      } else {
        await copyShare();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        await copyShare();
      }
    }
  }, [compareResult, copyShare]);

  if (!canCompare || !compareResult) {
    return (
      <p className="p-8 text-center font-sans text-sm text-ink-muted">
        Redirecting…
      </p>
    );
  }

  return (
    <div className="min-w-0 divide-y divide-rule">
      {error ? (
        <aside
          className="bg-field-muted px-5 py-4 text-sm text-ink"
          role="alert"
        >
          <strong className="font-sans font-bold uppercase tracking-wide">
            Correction.{" "}
          </strong>
          {error}
        </aside>
      ) : null}

      <section className="bg-field-muted px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-4 inline-block border border-rule bg-tag-bg px-2 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-widest text-tag-fg">
          Step 4 · Truthfulness score
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">
          Your scorecard
        </h2>
        <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-ink-muted">
          Overall plus four dimensions and the full desk report below. Copy or
          share the compact card—model-assisted, not a legal finding.
        </p>
      </section>

      <ScorecardSection
        compareResult={compareResult}
        compareMeta={compareMeta}
        copyDone={copyDone}
        onCopy={copyShare}
        onShare={nativeShare}
      />

      <section className="bg-field-muted px-5 py-6 sm:px-8">
        <Link
          href="/flow/analysis"
          className="font-sans text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Run analysis again
        </Link>
        {" · "}
        <Link
          href="/flow/article"
          className="font-sans text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Edit article
        </Link>
        {" · "}
        <Link
          href="/flow/recording"
          className="font-sans text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Edit recording
        </Link>
      </section>
    </div>
  );
}

function ScorecardSection({
  compareResult,
  compareMeta,
  copyDone,
  onCopy,
  onShare,
}: {
  compareResult: ComparePayload;
  compareMeta: CompareMeta | null;
  copyDone: boolean;
  onCopy: () => void;
  onShare: () => void;
}) {
  const overall = averageScoreOutOf100(compareResult);

  return (
    <>
      <section className="border-t border-rule bg-field-muted px-5 py-8 sm:px-8">
        <div
          id="scorecard"
          className="mx-auto max-w-2xl border-2 border-rule bg-field p-6 sm:p-8"
        >
          <p className="text-center font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Citizen Kane
          </p>
          <p className="mt-1 text-center font-serif text-lg text-ink">
            Truthfulness scorecard
          </p>
          <p className="mt-1 text-center font-sans text-[0.65rem] text-ink-muted">
            Per-category scores out of 100 · overall is their arithmetic mean
          </p>
          <div className="mt-6 flex flex-col items-center border-y border-rule py-6">
            <span className="font-sans text-xs uppercase tracking-widest text-ink-muted">
              Overall (average)
            </span>
            <span className="masthead-title mt-1 text-5xl font-semibold tabular-nums text-ink sm:text-6xl">
              {overall}
              <span className="text-2xl text-ink-muted">/100</span>
            </span>
            <p className="mt-3 max-w-md text-center font-serif text-sm font-semibold italic text-wip-navy">
              {compareResult.overall.headline}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
            {DIMENSIONS.filter((x) => x.key !== "overall").map(({ key, label }) => {
              const d = compareResult[key];
              return (
                <div
                  key={key}
                  className="border border-rule bg-field-muted px-2 py-3 text-center"
                >
                  <p className="font-sans text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-ink">
                    {scoreAsShareable100(d.score)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onCopy}
              className="border border-rule bg-cta-bg px-4 py-2 font-sans text-sm font-semibold text-cta-fg transition hover:bg-cta-hover"
            >
              {copyDone ? "Copied" : "Copy scorecard"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="border border-rule px-4 py-2 font-sans text-sm font-semibold text-ink transition hover:border-wip-navy hover:text-wip-navy"
            >
              Share…
            </button>
          </div>
        </div>
      </section>

      <section className="bg-field-muted">
        <div className="bg-wip-navy-surface px-6 py-8 text-center text-white sm:py-10">
          <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/80">
            Memorandum
          </p>
          <h2 className="masthead-title mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Desk report
          </h2>
          {compareMeta ? (
            <p className="mt-3 font-sans text-xs text-white/75">
              Filed by {compareMeta.model}
              {compareMeta.transcriptTruncated || compareMeta.articleTruncated
                ? " · analysis used truncated sources"
                : ""}
            </p>
          ) : null}
        </div>

        <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-rule">
          {DIMENSIONS.map(({ key, label, dek }) => {
            const d = compareResult[key];
            const barScore =
              key === "overall"
                ? averageScore1to10(compareResult)
                : d.score;
            return (
              <article
                key={key}
                className="flex flex-col border-b border-rule p-5 sm:border-b-0 sm:p-6"
              >
                <h3 className="font-serif text-xl font-semibold text-ink">
                  {label}
                </h3>
                <p className="mt-1 font-sans text-xs leading-snug text-ink-muted">
                  {dek}
                </p>
                <ScoreBar score={barScore} />
                <p className="mt-3 font-serif text-sm font-semibold italic text-wip-navy">
                  {d.headline}
                </p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink">
                  {d.analysis}
                </p>
              </article>
            );
          })}
        </div>

        <article className="border-t border-rule bg-field-muted px-6 py-8 sm:px-8">
          <h3 className="font-serif text-xl font-semibold text-ink">
            The ledger
          </h3>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink">
            {compareResult.ledger}
          </p>
        </article>
      </section>
    </>
  );
}
