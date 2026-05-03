import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED = new Set(["ffmpeg-core.js", "ffmpeg-core.wasm"]);

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!ALLOWED.has(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "node_modules",
    "@ffmpeg",
    "core",
    "dist",
    "esm",
    file,
  );

  try {
    const body = await readFile(filePath);
    const contentType = file.endsWith(".wasm")
      ? "application/wasm"
      : "application/javascript; charset=utf-8";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(
      "FFmpeg WASM core not found. Run npm install (ensure @ffmpeg/core is installed).",
      { status: 404 },
    );
  }
}
