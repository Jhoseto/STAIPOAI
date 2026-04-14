import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(req: NextRequest) {
  const res = await fetch(aiUrl("/v1/scrape/salex/status"), {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    return new NextResponse(await res.text(), { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
