export type DimensionResult = {
  score: number;
  headline: string;
  analysis: string;
};

export type ComparePayload = {
  overall: DimensionResult;
  fidelity: DimensionResult;
  coverage: DimensionResult;
  contextRetention: DimensionResult;
  materialOmission: DimensionResult;
  ledger: string;
};

export const DIMENSIONS: {
  key: keyof Pick<
    ComparePayload,
    | "overall"
    | "fidelity"
    | "coverage"
    | "contextRetention"
    | "materialOmission"
  >;
  label: string;
  dek: string;
}[] = [
  {
    key: "overall",
    label: "Overall representation",
    dek: "Holistic read: were you fairly represented versus what was said on tape?",
  },
  {
    key: "fidelity",
    label: "Fidelity",
    dek: "Quotes, paraphrases, and facts against the spoken record.",
  },
  {
    key: "coverage",
    label: "Coverage",
    dek: "How much of the interview’s substance reaches the reader.",
  },
  {
    key: "contextRetention",
    label: "Context retention",
    dek: "Qualifications, tone, and framing carried forward—or lost.",
  },
  {
    key: "materialOmission",
    label: "Material omission",
    dek: "What mattered in the room but never made the column.",
  },
];

const DIMENSION_KEYS_NO_OVERALL = [
  "fidelity",
  "coverage",
  "contextRetention",
  "materialOmission",
] as const;

export function isDimensionResult(v: unknown): v is DimensionResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.score === "number" &&
    typeof o.headline === "string" &&
    typeof o.analysis === "string"
  );
}

function averageOverallFromFour(o: Record<string, unknown>): DimensionResult {
  let sum = 0;
  for (const k of DIMENSION_KEYS_NO_OVERALL) {
    const d = o[k];
    if (isDimensionResult(d)) sum += d.score;
  }
  const score = Math.min(
    10,
    Math.max(1, Math.round(sum / DIMENSION_KEYS_NO_OVERALL.length)),
  );
  return {
    score,
    headline: "Overall (estimated from sub-scores)",
    analysis:
      "The model did not return a holistic overall score; this figure is the rounded average of the four detailed dimensions.",
  };
}

export function parseCompareResult(raw: unknown): ComparePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ledger !== "string") return null;
  for (const k of DIMENSION_KEYS_NO_OVERALL) {
    if (!isDimensionResult(o[k])) return null;
  }
  let overall: DimensionResult;
  if (isDimensionResult(o.overall)) {
    overall = o.overall;
  } else {
    overall = averageOverallFromFour(o);
  }
  return {
    overall,
    fidelity: o.fidelity as DimensionResult,
    coverage: o.coverage as DimensionResult,
    contextRetention: o.contextRetention as DimensionResult,
    materialOmission: o.materialOmission as DimensionResult,
    ledger: o.ledger,
  };
}

export function transcriptFromTranscribeApi(data: {
  text?: string;
  textWithSpeakers?: string;
}): string {
  return (data.textWithSpeakers || data.text || "").trim();
}

export type TranscribeApiOk = {
  ok: true;
  data: { text?: string; textWithSpeakers?: string };
};

export type TranscribeApiErr = { ok: false; error: string };

/** Parse `/api/transcribe` JSON (or surface HTML/gateway bodies). */
export async function readTranscribeApiResponse(
  res: Response,
): Promise<TranscribeApiOk | TranscribeApiErr> {
  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const bit = raw.trim().slice(0, 400);
      return {
        ok: false,
        error: bit
          ? `Non-JSON response (${res.status}): ${bit}`
          : `Unexpected empty or non-JSON response (${res.status}).`,
      };
    }
  }

  const messageField =
    typeof parsed.message === "string" ? parsed.message.trim() : "";

  const fromField =
    (typeof parsed.error === "string" ? parsed.error.trim() : "") ||
    messageField ||
    (parsed.error != null ? JSON.stringify(parsed.error).slice(0, 400) : "");

  if (!res.ok) {
    let err =
      fromField ||
      raw.trim().slice(0, 400) ||
      `Transcription request failed (${res.status}).`;

    if (
      res.status === 502 &&
      /application failed to respond|502/i.test(err)
    ) {
      err +=
        " The server may have hit a hosting time limit or ran out of memory on a large file—in Railway, raise the HTTP request timeout (several minutes) and instance memory, or try a smaller audio export.";
    }

    return { ok: false, error: err };
  }

  return {
    ok: true,
    data: {
      text: typeof parsed.text === "string" ? parsed.text : undefined,
      textWithSpeakers:
        typeof parsed.textWithSpeakers === "string"
          ? parsed.textWithSpeakers
          : undefined,
    },
  };
}
