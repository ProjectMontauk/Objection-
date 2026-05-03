import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { transcribeReadableStreamWithAssembly } from "@/lib/assemblyai";
import { isTranscribeDemoEnabled } from "@/lib/demoMode";

export const runtime = "nodejs";
/**
 * Pro/Enterprise: up to 800s. Hobby max is 300s (deploy fails if higher).
 * @see https://vercel.com/docs/functions/configuring-functions/duration
 */
export const maxDuration = 800;

export async function POST(request: Request) {
  if (isTranscribeDemoEnabled()) {
    if (request.body) {
      await new Response(request.body).arrayBuffer().catch(() => undefined);
    }
    try {
      const filePath = path.join(
        process.cwd(),
        "public",
        "demo-interview-transcript.txt",
      );
      const text = (await readFile(filePath, "utf8")).trim();
      return NextResponse.json({ text });
    } catch {
      return NextResponse.json(
        { error: "Demo transcript file is missing on the server." },
        { status: 500 },
      );
    }
  }

  const key = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const body = request.body;
  if (!body) {
    return NextResponse.json({ error: "Expected a request body." }, { status: 400 });
  }

  const type = (request.headers.get("content-type") || "").toLowerCase();
  const name = decodeURIComponent(
    request.headers.get("x-filename") || "recording.mp4",
  ).toLowerCase();
  const looksLikeMedia =
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/octet-stream" ||
    /\.(mp4|m4a|mp3|webm|mpeg|mpga|wav|mov|ogg|flac)$/i.test(name);

  if (!looksLikeMedia) {
    return NextResponse.json(
      { error: "Send audio or video bytes with an appropriate Content-Type or filename." },
      { status: 400 },
    );
  }

  try {
    const result = await transcribeReadableStreamWithAssembly(key, body);
    return NextResponse.json({
      text: result.text,
      textWithSpeakers: result.textWithSpeakers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
