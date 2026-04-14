import { NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET() {
  const res = await fetch(aiUrl("/v1/stats"), { cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
