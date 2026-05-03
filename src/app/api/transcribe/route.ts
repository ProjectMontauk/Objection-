import { NextResponse } from "next/server";
import { transcribeBufferWithAssembly } from "@/lib/assemblyai";

export const runtime = "nodejs";
/** Long AssemblyAI jobs; raise on hosts that allow it (e.g. Railway). */
export const maxDuration = 800;

export async function POST(request: Request) {
  const key = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read upload. Try a smaller file." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a file field named file." }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const looksLikeMedia =
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    /\.(mp4|m4a|mp3|webm|mpeg|mpga|wav|mov|ogg|flac)$/i.test(name);

  if (!looksLikeMedia) {
    return NextResponse.json(
      { error: "Upload an audio or video file (e.g. MP4, MP3, WAV)." },
      { status: 400 },
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await transcribeBufferWithAssembly(key, buf);
    return NextResponse.json({
      text: result.text,
      textWithSpeakers: result.textWithSpeakers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
