import { NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/save`), {
    method: "POST",
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

