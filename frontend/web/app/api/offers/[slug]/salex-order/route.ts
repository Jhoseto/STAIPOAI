import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const res = await fetch(aiUrl(`/v1/offers/${encodeURIComponent(slug)}/salex-order.csv`), {
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
