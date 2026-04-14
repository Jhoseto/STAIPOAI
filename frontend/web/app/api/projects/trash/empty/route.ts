import { NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function POST() {
  const res = await fetch(aiUrl("/v1/projects/trash/empty"), {
    method: "POST",
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

