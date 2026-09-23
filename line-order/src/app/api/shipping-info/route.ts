import { NextRequest, NextResponse } from "next/server";
import { saveShippingInfo } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/** 客人填 7-11 取貨資訊。公開端點——所有權驗證在 saveShippingInfo() 裡 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      userId?: string;
      name?: string;
      phone?: string;
      storeName?: string;
      storeCode?: string;
    };

    const orderId = (body.orderId || "").trim();
    const userId = (body.userId || "").trim();
    if (!orderId || !userId) {
      return NextResponse.json({ error: "缺少訂單資訊" }, { status: 400 });
    }

    const result = await saveShippingInfo({
      orderId,
      userId,
      name: body.name || "",
      phone: body.phone || "",
      storeName: body.storeName || "",
      storeCode: body.storeCode || "",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 不推播通知管理員——要出貨時直接看後台「匯款核對 → 待出貨」清單，
    // 省下每筆 2 則的 LINE 額度（2026-09-06 決定）。

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("儲存取貨資訊失敗:", msg);
    return NextResponse.json({ error: "儲存失敗，請稍後再試" }, { status: 500 });
  }
}
