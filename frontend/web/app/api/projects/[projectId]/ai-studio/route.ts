import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "style";
  
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/ai-studio?mode=${mode}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
