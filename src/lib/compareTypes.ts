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
