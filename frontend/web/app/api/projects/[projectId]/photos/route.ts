import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  
  // Forward FormData
  const formData = await req.formData();
  
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/photos`), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/photos`), {
    method: "GET",
    cache: "no-store",
  });
  
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
