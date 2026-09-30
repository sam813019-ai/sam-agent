"use client";

import { useState } from "react";

type Props = {
  orderId: string;
  userId: string;
  total: number;
  bank: string;
  account: string;
  note: string;
  /** LINE Pay 收款連結，有值才顯示該區塊 */
  linepayUrl?: string;
  /** 回報成功後通知外層更新畫面 */
  onReported: () => void;
};

/**
 * 匯款回報表單。下單完成頁與「我的訂單」頁共用。
 * 後五碼與截圖至少填一項。
 */
export default function PaymentReportForm({
  orderId,
  userId,
  total,
  bank,
  account,
  note,
  linepayUrl,
  onReported,
}: Props) {
  const [last5, setLast5] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);
  // 有 LINE Pay 時預設選 LINE Pay（免手續費、對客人最省事）
  const [method, setMethod] = useState<"linepay" | "bank">(
    linepayUrl ? "linepay" : "bank"
  );
  const isLinePay = Boolean(linepayUrl) && method === "linepay";

  const v = last5.trim();
  const last5Valid = /^\d{5}$/.test(v);
  // LINE Pay 付完會直接跳回頁面，客人記不住交易序號，所以一鍵回報就好；
  // 轉帳仍要後五碼或截圖，老闆才對得到帳。
  const canSubmit = isLinePay || last5Valid || Boolean(file);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(account.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("複製失敗，請手動選取帳號");
    }
  }

  // LINE Pay 固定收款碼不帶金額，客人要自己輸入，所以提供一鍵複製
  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(String(total));
      setAmountCopied(true);
      setTimeout(() => setAmountCopied(false), 2000);
    } catch {
      setError("複製失敗，請手動輸入金額");
    }
  }

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    setError("");
  }

  async function submit() {
    if (!canSubmit || sending) return;
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("orderId", orderId);
      fd.append("userId", userId);
      fd.append("last5", isLinePay ? "" : last5.trim());
      fd.append("method", isLinePay ? "linepay" : "bank");
      if (file) fd.append("proof", file);

      const res = await fetch("/api/payment-report", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "回報失敗");
      onReported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "回報失敗，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="text-left">
      {/* 付款方式切換：有 LINE Pay 才顯示 */}
      {linepayUrl && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {([
            { key: "linepay" as const, label: "💳 LINE Pay", sub: "免手續費" },
            { key: "bank" as const, label: "🏦 銀行轉帳", sub: "需填後五碼" },
          ]).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMethod(m.key);
                setError("");
              }}
              className={`rounded-xl border-2 py-2 ${
                method === m.key
                  ? m.key === "linepay"
                    ? "border-[#06C755] bg-[#06C755]/5"
                    : "border-amber-500 bg-amber-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="block text-sm font-semibold text-gray-800">
                {m.label}
              </span>
              <span className="block text-[11px] text-gray-500">{m.sub}</span>
            </button>
          ))}
        </div>
      )}

      {isLinePay ? (
        <div className="bg-[#06C755]/5 border-2 border-[#06C755]/40 rounded-xl p-4 mb-3">
          <p className="text-xs text-gray-600">應付金額</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">
              NT$ {total.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={copyAmount}
              className="text-xs px-2 py-1 rounded-lg bg-[#06C755] text-white shrink-0"
            >
              {amountCopied ? "已複製" : "複製金額"}
            </button>
          </div>
          <a
            href={linepayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 bg-[#06C755] text-white rounded-xl font-medium"
          >
            1️⃣ 開啟 LINE Pay 付款
          </a>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            進入後請<b className="text-gray-700">
              手動輸入金額 {total.toLocaleString()}
            </b>
            。付款完成後回到這裡，按下方按鈕完成回報即可，不用記交易序號。
          </p>
        </div>
      ) : (
        <>
          {/* 匯款資訊 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-amber-700 mb-2 tracking-wide">
              {linepayUrl ? "🏦 銀行轉帳" : "請匯款至"}
            </p>
            <p className="text-sm text-gray-700 mb-1">{bank}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-lg font-bold tracking-wide">
                {account}
              </span>
              <button
                type="button"
                onClick={copyAccount}
                className="text-xs px-2 py-1 rounded-lg bg-amber-600 text-white shrink-0"
              >
                {copied ? "已複製" : "複製"}
              </button>
            </div>
            <p className="text-xs text-gray-600">應付金額</p>
            <p className="text-xl font-bold text-amber-700">
              NT$ {total.toLocaleString()}
            </p>
          </div>
        </>
      )}

      <p className="text-xs text-gray-600 leading-relaxed mb-3">{note}</p>

      {!isLinePay && (
        <>
          {/* 後五碼 */}
          <label className="block text-sm font-medium mb-1">匯款後五碼</label>
          <input
            inputMode="numeric"
            maxLength={5}
            value={last5}
            onChange={(e) => {
              setLast5(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            placeholder="例如 12345"
            className="w-full border rounded-xl px-3 py-2 mb-1 font-mono tracking-widest"
          />
          {last5.length > 0 && !last5Valid && (
            <p className="text-xs text-red-500 mb-2">後五碼需為 5 位數字</p>
          )}

          <div className="text-center text-xs text-gray-400 my-2">或</div>
        </>
      )}

      {/* 截圖：轉帳是必要證明之一，LINE Pay 則是選填 */}
      <label className="block text-sm font-medium mb-1">
        {isLinePay ? "上傳付款截圖（選填）" : "上傳匯款截圖"}
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => pickFile(e.target.files?.[0] || null)}
        className="w-full text-sm mb-2"
      />
      {preview && (
        // 預覽用的本機 blob，不需要 next/image 最佳化
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="付款截圖預覽"
          className="w-full rounded-xl border mb-2 max-h-56 object-contain bg-gray-50"
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
          {error}
        </p>
      )}

      {/* 先講清楚回報之後會發生什麼，客人才不會一直問「匯完了然後呢」 */}
      <p className="text-[11px] text-gray-500 bg-gray-50 border rounded-lg px-2.5 py-2 mb-2 leading-relaxed">
        📋 送出後我們會核對這筆款項，
        <b className="text-gray-700">核對完成會再用 LINE 傳「取貨資訊表單」給您填寫</b>
        ，填好才會安排出貨。這段期間不用重複回報 🙏
      </p>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
      >
        {sending
          ? "送出中…"
          : isLinePay
            ? `2️⃣ 我已完成 LINE Pay 付款 NT$ ${total.toLocaleString()}`
            : "送出匯款回報"}
      </button>
      {!isLinePay && !last5Valid && !file && (
        <p className="text-xs text-gray-400 text-center mt-2">
          填後五碼或上傳截圖，擇一即可
        </p>
      )}
    </div>
  );
}
