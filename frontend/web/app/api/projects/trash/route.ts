import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const res = await fetch(aiUrl(`/v1/projects/trash?${searchParams.toString()}`), { cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

