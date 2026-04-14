import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  
  const res = await fetch(aiUrl(`/v1/photos/${encodeURIComponent(photoId)}`), {
    method: "DELETE",
    cache: "no-store",
  });
  
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
