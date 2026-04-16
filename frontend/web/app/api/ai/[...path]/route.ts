/**
 * Runtime AI API Proxy
 *
 * Proxies /api/ai/* → AI_DATA_URL/* at request time.
 * Unlike next.config.ts rewrites (build-time), this reads
 * AI_DATA_URL from the environment on every request — so it
 * works correctly in Cloud Run with runtime env vars.
 */

import { NextRequest, NextResponse } from "next/server";

function isLocalHost(host: string): boolean {
  const normalized = (host || "").toLowerCase();
  return normalized.includes("localhost") || normalized.includes("127.0.0.1");
}

function cleanUrl(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim().replace(/\/$/, "");
  return trimmed ? trimmed : null;
}

function deriveCloudRunBackendUrl(req: NextRequest): string | null {
  const host = req.headers.get("host") || req.nextUrl.host || "";
  const match = host.match(/^[^.]+-(\d+\.[a-z0-9-]+)\.run\.app$/i);
  if (!match) return null;
  return `https://staipo-ai-data-${match[1]}.run.app`;
}

function getBackendUrls(req: NextRequest): string[] {
  const host = req.headers.get("host") || req.nextUrl.host || "";
  const local = isLocalHost(host);
  const envUrls = [
    cleanUrl(process.env.AI_DATA_URL),
    cleanUrl(process.env.AI_DATA_URL_FALLBACK),
    ...((process.env.AI_DATA_URLS || "")
      .split(",")
      .map(cleanUrl)
      .filter((v): v is string => Boolean(v))),
    cleanUrl(process.env.NEXT_PUBLIC_AI_DATA_URL),
    deriveCloudRunBackendUrl(req),
    local ? "http://localhost:8000" : null,
  ].filter((v): v is string => Boolean(v));

  const deduped: string[] = [];
  for (const url of envUrls) {
    const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
    if (!local && isLocalUrl) {
      continue;
    }
    if (!deduped.includes(url)) {
      deduped.push(url);
    }
  }
  return deduped;
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = "/" + path.join("/");
  const isBodyMethod = !["GET", "HEAD"].includes(req.method);
  const contentType = req.headers.get("content-type") || "application/json";
  const backendUrls = getBackendUrls(req);
  const attempted: string[] = [];

  const requestBody = isBodyMethod ? await req.arrayBuffer() : undefined;

  for (const backendUrl of backendUrls) {
    const target = `${backendUrl}${backendPath}`;
    const url = new URL(target);
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    attempted.push(url.toString());

    try {
      const upstream = await fetch(url.toString(), {
        method: req.method,
        headers: { "content-type": contentType },
        body: requestBody ? requestBody.slice(0) : undefined,
        // @ts-expect-error — Node.js fetch in Next.js standalone
        duplex: isBodyMethod ? "half" : undefined,
      });

      const body = await upstream.arrayBuffer();
      return new NextResponse(body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json",
          "x-ai-upstream": backendUrl,
        },
      });
    } catch (err) {
      console.error("[ai-proxy] upstream error:", backendUrl, err);
    }
  }

  return NextResponse.json(
    {
      error: "Backend unreachable",
      detail: "All configured backend targets failed",
      attempted,
    },
    { status: 502 }
  );
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
