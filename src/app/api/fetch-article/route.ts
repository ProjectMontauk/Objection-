import { load } from "cheerio";
import { NextResponse } from "next/server";
import { assertPublicHttpUrl } from "@/lib/url";
import { normalizeWhitespace } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ARTICLE_CHARS = 200_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const urlRaw =
    typeof body === "object" && body !== null && "url" in body
      ? String((body as { url: unknown }).url ?? "")
      : "";

  let url: URL;
  try {
    url = assertPublicHttpUrl(urlRaw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad URL." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "CitizenKane/1.0 (+https://example.invalid; article verification)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch page (HTTP ${res.status}).` },
        { status: 502 },
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "The URL did not return HTML. Paste article text manually in a future version, or use an article link." },
        { status: 400 },
      );
    }

    const html = await res.text();
    const $ = load(html);

    $(
      "script, style, noscript, svg, iframe, nav, footer, header, aside, form, [role='navigation'], [aria-hidden='true']",
    ).remove();

    const candidates = [
      $("article"),
      $("[role='main']"),
      $("main"),
      $(".article-body"),
      $(".post-content"),
      $(".entry-content"),
      $(".story-body"),
      $("#article-body"),
    ].filter((sel) => sel.length > 0);

    const root = candidates[0]?.length ? candidates[0]! : $("body");
    let text = normalizeWhitespace(root.text());

    if (!text || text.length < 80) {
      text = normalizeWhitespace($("body").text());
    }

    if (!text || text.length < 40) {
      return NextResponse.json(
        { error: "Could not extract readable article text from this page." },
        { status: 422 },
      );
    }

    const truncated = text.length > MAX_ARTICLE_CHARS;
    if (truncated) {
      text = text.slice(0, MAX_ARTICLE_CHARS);
    }

    return NextResponse.json({
      text,
      title: normalizeWhitespace($("title").first().text()) || url.hostname,
      sourceUrl: url.toString(),
      truncated,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to retrieve the article.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
