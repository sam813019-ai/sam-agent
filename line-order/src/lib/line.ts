import type { OrderPayload } from "@/types";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function notifyAdmin(
  payload: OrderPayload,
  orderId: string,
  total: number
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const adminId = process.env.LINE_ADMIN_USER_ID;
  if (!token || !adminId) {
    console.warn("LINE admin 通知未設定，略過");
    return;
  }

  const itemsText = payload.items
    .map((i) => {
      const label = i.spec ? `${i.productName} / ${i.spec}` : i.productName;
      return `・${label} x${i.quantity}`;
    })
    .join("\n");

  const text =
    `🛒 新訂單 ${orderId}\n` +
    `👤 ${payload.displayName}\n` +
    `${itemsText}\n` +
    `💰 總計 NT$${total}` +
    (payload.note ? `\n📝 ${payload.note}` : "");

  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: adminId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("LINE push 失敗:", res.status, body);
  }
}
