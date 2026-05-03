/**
 * Manual Whisper check: local file or HTTPS URL → OpenAI whisper-1 → stdout.
 *
 * Local file:
 *   node --env-file=.env.local scripts/test-whisper.mjs /path/to/file.mp4
 *
 * URL (quote the whole URL so & is not eaten by the shell):
 *   node --env-file=.env.local scripts/test-whisper.mjs "https://..."
 *
 *   npm run test:whisper -- "https://..."
 *
 * Requires Node 20.6+ for --env-file and global File. OpenAI limit: 25 MB.
 */

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function guessNameFromDisposition(header) {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(header);
  if (!m) return null;
  return decodeURIComponent(m[1].replace(/"/g, "").trim());
}

async function loadFromUrl(urlString) {
  const res = await fetch(urlString, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CitizenKane-WhisperTest/1.0; +https://localhost)",
    },
  });

  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  }

  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (
    type.includes("text/html") ||
    type.includes("application/xhtml")
  ) {
    throw new Error(
      "Server returned HTML (not the media file). For Google Drive: use a direct download link, open the link in a browser, or download the file and pass the local path. If the file is large, Drive may show a virus-scan page first—download manually then use the .mp4 path.",
    );
  }

  const lenHeader = res.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > WHISPER_MAX_BYTES) {
      await res.body?.cancel?.();
      throw new Error(
        `Remote file is ${(n / (1024 * 1024)).toFixed(2)} MB; Whisper allows at most 25 MB.\n` +
          `Shrink locally, then re-run on the small file, e.g.:\n` +
          `  ffmpeg -y -i your.mp4 -t 600 -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 64k clip.mp3\n` +
          `  npm run test:whisper -- clip.mp3`,
      );
    }
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > WHISPER_MAX_BYTES) {
    throw new Error(
      `Downloaded file is ${(buf.length / (1024 * 1024)).toFixed(2)} MB; Whisper allows at most 25 MB.`,
    );
  }

  if (buf.length >= 5 && buf.subarray(0, 5).toString() === "<!DOC") {
    throw new Error(
      "Download looks like an HTML page, not media. Try downloading the file in a browser, then: npm run test:whisper -- /path/to/file.mp4",
    );
  }

  const name =
    guessNameFromDisposition(res.headers.get("content-disposition")) ||
    "download.bin";

  return new File([buf], name, {
    type: res.headers.get("content-type") || "application/octet-stream",
  });
}

function loadFromPath(resolved) {
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (stat.size > WHISPER_MAX_BYTES) {
    throw new Error(
      `File is ${(stat.size / (1024 * 1024)).toFixed(2)} MB; Whisper allows at most 25 MB.`,
    );
  }
  return fs.createReadStream(resolved);
}

const input = process.argv[2];
if (!input) {
  console.error(`Usage:
  node --env-file=.env.local scripts/test-whisper.mjs <local-path>
  node --env-file=.env.local scripts/test-whisper.mjs "<https-url>"

Quote URLs so characters like & are not interpreted by the shell.`);
  process.exit(1);
}

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("Missing OPENAI_API_KEY (use --env-file=.env.local or export it).");
  process.exit(1);
}

try {
  let upload;
  if (isHttpUrl(input.trim())) {
    console.error("Downloading…");
    upload = await loadFromUrl(input.trim());
    console.error(
      `Got ${upload.name} (${(upload.size / 1024).toFixed(1)} KB), transcribing…`,
    );
  } else {
    upload = loadFromPath(path.resolve(input));
  }

  const openai = new OpenAI({ apiKey: key });
  const result = await openai.audio.transcriptions.create({
    file: upload,
    model: "whisper-1",
  });
  const text = typeof result === "string" ? result : result.text ?? "";
  console.log("--- Transcript ---\n");
  console.log(text.trim() || "(empty)");
  console.log("\n--- Done ---");
} catch (e) {
  console.error("Error:", e instanceof Error ? e.message : e);
  process.exit(1);
}
