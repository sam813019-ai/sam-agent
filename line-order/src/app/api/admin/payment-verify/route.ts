import { NextRequest, NextResponse } from "next/server";
import {
  getPendingPayments,
  getReadyToShip,
  getReadyToShipGroups,
  getSettings,
  markShipped,
  verifyPayment,
} from "@/lib/sheets";
import { pushTextToUser } from "@/lib/line";

export const dynamic = "force-dynamic";

function campaignsOf(items: { campaign: string }[]): string[] {
  return Array.from(new Set(items.map((i) => i.campaign).filter(Boolean))).sort(
    (a, b) => b.localeCompare(a, "zh-TW")
  );
}

/**
 * ?view=pending（預設）待核對清單／?view=ship 待出貨清單
 * ?campaign= 可限定連線
 */
export async function GET(request: NextRequest) {
  try {
    const campaign =
      request.nextUrl.searchParams.get("campaign")?.trim() || undefined;
    const view = request.nextUrl.searchParams.get("view") || "pending";

    // campaigns 一律回未篩選前的全部清單，前端才建得出下拉選項
    if (view === "ship") {
      const [groups, all] = await Promise.all([
        getReadyToShipGroups(campaign),
        campaign ? getReadyToShip() : Promise.resolve(null),
      ]);
      const orderCount = groups.reduce((n, g) => n + g.orders.length, 0);
      const total = groups.reduce((sum, g) => sum + g.total, 0);
      const campaigns = campaignsOf(all ?? groups);
      return NextResponse.json({
        items: groups,
        count: groups.length,
        orderCount,
        total,
        campaigns,
      });
    }

    const [items, all] = await Promise.all([
      getPendingPayments(campaign),
      campaign ? getPendingPayments() : Promise.resolve(null),
    ]);
    const total = items.reduce((sum, i) => sum + i.total, 0);
    const campaigns = campaignsOf(all ?? items);
    return NextResponse.json({ items, count: items.length, total, campaigns });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("讀取待核對清單失敗:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** 確認收款 / 退回重填 */
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, orderIds, action } = (await request.json()) as {
      orderId?: string;
      orderIds?: string[];
      action?: "confirm" | "reject" | "ship";
    };
    // 整組出貨會帶 orderIds（同一客人同箱寄出），單筆仍用 orderId
    const shipIds = orderIds?.length ? orderIds : orderId ? [orderId] : [];
    if (
      (!orderId && !shipIds.length) ||
      (action !== "confirm" && action !== "reject" && action !== "ship")
    ) {
      return NextResponse.json({ error: "參數不正確" }, { status: 400 });
    }

    if (action === "ship") {
      // 同一箱只推一則通知，訊息裡列出所有訂單編號
      let shipped: Awaited<ReturnType<typeof markShipped>> | null = null;
      const okIds: string[] = [];
      for (const id of shipIds) {
        const r = await markShipped(id);
        if (!r.ok) {
          return NextResponse.json({ error: `${id}：${r.reason}` }, { status: 400 });
        }
        okIds.push(id);
        shipped = r;
      }
      if (!shipped) {
        return NextResponse.json({ error: "沒有可出貨的訂單" }, { status: 400 });
      }
      const orderLabel =
        okIds.length > 1 ? okIds.map((i) => `・${i}`).join("\n") : okIds[0];

      // 通知客人已出貨。7-11 的到貨簡訊要等包裹到門市才發，
      // 中間這幾天客人不知道進度，這則能擋掉「寄了嗎」的詢問。
      // push 失敗不影響出貨標記——Sheet 已經寫好了。
      // 門市自取與超商取貨的通知內容不同，兩種都要發。
      const selfPickup = shipped.storeName.includes("自取");
      if (shipped.userId) {
        try {
          let text: string;
          if (selfPickup) {
            const settings = await getSettings();
            const addr = settings.pickupAddress
              ? `\n📍 ${settings.pickupAddress}`
              : "";
            text = `✅ 您的訂單已備貨完成\n\n訂單 ${orderLabel}${addr}\n\n可以前來取貨囉，到店報您的名字就可以 🫶`;
          } else {
            const store = shipped.storeName
              ? `\n7-11 ${shipped.storeName}${
                  shipped.storeCode ? `（${shipped.storeCode}）` : ""
                }`
              : "";
            const multi =
              okIds.length > 1 ? `\n\n（您的 ${okIds.length} 筆訂單已合併為一箱寄出）` : "";
            text = `📦 您的訂單已出貨\n\n訂單 ${orderLabel}${store}${multi}\n\n包裹送達門市後，7-11 會再發簡訊通知您取貨，請留意手機訊息 🫶`;
          }
          await pushTextToUser(shipped.userId, text);
        } catch (e) {
          console.warn("出貨通知客人失敗:", e);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // confirm / reject 只作用在單筆
    if (!orderId) {
      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
    }
    const result = await verifyPayment(orderId, action);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 確認收款後通知客人填取貨資訊——不填就無法出貨，值得這則 push
    if (action === "confirm" && result.userId) {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        const link = liffId
          ? `\n👉 https://liff.line.me/${liffId}/my-orders`
          : "";
        // 自取的單沒有 7-11 門市可填，文案要不一樣
        const ask =
          result.deliveryMethod === "pickup"
            ? "請留下取貨人姓名與電話，我們備貨完成後會通知您前來取貨"
            : "請填寫 7-11 取貨資訊，我們才能為您出貨";
        await pushTextToUser(
          result.userId,
          `✅ 已收到您的款項\n訂單 ${orderId}\n\n${ask}${link}`
        );
      } catch (e) {
        console.warn("通知客人填取貨資訊失敗:", e);
      }
    }

    // 退回也一定要通知——回報內容被清空了，客人不知道就會一直空等
    if (action === "reject" && result.userId) {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        const link = liffId
          ? `\n👉 https://liff.line.me/${liffId}/my-orders`
          : "";
        await pushTextToUser(
          result.userId,
          `⚠️ 匯款核對未通過\n訂單 ${orderId}\n\n` +
            `很抱歉，我們比對後查不到您這筆匯款入帳，可能是後五碼有誤、金額不符，或是轉帳尚未完成。\n\n` +
            `麻煩您重新回報一次，填寫正確的匯款後五碼，或直接上傳匯款成功的截圖（要看得到日期、金額與帳號末五碼），我們會再幫您核對 🙏\n\n` +
            `如果您還沒完成匯款，或這筆不需要了，也可以直接回覆我們${link}`
        );
      } catch (e) {
        console.warn("通知客人匯款被退回失敗:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("核對更新失敗:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
