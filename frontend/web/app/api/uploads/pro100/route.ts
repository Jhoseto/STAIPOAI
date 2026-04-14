import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const res = await fetch(aiUrl("/v1/pro100/ingest"), {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
