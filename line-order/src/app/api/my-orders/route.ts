import { NextResponse } from "next/server";
import { getMyOrders, getSettings } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const scope = searchParams.get("scope") || "current";

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
    }

    let campaign: string | undefined;
    if (scope === "current") {
      const settings = await getSettings();
      campaign = settings.title;
    }

    const orders = await getMyOrders(userId, campaign);
    return NextResponse.json({ orders, campaign });
  } catch (err) {
    console.error("GET /api/my-orders", err);
    return NextResponse.json(
      { error: "查詢失敗" },
      { status: 500 }
    );
  }
}
