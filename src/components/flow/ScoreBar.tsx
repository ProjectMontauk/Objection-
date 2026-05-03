"use client";

import { scoreAsShareable100 } from "@/lib/scoreDisplay";

export function ScoreBar({ score }: { score: number }) {
  const s = Math.min(10, Math.max(1, score));
  const pct = (s / 10) * 100;
  const out100 = scoreAsShareable100(score);
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden border border-rule bg-field-muted">
        <div
          className="h-full bg-wip-navy transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-sans text-sm tabular-nums text-ink-muted">
        {out100}/100
      </span>
    </div>
  );
}
