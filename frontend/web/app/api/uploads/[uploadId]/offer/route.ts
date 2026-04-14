import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(aiUrl("/v1/offers/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      marginPct: body.marginPct ?? 0.2,
      laborPct: body.laborPct ?? 0.25,
      wastePct: body.wastePct ?? 0.15,
      transportCost: body.transportCost ?? 0,
    }),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
