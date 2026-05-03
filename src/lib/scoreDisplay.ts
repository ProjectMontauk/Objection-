import type { ComparePayload } from "./compareTypes";

const SCORE_KEYS = [
  "overall",
  "fidelity",
  "coverage",
  "contextRetention",
  "materialOmission",
] as const satisfies readonly (keyof ComparePayload)[];

/** Arithmetic mean of the five dimension scores (model uses 1–10 each). */
export function averageScore1to10(payload: ComparePayload): number {
  let sum = 0;
  for (const k of SCORE_KEYS) {
    sum += payload[k].score;
  }
  return sum / SCORE_KEYS.length;
}

/** Mean of five scores, scaled to /100 (rounded to nearest integer). */
export function averageScoreOutOf100(payload: ComparePayload): number {
  return Math.round(averageScore1to10(payload) * 10);
}

/** Single dimension: API scores are 1–10; shareable UI uses 10–100. */
export function scoreAsShareable100(score: number): number {
  const s = Math.min(10, Math.max(1, score));
  return Math.round(s * 10);
}
