import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const res = await fetch(aiUrl(`/v1/uploads/${encodeURIComponent(uploadId)}/salex-resolved-table`), {
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  const force = req.nextUrl.searchParams.get("force") === "1";
  const res = await fetch(
    aiUrl(`/v1/uploads/${encodeURIComponent(uploadId)}/salex-resolve-table?force=${force ? "true" : "false"}`),
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

