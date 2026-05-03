"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { prepareFilesForWhisper } from "@/lib/prepareForWhisper";
import { transcriptFromTranscribeApi } from "@/lib/compareTypes";
import { WHISPER_MAX_BYTES } from "@/lib/whisperLimits";
import { useFlow } from "./FlowContext";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
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
  const [measureOnly, setMeasureOnly] = useState(false);
  const [whisperPrepReport, setWhisperPrepReport] = useState<{
    originalName: string;
    originalSize: number;
    parts: { name: string; size: number }[];
    apiSkipped: boolean;
    streamingUpload?: boolean;
  } | null>(null);
  const [pickingBrief, setPickingBrief] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const prepReportRef = useRef<HTMLElement>(null);
  const [preparedDownloadable, setPreparedDownloadable] = useState<File[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const downloadPreparedFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "citizen-kane-prepared.mp3";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    if (whisperPrepReport && prepReportRef.current) {
      prepReportRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [whisperPrepReport]);

  const onTranscribe = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      setCompareResult(null);
      setCompareMeta(null);
      setWhisperPrepReport(null);
      setPreparedDownloadable(null);
      setPickingBrief({ name: file.name || "recording", size: file.size });
      setTranscribing(true);
      setTranscribeDetail(null);
      try {
        const logPreparedParts = (files: File[]) => {
          for (let i = 0; i < files.length; i++) {
            const f = files[i]!;
            const label =
              files.length > 1 ? `part ${i + 1}/${files.length}` : "file";
            console.log(
              `[Citizen Kane] Prepared ${label}: ${formatMb(f.size)} (${f.name})`,
            );
          }
        };

        const transcribePreparedParts = async (files: File[]) => {
          const parts: string[] = [];
          for (let i = 0; i < files.length; i++) {
            if (files.length > 1) {
              setTranscribeDetail(
                `Transcribing part ${i + 1} of ${files.length}…`,
              );
            } else {
              setTranscribeDetail("Sending to the transcription service…");
            }

            const fd = new FormData();
            fd.set("file", files[i]!);
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: fd,
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Transcription failed.");
            }
            parts.push(transcriptFromTranscribeApi(data));
          }
          setTranscript(parts.filter(Boolean).join("\n\n"));
        };

        const tryFullStreamUpload = async (): Promise<boolean> => {
          setTranscribeDetail(
            "Uploading the full file (no in-browser compression). Long uploads and transcripts can take several minutes…",
          );
          flushSync(() => {
            setPickingBrief(null);
            setWhisperPrepReport({
              originalName: file.name || "recording",
              originalSize: file.size,
              parts: [
                {
                  name: `${file.name || "recording"} (streamed upload)`,
                  size: file.size,
                },
              ],
              apiSkipped: false,
              streamingUpload: true,
            });
            setPreparedDownloadable(null);
          });

          const streamRes = await fetch("/api/transcribe/stream", {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "X-Filename": encodeURIComponent(file.name || "recording.mp4"),
            },
            body: file,
          });

          let data: { error?: string; text?: string } = {};
          try {
            data = (await streamRes.json()) as {
              error?: string;
              text?: string;
              textWithSpeakers?: string;
            };
          } catch {
            /* ignore */
          }

          if (streamRes.status === 413) {
            return false;
          }
          if (!streamRes.ok) {
            const msg = String(data.error || "");
            if (
              /payload too large|request entity too large|body.*limit|413|maximum.*size/i.test(
                msg,
              )
            ) {
              return false;
            }
            throw new Error(data.error || "Transcription failed.");
          }
          setTranscript(transcriptFromTranscribeApi(data));
          return true;
        };

        if (measureOnly) {
          const files = await prepareFilesForWhisper(file, (s) => {
            if (s.detail) setTranscribeDetail(s.detail);
          });
          flushSync(() => {
            setPickingBrief(null);
            setWhisperPrepReport({
              originalName: file.name || "recording",
              originalSize: file.size,
              parts: files.map((f) => ({ name: f.name, size: f.size })),
              apiSkipped: true,
            });
            setPreparedDownloadable(files);
          });
          logPreparedParts(files);
          setTranscribeDetail(null);
          return;
        }

        if (file.size <= WHISPER_MAX_BYTES) {
          flushSync(() => {
            setPickingBrief(null);
            setWhisperPrepReport({
              originalName: file.name || "recording",
              originalSize: file.size,
              parts: [{ name: file.name, size: file.size }],
              apiSkipped: false,
            });
            setPreparedDownloadable([file]);
          });
          logPreparedParts([file]);
          setTranscribeDetail("Sending to the transcription service…");
          const fd = new FormData();
          fd.set("file", file);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Transcription failed.");
          }
          setTranscript(transcriptFromTranscribeApi(data));
          return;
        }

        const streamed = await tryFullStreamUpload();
        if (streamed) {
          return;
        }

        setTranscribeDetail(
          "Host rejected the full upload or it failed—compressing in your browser instead (may fail on very large files if the tab runs out of memory)…",
        );
        setWhisperPrepReport(null);
        setPreparedDownloadable(null);

        const files = await prepareFilesForWhisper(file, (s) => {
          if (s.detail) setTranscribeDetail(s.detail);
        });

        flushSync(() => {
          setPickingBrief(null);
          setWhisperPrepReport({
            originalName: file.name || "recording",
            originalSize: file.size,
            parts: files.map((f) => ({ name: f.name, size: f.size })),
            apiSkipped: false,
          });
          setPreparedDownloadable(files);
        });
        logPreparedParts(files);
        await transcribePreparedParts(files);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setTranscribing(false);
        setTranscribeDetail(null);
        setPickingBrief(null);
      }
    },
    [measureOnly, setCompareMeta, setCompareResult, setTranscript],
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
          MP4 or other audio/video. We transcribe with{" "}
          <span className="whitespace-nowrap">AssemblyAI</span> (with
          diarization). Large files may be compressed in the browser or streamed
          to the server first.
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
          {pickingBrief && !whisperPrepReport ? (
            <div
              className="mt-4 border border-rule bg-field-muted px-4 py-3 text-sm text-ink"
              aria-live="polite"
            >
              <p className="font-serif text-base font-semibold text-ink">
                Original recording
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-ink">
                {formatMb(pickingBrief.size)}
              </p>
              <p className="mt-2 font-sans text-xs leading-relaxed text-ink-muted">
                Compressing in your browser for transcription… Large MP4s can
                take several minutes.
              </p>
            </div>
          ) : null}
          {whisperPrepReport ? (
            <aside
              ref={prepReportRef}
              className="mt-4 border border-rule bg-field-muted px-4 py-4 text-sm text-ink"
              aria-live="polite"
            >
              <p className="font-serif text-base font-semibold text-ink">
                Prepared for transcription
              </p>
              {whisperPrepReport.parts.length === 1 ? (
                <div className="mt-3">
                  <p className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-ink">
                    {formatMb(whisperPrepReport.parts[0]!.size)}
                  </p>
                  <p className="mt-1 font-sans text-xs text-ink-muted">
                    Prepared file size (ready to send)
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {whisperPrepReport.parts.map((p, i) => (
                    <p
                      key={`${p.name}-${i}`}
                      className="font-serif text-xl font-semibold tabular-nums text-ink"
                    >
                      Part {i + 1}: {formatMb(p.size)}
                    </p>
                  ))}
                  <p className="font-sans text-xs text-ink-muted">
                    {whisperPrepReport.parts.length} separate uploads · combined{" "}
                    {formatMb(
                      whisperPrepReport.parts.reduce((s, p) => s + p.size, 0),
                    )}{" "}
                    total
                  </p>
                </div>
              )}
              <p className="mt-3 font-sans text-xs text-ink-muted">
                Source: {whisperPrepReport.originalName} (
                {formatBytes(whisperPrepReport.originalSize)}) · limit per part:{" "}
                {formatBytes(WHISPER_MAX_BYTES)}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 font-sans text-ink">
                {whisperPrepReport.parts.map((p, i) => {
                  const ok =
                    whisperPrepReport.streamingUpload ||
                    p.size <= WHISPER_MAX_BYTES;
                  return (
                    <li key={`${p.name}-${i}`}>
                      <span className="font-mono text-xs">{p.name}</span> —{" "}
                      {formatMb(p.size)}
                      {whisperPrepReport.streamingUpload ? (
                        <span className="text-ink-muted">
                          {" "}
                          (streamed to server; AssemblyAI ingests the full file)
                        </span>
                      ) : ok ? (
                        <span className="text-ink-muted">
                          {" "}
                          (within per-request limit)
                        </span>
                      ) : (
                        <span className="font-medium text-wip-navy">
                          {" "}
                          — exceeds limit; this should not happen from our
                          pipeline
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {preparedDownloadable && preparedDownloadable.length > 0 ? (
                <div className="mt-3 border-t border-rule pt-3">
                  <p className="font-serif text-sm font-semibold text-ink">
                    Download prepared audio
                  </p>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">
                    Each file is under the 25 MB upload limit. Save it, then
                    choose it again to skip compression.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preparedDownloadable.map((f, i) => (
                      <button
                        key={`${f.name}-${i}-${f.size}`}
                        type="button"
                        onClick={() => downloadPreparedFile(f)}
                        className="border border-rule bg-cta-bg px-3 py-2 font-sans text-xs font-semibold text-cta-fg transition hover:bg-cta-hover"
                      >
                        {preparedDownloadable.length > 1
                          ? `Download part ${i + 1}`
                          : "Download prepared file"}{" "}
                        ({formatMb(f.size)})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {whisperPrepReport.apiSkipped ? (
                <p className="mt-2 border-t border-rule pt-2 font-sans text-xs italic text-ink-muted">
                  The transcription service was not called. Uncheck “Measure
                  only” and choose the file again to transcribe.
                </p>
              ) : null}
            </aside>
          ) : null}
          <label className="mt-4 flex cursor-pointer items-start gap-2 font-sans text-sm leading-snug text-ink-muted">
            <input
              type="checkbox"
              checked={measureOnly}
              onChange={(e) => setMeasureOnly(e.target.checked)}
              disabled={transcribing}
              className="mt-1 border-rule text-wip-navy focus:ring-wip-navy/40"
            />
            <span>
              <span className="font-semibold text-ink">Measure only.</span>{" "}
              Show prepared sizes without calling the transcription API.
            </span>
          </label>
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
