import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").trim();
  const material = (req.nextUrl.searchParams.get("material") || "").trim();
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  const target = aiUrl(
    `/v1/salex/lookup?code=${encodeURIComponent(code)}&material=${encodeURIComponent(material)}&force=${force ? "true" : "false"}`,
  );
  const res = await fetch(target, { cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
