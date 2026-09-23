import { NextRequest, NextResponse } from "next/server";
import { reportPayment, uploadImageToDrive } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB，截圖用不到更大

/**
 * 客人回報匯款。公開端點——所有權驗證在 reportPayment() 裡做。
 * 收 multipart：orderId / userId / last5 /（選用）proof 檔案
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const orderId = String(form.get("orderId") || "").trim();
    const userId = String(form.get("userId") || "").trim();
    const last5 = String(form.get("last5") || "").trim();
    const file = form.get("proof") as File | null;

    if (!orderId || !userId) {
      return NextResponse.json({ error: "缺少訂單資訊" }, { status: 400 });
    }

    // 先傳圖片。上傳失敗但有後五碼時仍讓流程走完，只在回應裡告知
    let proofUrl = "";
    let uploadWarning = "";
    if (file && file.size > 0) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "截圖太大，最多 5MB" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "只接受圖片檔案" }, { status: 400 });
      }
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        proofUrl = await uploadImageToDrive(
          buffer,
          `payment-${orderId}-${file.name || "proof.jpg"}`,
          file.type
        );
      } catch (e) {
        console.error("匯款截圖上傳失敗:", e);
        if (!last5) {
          return NextResponse.json(
            { error: "截圖上傳失敗，請改填匯款後五碼，或稍後再試" },
            { status: 500 }
          );
        }
        uploadWarning = "截圖上傳失敗，但已記錄您的匯款後五碼";
      }
    }

    const result = await reportPayment({ orderId, userId, last5, proofUrl });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // 不推播通知管理員——老闆直接看後台「匯款核對」頁籤即可，
    // 省下每筆 2 則的 LINE 額度（2026-09-06 決定）。

    return NextResponse.json({ ok: true, warning: uploadWarning || undefined });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("匯款回報失敗:", msg);
    return NextResponse.json({ error: "回報失敗，請稍後再試" }, { status: 500 });
  }
}
