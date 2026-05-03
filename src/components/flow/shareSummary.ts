import type { ComparePayload } from "@/lib/compareTypes";
import { DIMENSIONS } from "@/lib/compareTypes";
import {
  averageScoreOutOf100,
  scoreAsShareable100,
} from "@/lib/scoreDisplay";

export function buildShareSummary(payload: ComparePayload): string {
  const lines = [
    "Citizen Kane — verification scorecard (out of 100)",
    "",
    ...DIMENSIONS.map(({ key, label }) => {
      const d = payload[key];
      const pts =
        key === "overall"
          ? averageScoreOutOf100(payload)
          : scoreAsShareable100(d.score);
      return `${label}: ${pts}/100 — ${d.headline}`;
    }),
    "",
    `Desk note: ${payload.ledger}`,
    "",
    "#CitizenKane #media #verification",
  ];
  return lines.join("\n");
}
