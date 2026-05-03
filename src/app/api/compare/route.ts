import OpenAI from "openai";
import { NextResponse } from "next/server";
import { truncateForModel } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 120;

const DIMENSION_SCHEMA = `{
  "score": <number 1-10>,
  "headline": "<short newspaper-style headline for this finding>",
  "analysis": "<2-5 sentences: specific, evidence-based assessment. MUST include at least one concrete example—e.g. a short quoted or closely paraphrased line from the transcript contrasted with how the article puts it (or what the article omits), so the reader sees the mismatch or alignment clearly. Label examples as from the interview vs the article when helpful.>"
}`;

const SYSTEM = `You are a careful editorial fact-checker for Citizen Kane, a newspaper desk that compares interview transcripts to published articles.

You will receive:
1) INTERVIEW_TRANSCRIPT — machine transcription (may contain minor errors)
2) PUBLISHED_ARTICLE — text extracted from a news story or post

Evaluate how faithfully the article represents the interview. Be fair: note transcription uncertainty when relevant.

**Required for every dimension (overall, fidelity, coverage, contextRetention, materialOmission):** the \`analysis\` string must contain at least one illustrative example drawn from the provided materials—not a hypothetical. Prefer a brief transcript snippet vs the article’s wording (or note the absence in the article for omission). Each dimension’s analysis should stand alone with its own example (examples may overlap slightly in substance but should not be copy-pasted verbatim across dimensions).

Dimensions:
- **overall**: Holistic judgment of whether the interview subject was misrepresented in the article versus the transcript—one score synthesizing the dimensions below (do not simply average them; weigh what matters most for fairness).
- **fidelity**: Accuracy of quotes, paraphrases, names, numbers, and attributions versus what was said.
- **coverage**: How much of the substantive content of the interview appears in the article (breadth, not length).
- **contextRetention**: Whether qualifications, tone, uncertainty, and framing from the interview are preserved or distorted.
- **materialOmission**: Important claims, caveats, contradictions, or corrections present in the interview but absent or buried in the article.

Respond with ONLY valid JSON matching this shape (no markdown):
{
  "overall": ${DIMENSION_SCHEMA},
  "fidelity": ${DIMENSION_SCHEMA},
  "coverage": ${DIMENSION_SCHEMA},
  "contextRetention": ${DIMENSION_SCHEMA},
  "materialOmission": ${DIMENSION_SCHEMA},
  "ledger": "<one paragraph: crisp overall verdict for the newsroom>"
}`;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const transcript =
    typeof body === "object" && body !== null && "transcript" in body
      ? String((body as { transcript: unknown }).transcript ?? "").trim()
      : "";
  const article =
    typeof body === "object" && body !== null && "article" in body
      ? String((body as { article: unknown }).article ?? "").trim()
      : "";

  if (transcript.length < 80) {
    return NextResponse.json(
      { error: "Transcript is too short to compare meaningfully." },
      { status: 400 },
    );
  }
  if (article.length < 80) {
    return NextResponse.json(
      { error: "Article text is too short to compare meaningfully." },
      { status: 400 },
    );
  }

  const t = truncateForModel(transcript);
  const a = truncateForModel(article);
  const model = process.env.OPENAI_COMPARE_MODEL || "gpt-4o-mini";

  const userContent = `INTERVIEW_TRANSCRIPT:\n${t.text}\n\n---\n\nPUBLISHED_ARTICLE:\n${a.text}`;

  const openai = new OpenAI({ apiKey: key });

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No response from the model." },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      result: parsed,
      meta: {
        model,
        transcriptTruncated: t.truncated,
        articleTruncated: a.truncated,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Comparison failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
