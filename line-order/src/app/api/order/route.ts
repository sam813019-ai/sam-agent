import { NextResponse } from "next/server";
import {
  appendOrder,
  getProducts,
  getSettings,
  hasOpenOrder,
} from "@/lib/sheets";
import { notifyAdmin } from "@/lib/line";
import type { OrderPayload } from "@/types";

export const dynamic = "force-dynamic";

function genOrderId() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${date}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrderPayload;

    if (!body.userId || !body.displayName) {
      return NextResponse.json(
        { error: "缺少使用者資訊" },
        { status: 400 }
      );
    }
    if (!body.items?.length) {
      return NextResponse.json(
        { error: "購物車是空的" },
        { status: 400 }
      );
    }

    const products = await getProducts();
    const priceMap = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const normalized = body.items.map((i) => {
      const p = priceMap.get(i.productId);
      if (!p) throw new Error(`商品 ${i.productId} 不存在或已下架`);
      if (i.quantity <= 0) throw new Error("數量需大於 0");
      const unitPrice = p.price;
      total += unitPrice * i.quantity;
      return {
        productId: p.id,
        productName: p.name,
        spec: p.spec,
        code: p.code,
        campaign: p.campaign,
        quantity: i.quantity,
        unitPrice,
      };
    });

    const orderId = genOrderId();
    const settings = await getSettings();
    const campaign = settings.title;

    // 運費含進總額，客人匯的金額就是這個數字（訂單明細不加運費列，
    // 那張表是叫貨統計的來源）
    // 免運門檻以「商品小計」判斷（此時 total 還沒加運費），跨連線的商品一起計算。
    // 一定要在後端算，前端只負責顯示，不能信任送上來的金額。
    const subtotal = total;
    const threshold = settings.freeShippingThreshold;
    // 門市自取不經物流，一律免運；其次看免運門檻；
    // 最後看這位客人本檔是否已有未出貨的訂單——有的話會併箱寄，第二筆起不重複收運費。
    const isPickup =
      settings.pickupEnabled && body.deliveryMethod === "pickup";
    const repeatOrder = isPickup
      ? false
      : await hasOpenOrder(body.userId, campaign);
    const shippingFee =
      isPickup || repeatOrder || (threshold > 0 && subtotal >= threshold)
        ? 0
        : settings.shippingFee;
    total += shippingFee;

    const payload: OrderPayload = {
      ...body,
      items: normalized,
      deliveryMethod: isPickup ? "pickup" : "store",
    };

    await appendOrder(payload, orderId, total, campaign);
    await notifyAdmin(payload, orderId, total);

    return NextResponse.json({ ok: true, orderId, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "下單失敗";
    console.error("POST /api/order", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
