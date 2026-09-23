"use client";

import { useEffect, useState } from "react";
import type { OrderRecord } from "@/types";
import PaymentReportForm from "@/components/PaymentReportForm";
import ShippingInfoForm from "@/components/ShippingInfoForm";

type Profile = { userId: string; displayName: string };
type PaymentInfo = { enabled: boolean; bank: string; account: string; note: string };

/** 付款狀態徽章的顏色。空字串（HERA bot 加的單）不顯示徽章 */
const PAYMENT_BADGE: Record<string, string> = {
  待匯款: "bg-amber-50 text-amber-700 border-amber-200",
  已回報: "bg-blue-50 text-blue-700 border-blue-200",
  已確認: "bg-green-50 text-green-700 border-green-200",
};

export default function MyOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [campaign, setCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [shippingId, setShippingId] = useState<string | null>(null);

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

        const [res, sRes] = await Promise.all([
          fetch(
            `/api/my-orders?userId=${encodeURIComponent(p.userId)}&scope=current`,
            { cache: "no-store" }
          ),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "查詢失敗");
        setOrders(data.orders || []);
        if (data.campaign) setCampaign(data.campaign);

        const sData = await sRes.json();
        setPayment({
          enabled: sData.paymentEnabled !== false,
          bank: sData.paymentBank || "",
          account: sData.paymentAccount || "",
          note: sData.paymentNote || "",
        });
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
                <div className="flex gap-1.5 shrink-0">
                  {o.paymentStatus && PAYMENT_BADGE[o.paymentStatus] && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        PAYMENT_BADGE[o.paymentStatus]
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border">
                    {o.status}
                  </span>
                </div>
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

              {payment?.enabled && o.paymentStatus === "待匯款" && (
                <div className="mt-3 pt-3 border-t">
                  {reportingId === o.orderId ? (
                    <>
                      <PaymentReportForm
                        orderId={o.orderId}
                        userId={profile?.userId || ""}
                        total={o.total}
                        bank={payment.bank}
                        account={payment.account}
                        note={payment.note}
                        onReported={() => {
                          setOrders((prev) =>
                            prev.map((x) =>
                              x.orderId === o.orderId
                                ? { ...x, paymentStatus: "已回報" }
                                : x
                            )
                          );
                          setReportingId(null);
                        }}
                      />
                      <button
                        onClick={() => setReportingId(null)}
                        className="w-full py-2 mt-2 text-sm text-gray-500"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setReportingId(o.orderId)}
                      className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium"
                    >
                      回報匯款
                    </button>
                  )}
                </div>
              )}

              {o.paymentStatus === "已回報" && (
                <p className="mt-3 pt-3 border-t text-xs text-blue-600">
                  已回報{o.paymentLast5 ? `（後五碼 ${o.paymentLast5}）` : ""}，等待確認中
                </p>
              )}

              {/* 已收款但還沒填取貨資訊 */}
              {o.paymentStatus === "已確認" && !o.shipName && (
                <div className="mt-3 pt-3 border-t">
                  {shippingId === o.orderId ? (
                    <>
                      <ShippingInfoForm
                        orderId={o.orderId}
                        userId={profile?.userId || ""}
                        onSaved={(info) => {
                          setOrders((prev) =>
                            prev.map((x) =>
                              x.orderId === o.orderId
                                ? {
                                    ...x,
                                    shipName: info.name,
                                    shipPhone: info.phone,
                                    shipStoreName: info.storeName,
                                    shipStoreCode: info.storeCode,
                                  }
                                : x
                            )
                          );
                          setShippingId(null);
                        }}
                      />
                      <button
                        onClick={() => setShippingId(null)}
                        className="w-full py-2 mt-2 text-sm text-gray-500"
                      >
                        稍後再填
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                        款項已收到，請填寫 7-11 取貨資訊才能出貨
                      </p>
                      <button
                        onClick={() => setShippingId(o.orderId)}
                        className="w-full py-2.5 bg-brand text-white rounded-xl text-sm font-medium"
                      >
                        填寫取貨資訊
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* 已填取貨資訊 */}
              {o.shipName && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-0.5">
                  <p className="text-green-700 font-medium">✅ 取貨資訊已填寫</p>
                  <p>
                    {o.shipName}・{o.shipPhone}
                  </p>
                  <p>
                    7-11 {o.shipStoreName}
                    {o.shipStoreCode ? `（${o.shipStoreCode}）` : ""}
                  </p>
                </div>
              )}
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
