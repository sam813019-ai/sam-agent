"use client";

import { useEffect, useState } from "react";
import type { OrderRecord } from "@/types";

type Profile = { userId: string; displayName: string };

export default function MyOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [campaign, setCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID 未設定");

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setProfile({ userId: p.userId, displayName: p.displayName });

        const res = await fetch(
          `/api/my-orders?userId=${encodeURIComponent(p.userId)}&scope=current`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "查詢失敗");
        setOrders(data.orders || []);
        if (data.campaign) setCampaign(data.campaign);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "已取消");
  const total = activeOrders.reduce((s, o) => s + o.total, 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400">
        載入中…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <h1 className="font-bold text-lg">我的訂單</h1>
        {profile && (
          <p className="text-xs text-gray-500">Hi, {profile.displayName}</p>
        )}
        {campaign && (
          <p className="text-xs text-gray-400 truncate">{campaign}</p>
        )}
      </header>

      <div className="p-4 space-y-3 pb-28">
        {activeOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-3">📦</div>
            <p>這次連線還沒有訂單</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-4 px-5 py-2 bg-brand text-white rounded-xl text-sm"
            >
              去下單
            </button>
          </div>
        ) : (
          activeOrders.map((o) => (
            <div key={o.orderId} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-gray-400">{o.time}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border">
                  {o.status}
                </span>
              </div>
              <div className="font-mono text-xs text-gray-300 mb-2">{o.orderId}</div>
              <pre className="text-sm whitespace-pre-wrap font-sans text-gray-800">
                {o.items}
              </pre>
              {o.note && (
                <p className="text-xs text-gray-400 mt-2">備註：{o.note}</p>
              )}
              <div className="text-right font-semibold text-brand-accent mt-3">
                NT$ {o.total.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {activeOrders.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t px-4 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">共 {activeOrders.length} 筆訂單</span>
          <span className="font-bold text-xl">NT$ {total.toLocaleString()}</span>
        </div>
      )}
    </main>
  );
}
