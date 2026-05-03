"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { parseCompareResult } from "@/lib/compareTypes";
import { useFlow } from "./FlowContext";

export function AnalysisStep() {
  const router = useRouter();
  const { transcript, articleText, setCompareResult, setCompareMeta } =
    useFlow();

  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const canCompare =
    transcript.trim().length >= 80 && articleText.trim().length >= 80;

  useEffect(() => {
    if (!canCompare) {
      router.replace(
        transcript.trim().length < 80
          ? "/flow/recording"
          : "/flow/article",
      );
    }
  }, [canCompare, router, transcript]);

  const onCompare = useCallback(async () => {
    setError(null);
    setComparing(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, article: articleText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Comparison failed.");
      }
      const parsed = parseCompareResult(data.result);
      if (!parsed) {
        throw new Error("Could not read the editor’s report. Try again.");
      }
      flushSync(() => {
        setCompareResult(parsed);
        if (data.meta && typeof data.meta === "object") {
          const m = data.meta as Record<string, unknown>;
          setCompareMeta({
            model: String(m.model ?? ""),
            transcriptTruncated: Boolean(m.transcriptTruncated),
            articleTruncated: Boolean(m.articleTruncated),
          });
        }
      });
      router.push("/flow/score");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setComparing(false);
    }
  }, [
    articleText,
    router,
    setCompareMeta,
    setCompareResult,
    transcript,
  ]);

  if (!canCompare) {
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
          Step 3 · AI analysis
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">
          Run the comparison
        </h2>
        <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-ink-muted">
          We send your transcript and article to the model for five scored
          dimensions plus a desk note. When it finishes, you&apos;ll move to the
          truthfulness scorecard automatically.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCompare}
            disabled={comparing}
            className="border-2 border-double border-rule bg-cta-bg px-6 py-3 font-sans text-base font-semibold text-cta-fg transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comparing ? "Running analysis…" : "Run AI analysis"}
          </button>
          <Link
            href="/flow/article"
            className="font-sans text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            ← Back to article
          </Link>
        </div>
      </section>
    </div>
  );
}
