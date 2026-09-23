import type { OrderPayload } from "@/types";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

/** 收件人 = 老闆 + LINE_EXTRA_NOTIFY_IDS 裡的其他人 */
function adminRecipients(): string[] {
  const adminId = process.env.LINE_ADMIN_USER_ID;
  if (!adminId) return [];
  const extraIds = (process.env.LINE_EXTRA_NOTIFY_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [adminId, ...extraIds];
}

/** 推一則純文字給所有管理者。沒設定 token/adminId 就靜靜略過，不讓主流程失敗 */
export async function pushTextToAdmins(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const recipients = adminRecipients();
  if (!token || recipients.length === 0) {
    console.warn("LINE admin 通知未設定，略過");
    return;
  }

  await Promise.all(
    recipients.map(async (to) => {
      const res = await fetch(PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`LINE push 失敗 (${to}):`, res.status, body);
      }
    })
  );
}

/** 推一則純文字給指定客人。沒設 token 就靜靜略過，不讓主流程失敗 */
export async function pushTextToUser(userId: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !userId) {
    console.warn("LINE push 未設定或缺 userId，略過");
    return;
  }
  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`LINE push 給客人失敗 (${userId}):`, res.status, body);
  }
}

export async function notifyAdmin(
  payload: OrderPayload,
  orderId: string,
  total: number
) {
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

  await pushTextToAdmins(text);
}
