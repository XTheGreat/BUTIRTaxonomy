import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const POLA_BOT =
  /bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|gtmetrix|python|aiohttp|httpx|go-http-client|okhttp|libwww|wget|curl|axios|node-fetch|undici|java\/|httpclient|postman|insomnia|gptbot|chatgpt|claudebot|claude-web|claude-user|claude-searchbot|anthropic-ai|perplexity|ccbot|bytespider|amazon|facebookexternalhit|meta-external|applebot|duckassist|youbot|cohere|diffbot|imagesift|omgili|petalbot|semrush|ahrefs|mj12|dotbot|lightsite/i;

export function proxy(request: NextRequest) {
  const agen = request.headers.get("user-agent") ?? "";

  if (!agen || POLA_BOT.test(agen)) {
    return new NextResponse("Akses otomatis tidak diizinkan.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow, noarchive" },
    });
  }

  const respons = NextResponse.next();
  respons.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return respons;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|icon.png|icon.svg).*)"],
};
