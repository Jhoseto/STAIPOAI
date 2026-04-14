import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const force = req.nextUrl.searchParams.get("force") === "0" ? "false" : "true";
  const res = await fetch(
    aiUrl(`/v1/uploads/${encodeURIComponent(uploadId)}/salex-refresh?force=${force}`),
    {
      method: "POST",
      cache: "no-store",
    },
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

