import { fetchFile } from "@ffmpeg/util";
import { WHISPER_MAX_BYTES } from "@/lib/whisperLimits";

/**
 * Core is served by `src/app/ffmpeg-core/[file]/route.ts` from
 * `node_modules/@ffmpeg/core` so it works even when `public/` is missing or
 * Next resolves a different workspace root (e.g. multiple lockfiles).
 */
function coreAssetBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}/ffmpeg-core`;
}

export type PrepareStatus =
  | { phase: "skip"; detail?: string }
  | { phase: "load-ffmpeg"; detail?: string }
  | { phase: "compress"; detail?: string }
  | { phase: "split"; detail?: string };

let ffmpegLoad: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegLoad) {
    ffmpegLoad = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const base = coreAssetBaseUrl();
      if (!base) {
        throw new Error("Audio preparation must run in the browser.");
      }
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegLoad;
}

function safeName(part: string) {
  return part.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function fileDataToUint8(data: Uint8Array | string): Uint8Array {
  if (data instanceof Uint8Array) return data;
  throw new Error("Expected binary output from ffmpeg.");
}

/**
 * Returns one or more files, each ≤ WHISPER_MAX_BYTES, suitable for `/api/transcribe`.
 * Large videos are stripped to mono MP3 in-browser; if still too large, split into segments.
 */
export async function prepareFilesForWhisper(
  file: File,
  onStatus?: (s: PrepareStatus) => void,
): Promise<File[]> {
  if (file.size <= WHISPER_MAX_BYTES) {
    onStatus?.({ phase: "skip" });
    return [file];
  }

  onStatus?.({ phase: "load-ffmpeg", detail: "Loading audio tools (first run may download ~30 MB)…" });
  const ffmpeg = await getFFmpeg();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const inputName = `in_${id}.${safeName(ext)}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const bitrates = ["64k", "48k", "32k", "24k"] as const;
  const outSingle = `out_${id}.mp3`;

  try {
    onStatus?.({
      phase: "compress",
      detail: "Extracting and compressing audio in your browser…",
    });

    for (const br of bitrates) {
      try {
        await ffmpeg.deleteFile(outSingle);
      } catch {
        /* noop */
      }
      const code = await ffmpeg.exec([
        "-i",
        inputName,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        br,
        outSingle,
      ]);
      if (code !== 0) {
        continue;
      }
      const data = await ffmpeg.readFile(outSingle);
      const buf = fileDataToUint8(data);
      if (buf.byteLength > 0 && buf.byteLength <= WHISPER_MAX_BYTES) {
        await ffmpeg.deleteFile(outSingle);
        await ffmpeg.deleteFile(inputName);
        return [
          new File([new Uint8Array(buf)], `whisper-${br}.mp3`, {
            type: "audio/mpeg",
          }),
        ];
      }
    }

    onStatus?.({
      phase: "split",
      detail: "File is very long; splitting into parts for transcription…",
    });

    try {
      await ffmpeg.deleteFile(outSingle);
    } catch {
      /* noop */
    }

    const segPattern = `seg_${id}_%03d.mp3`;
    const code = await ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-f",
      "segment",
      "-segment_time",
      "420",
      "-reset_timestamps",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "48k",
      "-ac",
      "1",
      "-ar",
      "16000",
      segPattern,
    ]);

    if (code !== 0) {
      throw new Error(
        "Could not shrink or split the audio. Try a shorter clip or export audio only (MP3) and upload that.",
      );
    }

    await ffmpeg.deleteFile(inputName);

    const parts: File[] = [];
    for (let i = 0; i < 999; i++) {
      const partName = `seg_${id}_${String(i).padStart(3, "0")}.mp3`;
      try {
        const raw = await ffmpeg.readFile(partName);
        const buf = fileDataToUint8(raw);
        await ffmpeg.deleteFile(partName);
        if (buf.byteLength === 0) break;
        if (buf.byteLength > WHISPER_MAX_BYTES) {
          throw new Error(
            "A single segment is still too large. Try lowering video length or bitrate outside the app.",
          );
        }
        parts.push(
          new File([new Uint8Array(buf)], `whisper-part-${i + 1}.mp3`, {
            type: "audio/mpeg",
          }),
        );
      } catch {
        break;
      }
    }

    if (parts.length === 0) {
      throw new Error(
        "Could not produce transcribable audio from this file. Try MP3/M4A or a smaller MP4.",
      );
    }

    return parts;
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      /* already deleted */
    }
    try {
      await ffmpeg.deleteFile(outSingle);
    } catch {
      /* noop */
    }
  }
}
