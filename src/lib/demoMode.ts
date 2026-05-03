/** Demo: skip real transcription and use the bundled Enhanced Games interview transcript. */
export function isTranscribeDemoEnabled(): boolean {
  const raw = (
    process.env.NEXT_PUBLIC_DEMO_MODE ??
    process.env.DEMO_MODE ??
    ""
  ).trim();
  return raw === "1" || raw.toLowerCase() === "true";
}
