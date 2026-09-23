"use client";

import { useEffect, useMemo, useState } from "react";
import PaymentReportForm from "@/components/PaymentReportForm";
import type { OrderRecord, Product, ProductGroup } from "@/types";

type Profile = { userId: string; displayName: string };

type PaymentInfo = {
  enabled: boolean;
  bank: string;
  account: string;
  note: string;
  shippingFee: number;
  giftNote: string;
};

export default function OrderPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("快速下單");
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [reported, setReported] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; name: string } | null>(null);
  const [sheetGroup, setSheetGroup] = useState<ProductGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [cartOpen, setCartOpen] = useState(false);

  // 底部彈窗開著時鎖背景捲動
  useEffect(() => {
    if (sheetGroup) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [sheetGroup]);

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

        fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: p.userId, displayName: p.displayName }),
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
        setPayment({
          enabled: sData.paymentEnabled !== false,
          bank: sData.paymentBank || "",
          account: sData.paymentAccount || "",
          note: sData.paymentNote || "",
          shippingFee: Number(sData.shippingFee ?? 60),
          giftNote: sData.giftNote ?? "",
        });
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
        if (!g.category && p.category) g.category = p.category;
      } else {
        map.set(p.name, {
          name: p.name,
          code: p.code,
          images: [...p.images],
          description: p.description,
          category: p.category,
          variants: [p],
        });
      }
    }
    return Array.from(map.values());
  }, [products]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const g of groups) {
      if (g.category) cats.add(g.category);
    }
    return cats.size > 0 ? ["全部", ...Array.from(cats)] : [];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (selectedCategory === "全部") return groups;
    return groups.filter((g) => g.category === selectedCategory);
  }, [groups, selectedCategory]);

  const items = products
    .map((p) => ({ product: p, q: qty[p.id] || 0 }))
    .filter((x) => x.q > 0);
  const subtotal = items.reduce((s, x) => s + x.product.price * x.q, 0);
  const totalQty = items.reduce((s, x) => s + x.q, 0);
  const shippingFee = payment?.shippingFee ?? 60;
  // 有東西才算運費，購物車空的時候不要顯示 60
  const total = items.length > 0 ? subtotal + shippingFee : 0;

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
            spec: x.product.spec,
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
      <main className="min-h-screen flex items-start justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 text-center my-4">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold mb-2">訂單已送出</h1>
          <p className="text-gray-600 text-sm">訂單編號</p>
          <p className="font-mono text-sm mb-3">{result.orderId}</p>
          <p className="text-gray-600 text-sm">總金額</p>
          <p className="text-2xl font-bold text-brand-accent mb-4">
            NT$ {result.total.toLocaleString()}
          </p>

          {payment?.enabled && profile && !reported && (
            <PaymentReportForm
              orderId={result.orderId}
              userId={profile.userId}
              total={result.total}
              bank={payment.bank}
              account={payment.account}
              note={payment.note}
              onReported={() => setReported(true)}
            />
          )}

          {payment?.enabled && reported && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
              <p className="font-medium text-blue-800 mb-1">✅ 已收到您的匯款回報</p>
              <p className="text-sm text-blue-700">
                我們核對後會更新訂單狀態，可在「我的訂單」查看。
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null);
              setReported(false);
            }}
            className="w-full py-3 bg-brand text-white rounded-xl font-medium mt-3"
          >
            再下一筆
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-48">
      {/* 頂部標題列 */}
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="font-bold text-lg truncate">{title}</h1>
          {profile && (
            <p className="text-xs text-gray-500 truncate">Hi, {profile.displayName}</p>
          )}
        </div>
        <button
          onClick={() => setShowOrders(true)}
          className="shrink-0 text-xs px-3 py-2 rounded-lg border border-brand-accent text-brand-accent"
        >
          我的訂單
        </button>
      </header>

      {/* 類別篩選列 */}
      {categories.length > 0 && (
        <div className="sticky top-[57px] z-10 bg-white border-b flex gap-2 overflow-x-auto px-4 py-2"
          style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 商品列表（緊湊卡片） */}
      <ul className="p-4 space-y-3">
        {filteredGroups.map((g) => {
          const prices = g.variants.map((v) => v.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const priceRange =
            minPrice === maxPrice
              ? `NT$ ${minPrice.toLocaleString()}`
              : `NT$ ${minPrice.toLocaleString()} ~ ${maxPrice.toLocaleString()}`;
          const groupQty = g.variants.reduce((s, v) => s + (qty[v.id] || 0), 0);
          const hasStock = g.variants.some((v) => v.stock > 0);

          return (
            <li key={g.name} className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
              {/* 商品圖 */}
              {g.images.length > 0 ? (
                <button
                  onClick={() => setLightbox({ images: g.images, index: 0, name: g.name })}
                  className="relative shrink-0"
                  aria-label="放大檢視"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.images[0]}
                    alt={g.name}
                    className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                  />
                  {g.images.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      +{g.images.length - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
              )}

              {/* 商品資訊 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-snug truncate">{g.name}</div>
                {g.description && (
                  <div className="text-xs text-gray-400 line-clamp-2 mt-0.5 whitespace-pre-wrap">{g.description}</div>
                )}
                <div className="text-sm font-semibold text-brand-accent mt-1">{priceRange}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {g.variants.length > 1 ? `${g.variants.length} 種規格` : (g.variants[0]?.spec || "標準規格")}
                </div>
              </div>

              {/* 選購按鈕 */}
              <button
                onClick={() => setSheetGroup(g)}
                disabled={!hasStock}
                className="relative shrink-0 px-3 py-2 rounded-xl text-sm font-medium bg-brand text-white disabled:opacity-40"
              >
                {hasStock ? "選購" : "售完"}
                {groupQty > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {groupQty}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {filteredGroups.length === 0 && (
          <li className="text-center text-gray-400 py-10">
            {groups.length === 0 ? "目前沒有商品" : "此分類暫無商品"}
          </li>
        )}
      </ul>

      {/* 底部送出列 */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t">
        {/* 已選商品展開列 */}
        {items.length > 0 && cartOpen && (
          <div className="border-b max-h-44 overflow-y-auto px-4 py-2 space-y-1.5">
            {items.map(({ product: p, q }) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0 mr-2">
                  <span className="font-medium truncate">{p.name}</span>
                  {p.spec && <span className="text-gray-400 ml-1">· {p.spec}</span>}
                </div>
                <div className="shrink-0 text-gray-500">
                  × {q}
                  <span className="ml-2 font-medium text-gray-700">
                    NT$ {(p.price * q).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-1.5 border-t">
              <span className="text-gray-500">7-11 超商運費</span>
              <span className="font-medium text-gray-700">
                NT$ {shippingFee}
              </span>
            </div>
          </div>
        )}

        {/* 運送方式與贈品 */}
        <div className="px-4 pt-2 space-y-0.5">
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <span>📦</span>
            <span>僅限 7-11 超商取貨・每筆運費 NT$ {shippingFee}</span>
          </div>
          {payment?.giftNote && (
            <div className="text-[11px] font-medium text-brand-accent flex items-center gap-1">
              <span>🎁</span>
              <span>{payment.giftNote}</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備註（收件資訊、特殊需求…）"
            className="w-full text-sm p-2 border rounded-lg resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => items.length > 0 && setCartOpen((o) => !o)}
              className="text-left"
            >
              <div className="text-xs text-gray-500 flex items-center gap-1">
                {items.length} 項 / 共 {totalQty} 件
                {items.length > 0 && (
                  <span className="text-brand-accent">{cartOpen ? "▲" : "▼"}</span>
                )}
              </div>
              {items.length > 0 && (
                <div className="text-[11px] text-gray-400">
                  商品 NT$ {subtotal.toLocaleString()} ＋ 運費 NT$ {shippingFee}
                </div>
              )}
              <div className="font-bold text-lg">NT$ {total.toLocaleString()}</div>
            </button>
            <button
              onClick={submit}
              disabled={submitting || items.length === 0}
              className="px-6 py-3 bg-brand text-white rounded-xl font-medium disabled:opacity-40"
            >
              {submitting ? "送出中…" : "送出訂單"}
            </button>
          </div>
        </div>
      </div>

      {showOrders && profile && (
        <MyOrdersModal
          userId={profile.userId}
          campaign={title}
          onClose={() => setShowOrders(false)}
        />
      )}

      {sheetGroup && (
        <VariantSheet
          group={sheetGroup}
          qty={qty}
          onQtyChange={(id, val) => setQty((s) => ({ ...s, [id]: val }))}
          onClose={() => setSheetGroup(null)}
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

function VariantSheet({
  group,
  qty,
  onQtyChange,
  onClose,
}: {
  group: ProductGroup;
  qty: Record<string, number>;
  onQtyChange: (id: string, val: number) => void;
  onClose: () => void;
}) {
  const is2D = group.variants.some((v) => v.spec?.includes("/"));
  const [selDim1, setSelDim1] = useState<string | null>(null);
  const [selDim2, setSelDim2] = useState<string | null>(null);
  const [sel1D, setSel1D] = useState<string | null>(null);
  const [localQty, setLocalQty] = useState(1);
  const [added, setAdded] = useState(false);

  const dim1All = is2D
    ? [...new Set(group.variants.map((v) => v.spec?.split("/")[0] ?? ""))]
    : [];
  const dim2All = is2D
    ? [...new Set(group.variants.map((v) => v.spec?.split("/")[1] ?? ""))]
    : [];

  // dim2 available for selected dim1
  const dim2Available = selDim1
    ? new Set(
        group.variants
          .filter((v) => v.spec?.startsWith(`${selDim1}/`) && v.stock > 0)
          .map((v) => v.spec?.split("/")[1] ?? "")
      )
    : new Set(
        group.variants.filter((v) => v.stock > 0).map((v) => v.spec?.split("/")[1] ?? "")
      );

  // Reset dim2 when dim1 changes and current dim2 is unavailable
  const handleDim1 = (d: string) => {
    setSelDim1(d);
    const stillAvail = group.variants.some(
      (v) => v.spec === `${d}/${selDim2}` && v.stock > 0
    );
    if (!stillAvail) setSelDim2(null);
  };

  // Find matched variant
  const matchedVariant = is2D
    ? group.variants.find((v) => v.spec === `${selDim1}/${selDim2}`)
    : group.variants.find((v) => v.spec === sel1D) ??
      (group.variants.length === 1 ? group.variants[0] : null);

  const canAdd =
    !!matchedVariant &&
    matchedVariant.stock > 0 &&
    localQty > 0 &&
    localQty <= matchedVariant.stock - (qty[matchedVariant.id] || 0);

  const handleAddToCart = () => {
    if (!matchedVariant) return;
    onQtyChange(matchedVariant.id, (qty[matchedVariant.id] || 0) + localQty);
    setLocalQty(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // Cart summary
  const cartItems = group.variants.filter((v) => (qty[v.id] || 0) > 0);
  const groupTotal = cartItems.reduce((s, v) => s + v.price * (qty[v.id] || 0), 0);
  const groupQty = cartItems.reduce((s, v) => s + (qty[v.id] || 0), 0);

  // Auto-detect dimension labels
  const sizeRe = /^(XS|S|M|L|XL|XXL|2XL|3XL|Free|均碼|均一|Free\s*Size)$/i;
  const dim2IsSize = dim2All.length > 0 && dim2All.every((v) => sizeRe.test(v));
  const dim1Label = dim2IsSize ? "顏色" : "選項一";
  const dim2Label = dim2IsSize ? "尺寸" : "選項二";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-20 flex items-end"
      onClick={onClose}
      style={{ touchAction: "none" }}
    >
      <div
        className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pan-y" }}
      >
        {/* 把手 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* 標頭 */}
        <div className="px-4 py-3 flex items-center gap-3 border-b">
          {group.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.images[0]}
              alt={group.name}
              className="w-16 h-16 rounded-xl object-cover bg-gray-100 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base">{group.name}</div>
            {group.description && (
              <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">
                {group.description}
              </div>
            )}
            {matchedVariant && (
              <div className="text-sm font-bold text-brand-accent mt-1">
                NT$ {matchedVariant.price.toLocaleString()}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl px-2 shrink-0" aria-label="關閉">
            ×
          </button>
        </div>

        {/* 可捲動主體 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* 購物車摘要 */}
          {cartItems.length > 0 && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1">
              {cartItems.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{v.spec || "標準規格"}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">× {qty[v.id]}</span>
                    <button
                      className="text-xs text-red-400"
                      onClick={() => onQtyChange(v.id, 0)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2D 選擇器 */}
          {is2D ? (
            <>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">{dim1Label}</div>
                <div className="flex flex-wrap gap-2">
                  {dim1All.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDim1(d)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        selDim1 === d
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">{dim2Label}</div>
                <div className="flex flex-wrap gap-2">
                  {dim2All.map((d) => {
                    const avail = dim2Available.has(d);
                    return (
                      <button
                        key={d}
                        onClick={() => avail && setSelDim2(d)}
                        disabled={!avail}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                          selDim2 === d
                            ? "bg-brand text-white border-brand"
                            : avail
                            ? "bg-white text-gray-700 border-gray-200"
                            : "bg-gray-50 text-gray-300 border-gray-100 line-through"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : group.variants.length > 1 ? (
            /* 1D 選擇器 */
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">選擇規格</div>
              <div className="flex flex-wrap gap-2">
                {group.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => v.stock > 0 && setSel1D(v.spec ?? null)}
                    disabled={v.stock <= 0}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      sel1D === v.spec
                        ? "bg-brand text-white border-brand"
                        : v.stock > 0
                        ? "bg-white text-gray-700 border-gray-200"
                        : "bg-gray-50 text-gray-300 border-gray-100 line-through"
                    }`}
                  >
                    {v.spec || "標準規格"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* 數量 */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">數量</div>
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-full border text-lg disabled:opacity-30"
                disabled={localQty <= 1}
                onClick={() => setLocalQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="text-xl font-semibold w-8 text-center">{localQty}</span>
              <button
                className="w-10 h-10 rounded-full border text-lg disabled:opacity-30"
                disabled={
                  !matchedVariant ||
                  localQty >= matchedVariant.stock - (qty[matchedVariant.id] || 0)
                }
                onClick={() => setLocalQty((q) => q + 1)}
              >
                +
              </button>
              {matchedVariant && (
                <span className="text-xs text-gray-400 ml-1">
                  剩餘 {matchedVariant.stock - (qty[matchedVariant.id] || 0)} 件
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-4 pt-2 pb-4 border-t space-y-2">
          {groupQty > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
              <span>已選 {groupQty} 件</span>
              <span className="font-semibold text-gray-700">NT$ {groupTotal.toLocaleString()}</span>
            </div>
          )}
          <button
            onClick={handleAddToCart}
            disabled={!canAdd}
            className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
              added
                ? "bg-green-500 text-white"
                : canAdd
                ? "bg-brand text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {added ? "✓ 已加入" : canAdd ? "加入購物車" : "請選擇規格"}
          </button>
          {groupQty > 0 && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-medium text-sm"
            >
              完成選購
            </button>
          )}
        </div>
      </div>
    </div>
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
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 text-white text-3xl w-12 h-12 rounded-full bg-black/40"
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
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

  const activeOrders = orders.filter((o) => o.status !== "已取消");
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
          <button onClick={onClose} className="text-gray-400 text-xl px-2" aria-label="關閉">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">載入中…</div>
          ) : err ? (
            <div className="text-red-600 text-sm">{err}</div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8">這次連線還沒有訂單</div>
          ) : (
            activeOrders.map((o) => (
              <div key={o.orderId} className="border rounded-xl p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">{o.time}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border text-gray-600">
                    {o.status}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-400 mb-2">{o.orderId}</div>
                <pre className="text-sm whitespace-pre-wrap font-sans">{o.items}</pre>
                {o.note && (
                  <div className="text-xs text-gray-500 mt-2">備註：{o.note}</div>
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
            <span className="text-sm text-gray-500">共 {activeOrders.length} 筆</span>
            <span className="font-bold text-lg">NT$ {total.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
