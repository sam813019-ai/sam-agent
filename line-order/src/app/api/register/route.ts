import { NextResponse } from "next/server";
import { upsertCustomer, bindHistoricalOrders } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      displayName?: string;
      realName?: string;
    };

    if (!body.userId || !body.displayName) {
      return NextResponse.json(
        { error: "缺少使用者資訊" },
        { status: 400 }
      );
    }

    const realName = body.realName?.trim() || undefined;

    const result = await upsertCustomer(
      body.userId,
      body.displayName,
      realName
    );

    // 補綁歷史訂單：顧客名稱 = realName / displayName 且 userId 空白的列，填入 userId
    const bound = await bindHistoricalOrders(body.userId, [
      realName || "",
      body.displayName,
    ]);

    return NextResponse.json({ ok: true, result, bound });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "登記失敗";
    console.error("POST /api/register", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
