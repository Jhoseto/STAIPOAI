import { NextResponse } from "next/server";
import { aiUrl } from "@/lib/api";

export async function GET() {
  try {
    const res = await fetch(aiUrl("/v1/catalog"), {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
