const BASE = "https://api.assemblyai.com";
const DEFAULT_POLL_MS = 3000;

type TranscriptCreateResponse = { id?: string; error?: string };

export type AssemblyUtterance = {
  speaker: string;
  text: string;
  start: number;
  end: number;
};

export type AssemblyTranscriptResult = {
  /** Plain transcript (no speaker turns). */
  text: string;
  /** Turn-by-turn lines with display names (see `displayNameForDiarizedSpeaker`). */
  textWithSpeakers: string;
  utterances: AssemblyUtterance[];
};

type TranscriptPollResponse = {
  status?: string;
  text?: string;
  error?: string;
  utterances?: AssemblyUtterance[];
};

/**
 * Maps Assembly letters (A, B, …) to display names.
 * Defaults: A = Will (interviewer), B = Aron (interviewee).
 * If names look swapped in output, exchange ASSEMBLYAI_SPEAKER_A_NAME / _B_NAME.
 */
export function displayNameForDiarizedSpeaker(speakerId: string): string {
  const raw = (speakerId ?? "").trim();
  const letter = raw.replace(/^speaker\s+/i, "").trim().toUpperCase().slice(0, 1);
  const nameForA =
    process.env.ASSEMBLYAI_SPEAKER_A_NAME?.trim() || "Will";
  const nameForB =
    process.env.ASSEMBLYAI_SPEAKER_B_NAME?.trim() || "Aron";
  const byLetter: Record<string, string> = {
    A: nameForA,
    B: nameForB,
  };
  if (letter && byLetter[letter]) {
    return byLetter[letter]!;
  }
  if (raw.startsWith("Speaker ") || raw.startsWith("speaker ")) {
    return raw;
  }
  return letter ? `Speaker ${letter}` : "Speaker";
}

function formatUtterances(utterances: AssemblyUtterance[]): string {
  if (!utterances.length) return "";
  return utterances
    .map((u) => {
      const line = (u.text ?? "").trim();
      if (!line) return "";
      const label = displayNameForDiarizedSpeaker(u.speaker);
      return `${label}: ${line}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function resultFromCompletedPayload(data: TranscriptPollResponse): AssemblyTranscriptResult {
  const text = (data.text ?? "").trim();
  const utterances = Array.isArray(data.utterances) ? data.utterances : [];
  const textWithSpeakers = utterances.length ? formatUtterances(utterances) : text;
  return { text, textWithSpeakers, utterances };
}

export async function uploadAudioToAssembly(
  apiKey: string,
  audioBuffer: Buffer,
): Promise<string> {
  const res = await fetch(`${BASE}/v2/upload`, {
    method: "POST",
    headers: { authorization: apiKey },
    body: new Uint8Array(audioBuffer),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`AssemblyAI upload failed (${res.status}): ${raw.slice(0, 500)}`);
  }
  let parsed: { upload_url?: string };
  try {
    parsed = JSON.parse(raw) as { upload_url?: string };
  } catch {
    throw new Error("AssemblyAI upload: invalid JSON response");
  }
  if (!parsed.upload_url) {
    throw new Error("AssemblyAI upload: missing upload_url");
  }
  return parsed.upload_url;
}

/** Stream raw bytes to AssemblyAI (avoids buffering huge files in RAM on the server). */
export async function uploadAudioStreamToAssembly(
  apiKey: string,
  body: ReadableStream<Uint8Array>,
): Promise<string> {
  const res = await fetch(`${BASE}/v2/upload`, {
    method: "POST",
    headers: { authorization: apiKey },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`AssemblyAI upload failed (${res.status}): ${raw.slice(0, 500)}`);
  }
  let parsed: { upload_url?: string };
  try {
    parsed = JSON.parse(raw) as { upload_url?: string };
  } catch {
    throw new Error("AssemblyAI upload: invalid JSON response");
  }
  if (!parsed.upload_url) {
    throw new Error("AssemblyAI upload: missing upload_url");
  }
  return parsed.upload_url;
}

export async function createTranscriptJob(
  apiKey: string,
  audioUrl: string,
  options?: { speakerLabels?: boolean; speakersExpected?: number },
): Promise<string> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    language_detection: true,
    speech_models: ["universal-3-pro", "universal-2"],
    speaker_labels: options?.speakerLabels !== false,
  };
  const n = options?.speakersExpected;
  if (typeof n === "number" && n >= 1 && n <= 20) {
    body.speakers_expected = n;
  }

  const res = await fetch(`${BASE}/v2/transcript`, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`AssemblyAI transcript create failed (${res.status}): ${raw.slice(0, 500)}`);
  }
  let data: TranscriptCreateResponse;
  try {
    data = JSON.parse(raw) as TranscriptCreateResponse;
  } catch {
    throw new Error("AssemblyAI transcript create: invalid JSON");
  }
  if (data.error) {
    throw new Error(`AssemblyAI: ${data.error}`);
  }
  if (!data.id) {
    throw new Error("AssemblyAI transcript create: missing id");
  }
  return data.id;
}

export async function pollTranscriptUntilComplete(
  apiKey: string,
  transcriptId: string,
  options?: { pollMs?: number; deadlineMs?: number },
): Promise<AssemblyTranscriptResult> {
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;
  const deadline = Date.now() + (options?.deadlineMs ?? 280_000);

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/v2/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`AssemblyAI poll failed (${res.status}): ${raw.slice(0, 500)}`);
    }
    let data: TranscriptPollResponse;
    try {
      data = JSON.parse(raw) as TranscriptPollResponse;
    } catch {
      throw new Error("AssemblyAI poll: invalid JSON");
    }

    if (data.status === "completed") {
      return resultFromCompletedPayload(data);
    }
    if (data.status === "error") {
      throw new Error(data.error || "AssemblyAI transcription failed");
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(
    "AssemblyAI transcription timed out. Try a shorter file or run again.",
  );
}

function createJobOptionsFromEnv(): {
  speakerLabels: boolean;
  speakersExpected?: number;
} {
  const speakerLabels =
    process.env.ASSEMBLYAI_SPEAKER_LABELS !== "0" &&
    process.env.ASSEMBLYAI_SPEAKER_LABELS !== "false";
  const raw = process.env.ASSEMBLYAI_SPEAKERS_EXPECTED;
  if (raw === undefined || raw === "") {
    return { speakerLabels };
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 20) {
    return { speakerLabels, speakersExpected: n };
  }
  return { speakerLabels };
}

export async function transcribeBufferWithAssembly(
  apiKey: string,
  audioBuffer: Buffer,
): Promise<AssemblyTranscriptResult> {
  const uploadUrl = await uploadAudioToAssembly(apiKey, audioBuffer);
  const id = await createTranscriptJob(apiKey, uploadUrl, createJobOptionsFromEnv());
  return pollTranscriptUntilComplete(apiKey, id);
}

export async function transcribeReadableStreamWithAssembly(
  apiKey: string,
  stream: ReadableStream<Uint8Array>,
  pollOptions?: { deadlineMs?: number },
): Promise<AssemblyTranscriptResult> {
  const uploadUrl = await uploadAudioStreamToAssembly(apiKey, stream);
  const id = await createTranscriptJob(apiKey, uploadUrl, createJobOptionsFromEnv());
  return pollTranscriptUntilComplete(apiKey, id, {
    deadlineMs: pollOptions?.deadlineMs ?? 600_000,
  });
}
