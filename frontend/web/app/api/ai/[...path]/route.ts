/**
 * Runtime AI API Proxy
 *
 * Proxies /api/ai/* → AI_DATA_URL/* at request time.
 * Unlike next.config.ts rewrites (build-time), this reads
 * AI_DATA_URL from the environment on every request — so it
 * works correctly in Cloud Run with runtime env vars.
 */

import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () =>
  (process.env.AI_DATA_URL || "http://localhost:8000").trim().replace(/\/$/, "");

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = "/" + path.join("/");
  const target = `${getBackendUrl()}${backendPath}`;

  // Forward query string
  const url = new URL(target);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const isBodyMethod = !["GET", "HEAD"].includes(req.method);
  const contentType = req.headers.get("content-type") || "application/json";

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers: { "content-type": contentType },
      body: isBodyMethod ? await req.arrayBuffer() : undefined,
      // @ts-expect-error — Node.js fetch in Next.js standalone
      duplex: isBodyMethod ? "half" : undefined,
    });

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error("[ai-proxy] upstream error:", err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err) },
      { status: 502 }
    );
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
