import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await req.text();
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/stage`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
