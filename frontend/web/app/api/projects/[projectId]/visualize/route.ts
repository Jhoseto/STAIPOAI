import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await req.json();
  const { photoId, photoUrl, styleKey } = body;

  const qs = new URLSearchParams({
    photo_id: photoId ?? "",
    style_key: styleKey ?? "",
    ...(photoUrl ? { photo_url: photoUrl } : {}),
  });

  const res = await fetch(
    aiUrl(`/v1/projects/${encodeURIComponent(projectId)}/visualize?${qs}`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
