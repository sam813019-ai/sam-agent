import { NextResponse } from "next/server";
import { getSettings } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET /api/settings", err);
    return NextResponse.json({ title: "快速下單" });
  }
}
