const MAX_COMPARE_CHARS = 48_000;

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncateForModel(text: string, maxChars = MAX_COMPARE_CHARS): {
  text: string;
  truncated: boolean;
} {
  const t = text.trim();
  if (t.length <= maxChars) {
    return { text: t, truncated: false };
  }
  return {
    text: `${t.slice(0, maxChars)}\n\n[…truncated for analysis; original length ${t.length} characters…]`,
    truncated: true,
  };
}
