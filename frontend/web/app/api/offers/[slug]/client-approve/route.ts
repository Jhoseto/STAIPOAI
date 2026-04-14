import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
  const userAgent = req.headers.get("user-agent") || "";
  
  const res = await fetch(aiUrl(`/v1/offers/${encodeURIComponent(slug)}/client-approve`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, userAgent }),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
