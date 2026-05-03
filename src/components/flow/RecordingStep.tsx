"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  readTranscribeApiResponse,
  transcriptFromTranscribeApi,
} from "@/lib/compareTypes";
import { useFlow } from "./FlowContext";

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

  const onTranscribe = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      setCompareResult(null);
      setCompareMeta(null);
      setTranscribing(true);
      setTranscribeDetail(null);

      const tryStreamUpload = async (): Promise<boolean> => {
        setTranscribeDetail(
          "Uploading full file to the server (streamed). Long runs can take several minutes…",
        );
        const streamRes = await fetch("/api/transcribe/stream", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-Filename": encodeURIComponent(file.name || "recording.mp4"),
          },
          body: file,
        });
        const parsed = await readTranscribeApiResponse(streamRes);
        if (streamRes.status === 413) return false;
        if (!parsed.ok) {
          const msg = parsed.error;
          if (
            /payload too large|request entity too large|body.*limit|413|maximum.*size/i.test(
              msg,
            )
          ) {
            return false;
          }
          throw new Error(parsed.error);
        }
        setTranscript(transcriptFromTranscribeApi(parsed.data));
        return true;
      };

      try {
        setTranscribeDetail(
          `Uploading ${file.name || "recording"} (${formatMb(file.size)})…`,
        );
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: fd,
        });
        const parsed = await readTranscribeApiResponse(res);

        if (parsed.ok) {
          setTranscript(transcriptFromTranscribeApi(parsed.data));
          return;
        }

        const msg = parsed.error;
        const tooLarge =
          res.status === 413 ||
          /payload too large|request entity too large|413|maximum.*size|too large/i.test(
            msg,
          );

        if (tooLarge) {
          const streamed = await tryStreamUpload();
          if (streamed) return;
        }

        throw new Error(msg);
      } catch (err) {
        console.error("[Citizen Kane] transcribe flow", err);
        setError(
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Transcription failed.",
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
          Upload your interview
        </h2>
        <p className="mt-3 max-w-prose text-pretty font-sans text-sm leading-relaxed text-ink-muted">
          MP4 or other audio/video. Your file is sent to the server and
          transcribed with{" "}
          <span className="whitespace-nowrap">AssemblyAI</span>. Large files can
          take a few minutes before the transcript is ready.
        </p>

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
