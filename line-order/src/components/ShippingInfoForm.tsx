"use client";

import { useState } from "react";

type Props = {
  orderId: string;
  userId: string;
  onSaved: (info: {
    name: string;
    phone: string;
    storeName: string;
    storeCode: string;
  }) => void;
};

/** 7-11 取貨資訊。核對確認後才會出現 */
export default function ShippingInfoForm({ orderId, userId, onSaved }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const phoneValid = /^\d{8,10}$/.test(phone.replace(/[\s-]/g, ""));
  const canSubmit =
    Boolean(name.trim() && storeName.trim() && storeCode.trim()) &&
    phoneValid &&
    !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/shipping-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userId,
          name: name.trim(),
          phone: phone.replace(/[\s-]/g, ""),
          storeName: storeName.trim(),
          storeCode: storeCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      onSaved({
        name: name.trim(),
        phone: phone.replace(/[\s-]/g, ""),
        storeName: storeName.trim(),
        storeCode: storeCode.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full border rounded-xl px-3 py-2 text-sm";

  return (
    <div className="text-left space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">收件人姓名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="取貨時出示證件的姓名"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">聯絡電話</label>
        <input
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09xxxxxxxx"
          className={inputClass}
        />
        {phone.length > 0 && !phoneValid && (
          <p className="text-xs text-red-500 mt-1">電話格式不正確</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">7-11 門市名稱</label>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="例如 仁武門市"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">門市店號</label>
        <input
          inputMode="numeric"
          value={storeCode}
          onChange={(e) => setStoreCode(e.target.value)}
          placeholder="例如 123456"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">
          可至 7-11 官網或 iOPEN Mall App 查詢門市店號
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
      >
        {saving ? "儲存中…" : "送出取貨資訊"}
      </button>
    </div>
  );
}
