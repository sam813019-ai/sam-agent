import { NextResponse } from "next/server";
import { appendOrder, getProducts, getSettings } from "@/lib/sheets";
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
        quantity: i.quantity,
        unitPrice,
      };
    });

    const orderId = genOrderId();
    const payload: OrderPayload = { ...body, items: normalized };
    const settings = await getSettings();
    const campaign = settings.title;

    await appendOrder(payload, orderId, total, campaign);
    await notifyAdmin(payload, orderId, total);

    return NextResponse.json({ ok: true, orderId, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "下單失敗";
    console.error("POST /api/order", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
