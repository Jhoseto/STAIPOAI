import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const url = aiUrl("/v1/scrape/salex/stop");
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Proxy Stop] Error:", error);
    return NextResponse.json({ ok: false, message: "Proxy error" }, { status: 500 });
  }
}
