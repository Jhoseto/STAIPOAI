import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("run_id");
  const target = runId
    ? `${aiUrl("/v1/scrape/salex/preview")}?run_id=${encodeURIComponent(runId)}`
    : aiUrl("/v1/scrape/salex/preview");
  const res = await fetch(target, { method: "GET", cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
