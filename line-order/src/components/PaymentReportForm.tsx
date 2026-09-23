"use client";

import { useState } from "react";

type Props = {
  orderId: string;
  userId: string;
  total: number;
  bank: string;
  account: string;
  note: string;
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
  onReported,
}: Props) {
  const [last5, setLast5] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const last5Valid = /^\d{5}$/.test(last5.trim());
  const canSubmit = (last5Valid || Boolean(file)) && !sending;

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(account.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("複製失敗，請手動選取帳號");
    }
  }

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    setError("");
  }

  async function submit() {
    if (!canSubmit) return;
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("orderId", orderId);
      fd.append("userId", userId);
      fd.append("last5", last5.trim());
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
      {/* 匯款資訊 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-amber-700 mb-2 tracking-wide">
          請匯款至
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

      <p className="text-xs text-gray-600 leading-relaxed mb-3">{note}</p>

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

      {/* 截圖 */}
      <label className="block text-sm font-medium mb-1">上傳匯款截圖</label>
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
          alt="匯款截圖預覽"
          className="w-full rounded-xl border mb-2 max-h-56 object-contain bg-gray-50"
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
      >
        {sending ? "送出中…" : "送出匯款回報"}
      </button>
      {!last5Valid && !file && (
        <p className="text-xs text-gray-400 text-center mt-2">
          填後五碼或上傳截圖，擇一即可
        </p>
      )}
    </div>
  );
}
