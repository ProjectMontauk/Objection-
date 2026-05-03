"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { isTranscribeDemoEnabled } from "@/lib/demoMode";
import { useFlow } from "./FlowContext";

/** Will & Aron Enhanced Games interview (served from `public/`). */
const FIXED_TRANSCRIPT_PATH = "/demo-interview-transcript.txt";
const FIXED_TRANSCRIPT_DELAY_MS = 5000;

function demoVideoSrc(): string {
  const u = process.env.NEXT_PUBLIC_DEMO_VIDEO_SRC?.trim();
  return u || "/demo-interview.mp4";
}

function formatMb(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function RecordingStep() {
  const {
    transcript,
    setTranscript,
    setCompareResult,
    setCompareMeta,
  } = useFlow();

  const [transcribing, setTranscribing] = useState(false);
  const [transcribeDetail, setTranscribeDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDemo = isTranscribeDemoEnabled();

  const onTranscribe = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      setCompareResult(null);
      setCompareMeta(null);
      setTranscribing(true);
      setTranscribeDetail(
        `Received ${file.name || "recording"} (${formatMb(file.size)}). Transcript will appear in about 5 seconds…`,
      );
      try {
        await new Promise((r) => setTimeout(r, FIXED_TRANSCRIPT_DELAY_MS));
        const res = await fetch(FIXED_TRANSCRIPT_PATH, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Transcript file is missing on the server.");
        }
        setTranscript((await res.text()).trim());
      } catch (err) {
        console.error("[Citizen Kane] transcribe flow", err);
        setError(
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Could not load transcript.",
        );
      } finally {
        setTranscribing(false);
        setTranscribeDetail(null);
      }
    },
    [setCompareMeta, setCompareResult, setTranscript],
  );

  const canContinue = transcript.trim().length >= 80;

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
          Step 1 · Recording
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">
          {isDemo ? "Demo interview" : "Upload your interview"}
        </h2>
        <p className="mt-3 max-w-prose text-pretty font-sans text-sm leading-relaxed text-ink-muted">
          {isDemo ? (
            <>
              Sample Enhanced Games conversation. Watch the clip below if you
              like, then choose any video or audio file—the Will &amp; Aron
              interview transcript loads into the box below after about five
              seconds.
            </>
          ) : (
            <>
              MP4 or other audio/video. After you choose a file, the Will &amp;
              Aron interview transcript appears below automatically after about
              five seconds.
            </>
          )}
        </p>

        {isDemo ? (
          <div className="mt-6 border border-rule bg-field p-3 sm:p-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Sample video
            </p>
            <video
              className="mt-2 aspect-video w-full max-h-[min(50vh,420px)] bg-black object-contain"
              src={demoVideoSrc()}
              controls
              playsInline
              preload="metadata"
            >
              Add <code className="text-[0.65rem]">public/demo-interview.mp4</code>{" "}
              or set{" "}
              <code className="text-[0.65rem]">NEXT_PUBLIC_DEMO_VIDEO_SRC</code>.
            </video>
          </div>
        ) : null}

        <div className="mt-6">
          <label className="inline-flex cursor-pointer items-center gap-3 border border-rule bg-field px-4 py-3 font-sans text-sm font-medium transition hover:bg-field-muted">
            <input
              type="file"
              accept="video/*,audio/*,.mp4,.m4a,.mp3,.webm,.wav,.mov"
              className="sr-only"
              onChange={onTranscribe}
              disabled={transcribing}
            />
            <span className="font-semibold text-wip-navy">
              {transcribing ? "Working…" : "Choose recording"}
            </span>
            <span className="text-ink-muted">No file chosen</span>
          </label>
          {transcribing && transcribeDetail ? (
            <p className="mt-3 text-sm italic text-ink-muted">{transcribeDetail}</p>
          ) : null}
        </div>
        <div className="mt-6">
          <label
            htmlFor="transcript"
            className="font-serif text-sm font-semibold text-ink"
          >
            Transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            className="mt-2 w-full resize-y border border-rule bg-field-muted px-3 py-2 font-sans text-sm leading-relaxed text-ink placeholder:text-ink-muted/60 focus:border-wip-navy focus:outline-none focus:ring-1 focus:ring-wip-navy/25"
            placeholder="Transcript appears here after upload. You may edit before continuing."
          />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {canContinue ? (
            <Link
              href="/flow/article"
              className="inline-block border-2 border-double border-rule bg-cta-bg px-6 py-3 font-sans text-base font-semibold text-cta-fg transition hover:bg-cta-hover"
            >
              Continue to article
            </Link>
          ) : (
            <span className="inline-block cursor-not-allowed border-2 border-double border-rule/50 bg-field-muted px-6 py-3 font-sans text-base font-semibold text-ink-muted opacity-70">
              Continue to article
            </span>
          )}
          {!canContinue ? (
            <p className="font-sans text-xs text-ink-muted">
              Need at least 80 characters in the transcript to continue.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
