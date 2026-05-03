"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "./FlowContext";

export function ArticleStep() {
  const router = useRouter();
  const {
    transcript,
    articleUrl,
    setArticleUrl,
    articleText,
    setArticleText,
    articleTitle,
    setArticleTitle,
    articleTruncated,
    setArticleTruncated,
    setCompareResult,
    setCompareMeta,
  } = useFlow();

  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transcript.trim().length < 80) {
      router.replace("/flow/recording");
    }
  }, [router, transcript]);

  const onPullArticle = useCallback(async () => {
    setError(null);
    setCompareResult(null);
    setCompareMeta(null);
    setFetchingArticle(true);
    try {
      const res = await fetch("/api/fetch-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not fetch the article.");
      }
      setArticleText(String(data.text || ""));
      setArticleTitle(typeof data.title === "string" ? data.title : null);
      setArticleTruncated(Boolean(data.truncated));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not fetch the article.",
      );
    } finally {
      setFetchingArticle(false);
    }
  }, [
    articleUrl,
    setArticleText,
    setArticleTitle,
    setArticleTruncated,
    setCompareMeta,
    setCompareResult,
  ]);

  const canContinue = articleText.trim().length >= 80;

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
          Step 2 · Article
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">
          Add the published story
        </h2>
        <p className="mt-3 max-w-prose text-pretty font-sans text-sm leading-relaxed text-ink-muted">
          Paste a link and fetch the text, or paste the article body yourself.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={articleUrl}
            onChange={(e) => setArticleUrl(e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1 border border-rule bg-field-muted px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-muted/60 focus:border-wip-navy focus:outline-none focus:ring-1 focus:ring-wip-navy/25"
          />
          <button
            type="button"
            onClick={onPullArticle}
            disabled={fetchingArticle || !articleUrl.trim()}
            className="border border-rule bg-cta-bg px-5 py-2 font-sans text-sm font-semibold text-cta-fg transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fetchingArticle ? "Fetching…" : "Fetch article"}
          </button>
        </div>
        {articleTitle ? (
          <p className="mt-3 font-sans text-xs uppercase tracking-widest text-ink-muted">
            Running head:{" "}
            <span className="font-serif normal-case tracking-normal text-ink">
              {articleTitle}
            </span>
          </p>
        ) : null}
        {articleTruncated ? (
          <p className="mt-2 font-sans text-xs text-wip-navy">
            Extracted text was truncated for storage; long pages may be clipped.
          </p>
        ) : null}
        <div className="mt-6">
          <label
            htmlFor="article"
            className="font-serif text-sm font-semibold text-ink"
          >
            Article text
          </label>
          <textarea
            id="article"
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            rows={14}
            className="mt-2 w-full resize-y border border-rule bg-field-muted px-3 py-2 font-sans text-sm leading-relaxed text-ink placeholder:text-ink-muted/60 focus:border-wip-navy focus:outline-none focus:ring-1 focus:ring-wip-navy/25"
            placeholder="Article text for comparison…"
          />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/flow/recording"
            className="border border-rule px-4 py-2 font-sans text-sm font-medium text-ink-muted transition hover:border-ink-muted hover:text-ink"
          >
            ← Back
          </Link>
          {canContinue ? (
            <Link
              href="/flow/analysis"
              className="inline-block border-2 border-double border-rule bg-cta-bg px-6 py-3 font-sans text-base font-semibold text-cta-fg transition hover:bg-cta-hover"
            >
              Continue to AI analysis
            </Link>
          ) : (
            <span className="inline-block cursor-not-allowed border-2 border-double border-rule/50 bg-field-muted px-6 py-3 font-sans text-base font-semibold text-ink-muted opacity-70">
              Continue to AI analysis
            </span>
          )}
          {!canContinue ? (
            <p className="font-sans text-xs text-ink-muted">
              Need at least 80 characters of article text.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
