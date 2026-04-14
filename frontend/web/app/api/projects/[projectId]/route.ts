import { NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}`), {
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent") === "1";
  const res = await fetch(aiUrl(`/v1/projects/${encodeURIComponent(projectId)}?permanent=${permanent ? "true" : "false"}`), {
    method: "DELETE",
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

