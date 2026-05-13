"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrderRecord, Product, ProductGroup } from "@/types";

type Profile = { userId: string; displayName: string };

export default function OrderPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("快速下單");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; total: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    name: string;
  } | null>(null);

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

        // 靜默登記客戶對照（失敗不影響下單流程）
        fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: p.userId,
            displayName: p.displayName,
          }),
        }).catch(() => {});

        const [pRes, sRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        const pData = await pRes.json();
        const sData = await sRes.json();
        if (!pRes.ok) throw new Error(pData.error || "載入商品失敗");
        setProducts(pData.products);
        if (sData.title) setTitle(sData.title);
      } catch (e) {
        setError(e instanceof Error ? e.message : "初始化失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    for (const p of products) {
      const g = map.get(p.name);
      if (g) {
        g.variants.push(p);
        for (const url of p.images) {
          if (!g.images.includes(url)) g.images.push(url);
        }
        if (!g.code && p.code) g.code = p.code;
        if (!g.description && p.description) g.description = p.description;
      } else {
        map.set(p.name, {
          name: p.name,
          code: p.code,
          images: [...p.images],
          description: p.description,
          variants: [p],
        });
      }
    }
    return Array.from(map.values());
  }, [products]);

  const items = products
    .map((p) => ({ product: p, q: qty[p.id] || 0 }))
    .filter((x) => x.q > 0);
  const total = items.reduce((s, x) => s + x.product.price * x.q, 0);
  const totalQty = items.reduce((s, x) => s + x.q, 0);

  async function submit() {
    if (!profile) return;
    if (items.length === 0) {
      setError("請至少選擇一項商品");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          note,
          items: items.map((x) => ({
            productId: x.product.id,
            productName: x.product.name,
            quantity: x.q,
            unitPrice: x.product.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "下單失敗");
      setResult({ orderId: data.orderId, total: data.total });
      setQty({});
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "下單失敗");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        載入中…
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold mb-2">訂單已送出</h1>
          <p className="text-gray-600 text-sm">訂單編號</p>
          <p className="font-mono text-sm mb-3">{result.orderId}</p>
          <p className="text-gray-600 text-sm">總金額</p>
          <p className="text-2xl font-bold text-brand-accent mb-4">
            NT$ {result.total.toLocaleString()}
          </p>
          <button
            onClick={() => setResult(null)}
            className="w-full py-3 bg-brand text-white rounded-xl font-medium"
          >
            再下一筆
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-40">
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="font-bold text-lg truncate">{title}</h1>
          {profile && (
            <p className="text-xs text-gray-500 truncate">
              Hi, {profile.displayName}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowOrders(true)}
          className="shrink-0 text-xs px-3 py-2 rounded-lg border border-brand-accent text-brand-accent"
        >
          我的訂單
        </button>
      </header>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <ul className="p-4 space-y-4">
        {groups.map((g) => (
          <li key={g.name} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex gap-3">
              {g.images.length > 0 && (
                <button
                  onClick={() =>
                    setLightbox({ images: g.images, index: 0, name: g.name })
                  }
                  className="relative shrink-0"
                  aria-label="放大檢視"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.images[0]}
                    alt={g.name}
                    className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                  />
                  {g.images.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      +{g.images.length - 1}
                    </span>
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{g.name}</div>
                {g.description && (
                  <div className="text-xs text-gray-500 whitespace-pre-wrap">
                    {g.description}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 divide-y">
              {g.variants.map((v) => {
                const q = qty[v.id] || 0;
                const outOfStock = v.stock <= 0;
                return (
                  <div
                    key={v.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm">
                        {v.spec || "標準規格"}
                        {outOfStock && (
                          <span className="ml-2 text-xs text-red-500">
                            已售完
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        NT$ {v.price.toLocaleString()} · 庫存 {v.stock}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-8 h-8 rounded-full border disabled:opacity-30"
                        disabled={q <= 0}
                        onClick={() =>
                          setQty((s) => ({
                            ...s,
                            [v.id]: Math.max(0, q - 1),
                          }))
                        }
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-medium">{q}</span>
                      <button
                        className="w-8 h-8 rounded-full border disabled:opacity-30"
                        disabled={outOfStock || q >= v.stock}
                        onClick={() =>
                          setQty((s) => ({ ...s, [v.id]: q + 1 }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
        {groups.length === 0 && (
          <li className="text-center text-gray-400 py-10">
            目前沒有商品
          </li>
        )}
      </ul>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-4 space-y-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註（收件資訊、特殊需求…）"
          className="w-full text-sm p-2 border rounded-lg resize-none"
          rows={2}
        />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">
              {items.length} 項 / 共 {totalQty} 件
            </div>
            <div className="font-bold text-lg">
              NT$ {total.toLocaleString()}
            </div>
          </div>
          <button
            onClick={submit}
            disabled={submitting || items.length === 0}
            className="px-6 py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
          >
            {submitting ? "送出中…" : "送出訂單"}
          </button>
        </div>
      </div>

      {showOrders && profile && (
        <MyOrdersModal
          userId={profile.userId}
          campaign={title}
          onClose={() => setShowOrders(false)}
        />
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </main>
  );
}

function Lightbox({
  images,
  index: initialIndex,
  name,
  onClose,
}: {
  images: string[];
  index: number;
  name: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-30 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl w-10 h-10"
        aria-label="關閉"
      >
        ×
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 text-white text-3xl w-12 h-12 rounded-full bg-black/40"
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 text-white text-3xl w-12 h-12 rounded-full bg-black/40"
            aria-label="下一張"
          >
            ›
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={name}
        className="max-w-[92vw] max-h-[85vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-4 text-white text-sm">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

function MyOrdersModal({
  userId,
  campaign,
  onClose,
}: {
  userId: string;
  campaign: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/my-orders?userId=${encodeURIComponent(userId)}&scope=current`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "查詢失敗");
        setOrders(data.orders || []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "查詢失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const activeOrders = orders.filter((o) => o.status !== '已取消');
  const total = activeOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-20 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="font-bold">我的訂單</h2>
            <p className="text-xs text-gray-500 truncate">{campaign}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl px-2"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">載入中…</div>
          ) : err ? (
            <div className="text-red-600 text-sm">{err}</div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              這次連線還沒有訂單
            </div>
          ) : (
            activeOrders.map((o) => (
              <div
                key={o.orderId}
                className="border rounded-xl p-3 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">{o.time}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border text-gray-600">
                    {o.status}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-400 mb-2">
                  {o.orderId}
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {o.items}
                </pre>
                {o.note && (
                  <div className="text-xs text-gray-500 mt-2">
                    備註：{o.note}
                  </div>
                )}
                <div className="text-right font-semibold text-brand-accent mt-2">
                  NT$ {o.total.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && activeOrders.length > 0 && (
          <div className="px-4 py-3 border-t bg-white flex justify-between items-center">
            <span className="text-sm text-gray-500">
              共 {activeOrders.length} 筆
            </span>
            <span className="font-bold text-lg">
              NT$ {total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
