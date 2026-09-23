import { NextRequest, NextResponse } from "next/server";
import {
  getPendingPayments,
  getReadyToShip,
  markShipped,
  verifyPayment,
} from "@/lib/sheets";
import { pushTextToUser } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * ?view=pending（預設）待核對清單／?view=ship 待出貨清單
 * ?campaign= 可限定連線
 */
export async function GET(request: NextRequest) {
  try {
    const campaign =
      request.nextUrl.searchParams.get("campaign")?.trim() || undefined;
    const view = request.nextUrl.searchParams.get("view") || "pending";

    if (view === "ship") {
      const items = await getReadyToShip(campaign);
      const total = items.reduce((sum, i) => sum + i.total, 0);
      return NextResponse.json({ items, count: items.length, total });
    }

    const items = await getPendingPayments(campaign);
    const total = items.reduce((sum, i) => sum + i.total, 0);
    return NextResponse.json({ items, count: items.length, total });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("讀取待核對清單失敗:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** 確認收款 / 退回重填 */
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, action } = (await request.json()) as {
      orderId?: string;
      action?: "confirm" | "reject" | "ship";
    };
    if (
      !orderId ||
      (action !== "confirm" && action !== "reject" && action !== "ship")
    ) {
      return NextResponse.json({ error: "參數不正確" }, { status: 400 });
    }

    if (action === "ship") {
      const shipped = await markShipped(orderId);
      if (!shipped.ok) {
        return NextResponse.json({ error: shipped.reason }, { status: 400 });
      }

      // 通知客人已出貨。7-11 的到貨簡訊要等包裹到門市才發，
      // 中間這幾天客人不知道進度，這則能擋掉「寄了嗎」的詢問。
      // push 失敗不影響出貨標記——Sheet 已經寫好了。
      // 門市自取的單（收件資訊填「門市自取」）客人已經拿到貨，不用發 7-11 那則。
      const selfPickup = shipped.storeName.includes("自取");
      if (shipped.userId && !selfPickup) {
        try {
          const store = shipped.storeName
            ? `\n7-11 ${shipped.storeName}${
                shipped.storeCode ? `（${shipped.storeCode}）` : ""
              }`
            : "";
          await pushTextToUser(
            shipped.userId,
            `📦 您的訂單已出貨\n\n訂單 ${orderId}${store}\n\n包裹送達門市後，7-11 會再發簡訊通知您取貨，請留意手機訊息 🫶`
          );
        } catch (e) {
          console.warn("出貨通知客人失敗:", e);
        }
      }

      return NextResponse.json({ ok: true });
    }
    const result = await verifyPayment(orderId, action);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 確認收款後通知客人填 7-11 取貨資訊——不填就無法出貨，值得這則 push
    if (action === "confirm" && result.userId) {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        const link = liffId
          ? `\n👉 https://liff.line.me/${liffId}/my-orders`
          : "";
        await pushTextToUser(
          result.userId,
          `✅ 已收到您的款項\n訂單 ${orderId}\n\n請填寫 7-11 取貨資訊，我們才能為您出貨${link}`
        );
      } catch (e) {
        console.warn("通知客人填取貨資訊失敗:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("核對更新失敗:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
