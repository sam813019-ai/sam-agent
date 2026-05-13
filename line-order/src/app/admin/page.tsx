'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'product' | 'purchase' | 'sales' | 'proxy' | 'orders' | 'report' | 'manage' | 'stats';

interface InventoryItem {
  code: string;
  name: string;
  spec: string;
  costPrice: number;
  price: number;
  stock: number;
}

interface ClerkProfile {
  displayName: string;
  userId: string;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

// ─── 共用樣式 ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls =
  'w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-start pt-0.5">
      <span className="text-sm text-gray-600 pt-2">{label}</span>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

// ─── 圖片上傳元件 ────────────────────────────────────────────────────────────

function ImageUpload({
  imageUrl,
  setImageUrl,
}: {
  imageUrl: string;
  setImageUrl: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    // 本地預覽
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // 上傳到 Google Drive
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImageUrl(data.url);
      } else {
        setUploadError(data.error || '上傳失敗');
        setPreview('');
      }
    } catch {
      setUploadError('網路錯誤，請重試');
      setPreview('');
    }
    setUploading(false);
    // 清掉 input 值，允許重複選同一檔案
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* 拍照 / 相簿按鈕 */}
      <label
        className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed rounded-lg cursor-pointer text-sm transition-colors ${
          uploading
            ? 'border-gray-200 text-gray-400 pointer-events-none'
            : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
        }`}
      >
        <span>{uploading ? '上傳中...' : '📷  選擇圖片 / 拍照'}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {/* 預覽 */}
      {preview && (
        <div className="flex items-center gap-3">
          <img src={preview} alt="預覽" className="w-16 h-16 object-cover rounded-lg border" />
          <span className="text-xs text-green-600">已上傳到 Google Drive</span>
        </div>
      )}

      {/* 上傳錯誤 */}
      {uploadError && (
        <p className="text-xs text-red-600">{uploadError}</p>
      )}

      {/* 備用：直接貼 URL */}
      <input
        value={imageUrl}
        onChange={(e) => {
          setImageUrl(e.target.value);
          if (!e.target.value) setPreview('');
        }}
        className={inputCls}
        placeholder="或直接貼 Google Drive / 圖片連結"
      />
    </div>
  );
}

// ─── 上架商品 ─────────────────────────────────────────────────────────────────

function ProductForm({
  onSuccess,
  onError,
}: {
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [form, setForm] = useState({
    code: '',
    name: '',
    spec: '',
    costPrice: '',
    price: '',
    stock: '',
    imageUrl: '',
    description: '',
    writeToInventory: true,
    writeToProducts: true,
  });

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({
      code: '', name: '', spec: '', costPrice: '', price: '', stock: '',
      imageUrl: '', description: '', writeToInventory: true, writeToProducts: true,
    });
    setResetKey((k) => k + 1); // 強制 ImageUpload 重新掛載，清除預覽
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.writeToInventory && !form.writeToProducts) {
      onError('請至少勾選一個寫入目標');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          costPrice: Number(form.costPrice) || 0,
          price: Number(form.price),
          stock: Number(form.stock),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(`已上架到：${data.written.join('、')}`);
        reset();
      } else {
        onError(data.error || '上架失敗');
      }
    } catch {
      onError('網路錯誤，請重試');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card title="商品資訊">
        <Row label="貨號 *">
          <input required value={form.code} onChange={(e) => set('code', e.target.value)}
            className={inputCls} placeholder="F01" />
        </Row>
        <Row label="品名 *">
          <input required value={form.name} onChange={(e) => set('name', e.target.value)}
            className={inputCls} placeholder="細肩浪漫短洋" />
        </Row>
        <Row label="規格 *">
          <input required value={form.spec} onChange={(e) => set('spec', e.target.value)}
            className={inputCls} placeholder="黑M" />
        </Row>
        <Row label="進價">
          <input type="number" min="0" value={form.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
            className={inputCls} placeholder="350" />
        </Row>
        <Row label="售價 *">
          <input required type="number" min="0" value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className={inputCls} placeholder="580" />
        </Row>
        <Row label="庫存 *">
          <input required type="number" min="0" value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            className={inputCls} placeholder="10" />
        </Row>
        <Row label="圖片">
          <ImageUpload
            key={resetKey}
            imageUrl={form.imageUrl}
            setImageUrl={(url) => set('imageUrl', url)}
          />
        </Row>
        <Row label="備註">
          <input value={form.description} onChange={(e) => set('description', e.target.value)}
            className={inputCls} placeholder="選填" />
        </Row>
      </Card>

      <Card title="寫入目標">
        <label className="flex items-center gap-3 cursor-pointer py-0.5">
          <input type="checkbox" checked={form.writeToInventory}
            onChange={(e) => set('writeToInventory', e.target.checked)}
            className="w-4 h-4 accent-blue-600" />
          <span className="text-sm text-gray-700">庫存表（HERA 店面系統）</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer py-0.5">
          <input type="checkbox" checked={form.writeToProducts}
            onChange={(e) => set('writeToProducts', e.target.checked)}
            className="w-4 h-4 accent-blue-600" />
          <span className="text-sm text-gray-700">商品表（LIFF 下單頁面）</span>
        </label>
      </Card>

      <button type="submit" disabled={loading} className={btnCls}>
        {loading ? '上架中...' : '確認上架'}
      </button>
    </form>
  );
}

// ─── 銷售紀錄 ─────────────────────────────────────────────────────────────────

function SalesForm({
  inventory,
  clerkProfile,
  liffReady,
  liffError,
  onLiffLogin,
  onSuccess,
  onError,
}: {
  inventory: InventoryItem[];
  clerkProfile: ClerkProfile | null;
  liffReady: boolean;
  liffError: string;
  onLiffLogin: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const [form, setForm] = useState({
    date: today,
    clerk: '',
    productCode: '',
    spec: '',
    quantity: '1',
    amount: '',
    paymentMethod: '現金',
  });

  // 有 LINE 身份時自動填入
  useEffect(() => {
    if (clerkProfile) {
      setForm((f) => ({ ...f, clerk: clerkProfile.displayName }));
    }
  }, [clerkProfile]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCodeChange = (code: string) => {
    const item = inventory.find((i) => i.code === code);
    setForm((f) => ({
      ...f,
      productCode: code,
      spec: item ? item.spec : f.spec,
      amount: item ? String(item.price) : f.amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          amount: Number(form.amount),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const stockMsg = data.newStock !== null ? `，庫存剩 ${data.newStock}` : '';
        onSuccess(`銷售紀錄已寫入：${form.productCode} x${form.quantity}${stockMsg}`);
        setForm({
          date: today,
          clerk: clerkProfile ? clerkProfile.displayName : '',
          productCode: '', spec: '', quantity: '1', amount: '', paymentMethod: '現金',
        });
      } else {
        onError('寫入失敗，請重試');
      }
    } catch {
      onError('網路錯誤，請重試');
    }
    setLoading(false);
  };

  const codes = Array.from(new Set(inventory.map((i) => i.code)));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card title="銷售資訊">
        <Row label="日期 *">
          <input required value={form.date} onChange={(e) => set('date', e.target.value)}
            className={inputCls} />
        </Row>

        {/* 店員：有 LINE 身份就顯示識別卡 */}
        <Row label="店員 *">
          {clerkProfile ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-green-800">{clerkProfile.displayName}</span>
              <span className="text-xs text-green-500 ml-auto">LINE 已識別</span>
            </div>
          ) : (
            <div className="space-y-2">
              {liffReady && (
                <button
                  type="button"
                  onClick={onLiffLogin}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  用 LINE 辨識我的身份
                </button>
              )}
              {liffError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1">{liffError}</p>
              )}
              <input
                required={!liffReady}
                value={form.clerk}
                onChange={(e) => set('clerk', e.target.value)}
                className={inputCls}
                placeholder={liffReady ? '或直接輸入姓名' : '店員姓名'}
              />
            </div>
          )}
        </Row>

        <Row label="貨號 *">
          {codes.length > 0 ? (
            <select required value={form.productCode}
              onChange={(e) => handleCodeChange(e.target.value)} className={inputCls}>
              <option value="">選擇貨號</option>
              {codes.map((code) => {
                const item = inventory.find((i) => i.code === code);
                return (
                  <option key={code} value={code}>
                    {code}{item ? ` ${item.name}` : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <input required value={form.productCode}
              onChange={(e) => set('productCode', e.target.value)}
              className={inputCls} placeholder="F01" />
          )}
        </Row>
        <Row label="規格 *">
          <input required value={form.spec} onChange={(e) => set('spec', e.target.value)}
            className={inputCls} placeholder="黑M" />
        </Row>
        <Row label="數量 *">
          <input required type="number" min="1" value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)} className={inputCls} />
        </Row>
        <Row label="金額 *">
          <input required type="number" min="0" value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={inputCls} placeholder="580" />
        </Row>
        <Row label="付款方式">
          <select value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value)} className={inputCls}>
            <option>現金</option>
            <option>轉帳</option>
            <option>信用卡</option>
            <option>LINE Pay</option>
          </select>
        </Row>
      </Card>

      <button type="submit" disabled={loading} className={btnCls}>
        {loading ? '寫入中...' : '確認銷售'}
      </button>
    </form>
  );
}

// ─── 代購下單 ─────────────────────────────────────────────────────────────────

function ProxyForm({
  campaignName,
  onSuccess,
  onError,
}: {
  campaignName: string;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    productCode: '',
    spec: '',
    costPrice: '',
    salePrice: '',
    quantity: '1',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const cost = Number(form.costPrice) || 0;
  const sale = Number(form.salePrice) || 0;
  const qty = Number(form.quantity) || 1;
  const profit = (sale - cost) * qty;
  const showProfit = cost > 0 || sale > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          costPrice: cost,
          salePrice: sale,
          quantity: qty,
          campaignName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(
          `代購已建立 ${data.orderId}｜毛利 NT$${Number(data.profit).toLocaleString()}`
        );
        setForm({ customerName: '', productCode: '', spec: '', costPrice: '', salePrice: '', quantity: '1' });
      } else {
        onError(data.error || '建立失敗');
      }
    } catch {
      onError('網路錯誤，請重試');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card title="代購資訊">
        <Row label="顧客姓名 *">
          <input required value={form.customerName}
            onChange={(e) => set('customerName', e.target.value)}
            className={inputCls} placeholder="顧客直播用名字" />
        </Row>
        <Row label="商品編號 *">
          <input required value={form.productCode}
            onChange={(e) => set('productCode', e.target.value)}
            className={inputCls} placeholder="F01" />
        </Row>
        <Row label="規格 *">
          <input required value={form.spec} onChange={(e) => set('spec', e.target.value)}
            className={inputCls} placeholder="黑M" />
        </Row>
        <Row label="進價 *">
          <input required type="number" min="0" value={form.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
            className={inputCls} placeholder="350" />
        </Row>
        <Row label="售價 *">
          <input required type="number" min="0" value={form.salePrice}
            onChange={(e) => set('salePrice', e.target.value)}
            className={inputCls} placeholder="580" />
        </Row>
        <Row label="數量 *">
          <input required type="number" min="1" value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)} className={inputCls} />
        </Row>
      </Card>

      {showProfit && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            profit >= 0
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          預估毛利：NT${profit.toLocaleString()}（{qty} 件，售價合計 NT${(sale * qty).toLocaleString()}）
        </div>
      )}

      {campaignName && (
        <p className="text-xs text-gray-400 text-center">當前連線：{campaignName}</p>
      )}

      <button type="submit" disabled={loading} className={btnCls}>
        {loading ? '建立中...' : '確認代購'}
      </button>
    </form>
  );
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('product');
  const [toast, setToast] = useState<Toast | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [clerkProfile, setClerkProfile] = useState<ClerkProfile | null>(null);
  const [liffReady, setLiffReady] = useState(false);
  const [liffError, setLiffError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liffRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setCampaignName(d.title || ''))
      .catch(() => {});

    fetch('/api/admin/inventory')
      .then((r) => r.json())
      .then(setInventory)
      .catch(() => {});

    let mounted = true;
    import('@line/liff')
      .then(({ default: liff }) => {
        liffRef.current = liff;
        liff
          .init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
          .then(() => {
            if (!mounted) return;
            setLiffReady(true);
            console.log('[LIFF] isLoggedIn:', liff.isLoggedIn());
            if (liff.isLoggedIn()) {
              liff.getProfile()
                .then((profile) => {
                  if (mounted) {
                    setClerkProfile({
                      displayName: profile.displayName,
                      userId: profile.userId,
                    });
                  }
                })
                .catch((err) => {
                  const msg: string = err?.message ?? String(err);
                  if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('access token')) {
                    liff.logout();
                  } else if (mounted) {
                    setLiffError(`getProfile 失敗：${msg}`);
                  }
                });
            }
          })
          .catch((err) => {
            if (mounted) setLiffError(`LIFF 初始化失敗：${err?.message ?? err}`);
          });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleLiffLogin = () => {
    if (liffRef.current) {
      liffRef.current.login({ redirectUri: window.location.href });
    }
  };

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'product', label: '上架' },
    { key: 'purchase', label: '進貨' },
    { key: 'sales', label: '銷售' },
    { key: 'proxy', label: '代購' },
    { key: 'orders', label: '訂單管理' },
    { key: 'report', label: '銷售報表' },
    { key: 'manage', label: '商品管理' },
    { key: 'stats', label: '叫貨統計' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">HERA 後台管理</h1>
          {campaignName && (
            <p className="text-xs text-gray-400">當前連線：{campaignName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {clerkProfile && (
            <span className="text-xs text-green-400">{clerkProfile.displayName}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded"
          >
            登出
          </button>
        </div>
      </div>

      {/* Tab Bar — 橫向捲動 */}
      <div className="bg-white border-b sticky top-0 z-10 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {tab === 'product' && (
          <ProductForm
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'purchase' && (
          <PurchaseForm
            inventory={inventory}
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'sales' && (
          <SalesForm
            inventory={inventory}
            clerkProfile={clerkProfile}
            liffReady={liffReady}
            liffError={liffError}
            onLiffLogin={handleLiffLogin}
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'proxy' && (
          <ProxyForm
            campaignName={campaignName}
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'orders' && (
          <OrdersManagement
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'report' && <SalesReport />}
        {tab === 'manage' && (
          <ProductManagement
            onSuccess={(m) => showToast('success', m)}
            onError={(m) => showToast('error', m)}
          />
        )}
        {tab === 'stats' && <OrderStats />}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 inset-x-4 max-w-lg mx-auto rounded-xl px-4 py-3 text-sm font-medium shadow-xl z-50 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── 進貨紀錄 ─────────────────────────────────────────────────────────────────

function PurchaseForm({
  inventory,
  onSuccess,
  onError,
}: {
  inventory: InventoryItem[];
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const [form, setForm] = useState({ date: today, productCode: '', spec: '', quantity: '1' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCodeChange = (code: string) => {
    const item = inventory.find((i) => i.code === code);
    setForm((f) => ({ ...f, productCode: code, spec: item ? item.spec : f.spec }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      const data = await res.json();
      if (res.ok) {
        const stockMsg = data.newStock !== null ? `，庫存現為 ${data.newStock}` : '';
        onSuccess(`進貨已登記：${form.productCode} x${form.quantity}${stockMsg}`);
        setForm({ date: today, productCode: '', spec: '', quantity: '1' });
      } else {
        onError(data.error || '登記失敗');
      }
    } catch {
      onError('網路錯誤，請重試');
    }
    setLoading(false);
  };

  const codes = Array.from(new Set(inventory.map((i) => i.code)));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card title="進貨資訊">
        <Row label="日期 *">
          <input required value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
        </Row>
        <Row label="貨號 *">
          {codes.length > 0 ? (
            <select required value={form.productCode} onChange={(e) => handleCodeChange(e.target.value)} className={inputCls}>
              <option value="">選擇貨號</option>
              {codes.map((code) => {
                const item = inventory.find((i) => i.code === code);
                return <option key={code} value={code}>{code}{item ? ` ${item.name}` : ''}</option>;
              })}
            </select>
          ) : (
            <input required value={form.productCode} onChange={(e) => set('productCode', e.target.value)} className={inputCls} placeholder="F01" />
          )}
        </Row>
        <Row label="規格 *">
          <input required value={form.spec} onChange={(e) => set('spec', e.target.value)} className={inputCls} placeholder="黑M" />
        </Row>
        <Row label="數量 *">
          <input required type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={inputCls} />
        </Row>
      </Card>
      <button type="submit" disabled={loading} className={btnCls}>
        {loading ? '登記中...' : '確認進貨'}
      </button>
    </form>
  );
}

// ─── 代購訂單管理 ─────────────────────────────────────────────────────────────

interface ProxyOrderRow {
  rowNum: number;
  date: string;
  customerName: string;
  productCode: string;
  spec: string;
  salePrice: number;
  quantity: number;
  profit: number;
  status: string;
}

const STATUS_OPTIONS = ['已到貨', '已完成', '已付款', '已取消'];
const STATUS_COLOR: Record<string, string> = {
  新訂單: 'bg-blue-50 text-blue-600',
  手動加單: 'bg-yellow-100 text-yellow-800',
  未取貨: 'bg-yellow-100 text-yellow-800',
  已到貨: 'bg-orange-100 text-orange-700',
  已完成: 'bg-blue-100 text-blue-800',
  已取貨: 'bg-blue-100 text-blue-800',
  已付款: 'bg-green-100 text-green-800',
  已取消: 'bg-gray-100 text-gray-500',
};

function OrdersManagement({
  onSuccess,
  onError,
}: {
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [orders, setOrders] = useState<ProxyOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/proxy-orders')
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (rowNum: number, status: string) => {
    setUpdating(rowNum);
    try {
      const res = await fetch('/api/admin/proxy-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNum, status }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.rowNum === rowNum ? { ...o, status } : o)));
        onSuccess('狀態已同步更新至 Google 試算表');
      } else {
        onError('Google 試算表更新失敗，請重試');
      }
    } catch {
      onError('網路錯誤，請重試');
    }
    setUpdating(null);
  };

  const customers = Array.from(
    new Set(orders.map((o) => o.customerName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-TW'));

  const filtered = selectedCustomer
    ? orders.filter((o) => o.customerName === selectedCustomer && o.status !== '已取消')
    : [];

  const totalAmount = filtered.reduce((s, o) => s + o.salePrice * o.quantity, 0);
  const totalQty = filtered.reduce((s, o) => s + o.quantity, 0);

  return (
    <div className="space-y-4">
      {/* 客人下拉 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">選擇客人</label>
        {loading ? (
          <div className={`${inputCls} text-gray-400`}>載入中...</div>
        ) : (
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className={inputCls}
          >
            <option value="">請選擇客人姓名</option>
            {customers.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 訂單總額摘要 */}
      {selectedCustomer && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-500 mb-0.5">訂單總額</p>
            <p className="text-lg font-bold text-blue-800">NT${totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-500 mb-0.5">共 {filtered.length} 筆</p>
            <p className="text-lg font-bold text-blue-800">{totalQty} 件</p>
          </div>
        </div>
      )}

      {!loading && !selectedCustomer && (
        <p className="text-sm text-gray-400 text-center py-8">請選擇客人查看訂單</p>
      )}
      {!loading && selectedCustomer && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">此客人沒有訂單紀錄</p>
      )}

      {filtered.map((o) => (
        <div key={o.rowNum} className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs text-gray-500">{o.date}</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
              {o.status}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            {o.productCode}{o.spec && ` / ${o.spec}`} × {o.quantity}
            {o.salePrice > 0 && ` — NT$${(o.salePrice * o.quantity).toLocaleString()}`}
          </p>
          <select
            value=""
            disabled={updating === o.rowNum}
            onChange={(e) => handleStatusChange(o.rowNum, e.target.value)}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${
              updating === o.rowNum ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <option value="" disabled>— 改狀態 —</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {updating === o.rowNum && (
            <p className="text-xs text-gray-400 mt-1 text-center">同步中...</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 銷售報表 ─────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'all';

type CampaignStat = { campaign: string; itemCount: number; revenue: number; confirmedRevenue: number; pendingRevenue: number; profit: number };
type ProfitReport = {
  sales: { totalAmount: number; totalCount: number; byProduct: { key: string; quantity: number; amount: number }[]; byClerk: { clerk: string; count: number; amount: number }[] };
  campaigns: CampaignStat[];
  orderRevenue: number;
  orderProfit: number;
};

function SalesReport() {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const getDateRange = (p: Period): { start?: string; end?: string } => {
    const today = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
    if (p === 'today') return { start: fmt(today), end: fmt(today) };
    if (p === 'week') {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
      return { start: fmt(mon), end: fmt(today) };
    }
    if (p === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: fmt(first), end: fmt(today) };
    }
    return {};
  };

  // 載入連線清單
  useEffect(() => {
    fetch('/api/admin/campaigns')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []));
  }, []);

  // 門市銷售：依日期；連線訂單：依選取連線（有選則忽略日期）
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const { start, end } = getDateRange(period);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (selectedCampaign) params.set('campaign', selectedCampaign);
    fetch(`/api/admin/profit-report?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, selectedCampaign]);

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: '今日' },
    { key: 'week', label: '本週' },
    { key: 'month', label: '本月' },
    { key: 'all', label: '全部' },
  ];

  return (
    <div className="space-y-5">
      {/* 日期區間（控制門市銷售） */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">門市銷售期間</p>
        <div className="flex gap-2">
          {periods.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-8">載入中...</p>}

      {data && !loading && (
        <>
          {/* ── 門市銷售紀錄 ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">門市銷售紀錄</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">門市營業額</p>
                <p className="text-xl font-bold text-gray-900">NT${data.sales.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">銷售筆數</p>
                <p className="text-xl font-bold text-gray-900">{data.sales.totalCount}</p>
              </div>
            </div>

            {data.sales.byProduct.length > 0 && (
              <Card title="商品排行">
                <div className="space-y-2">
                  {data.sales.byProduct.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <span className="flex-1 text-gray-700 truncate">{p.key}</span>
                      <span className="text-gray-500 text-xs">{p.quantity} 件</span>
                      <span className="font-medium text-gray-900 w-20 text-right">NT${p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data.sales.byClerk.length > 0 && (
              <Card title="店員銷售">
                <div className="space-y-2">
                  {data.sales.byClerk.map((c) => (
                    <div key={c.clerk} className="flex items-center text-sm gap-2">
                      <span className="flex-1 text-gray-700">{c.clerk}</span>
                      <span className="text-gray-500 text-xs">{c.count} 筆</span>
                      <span className="font-medium text-gray-900 w-20 text-right">NT${c.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ── 連線訂單毛利 ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">連線訂單毛利</h3>

            {/* 連線下拉選單 */}
            {campaigns.length > 0 && (
              <div className="mb-3">
                <select
                  value={selectedCampaign || ''}
                  onChange={(e) => setSelectedCampaign(e.target.value || null)}
                  className={inputCls}
                >
                  <option value="">全部連線（依日期）</option>
                  {campaigns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">訂單總收入</p>
                <p className="text-xl font-bold text-gray-900">NT${data.orderRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs text-gray-400 mb-1">訂單總毛利</p>
                <p className="text-xl font-bold text-green-700">NT${data.orderProfit.toLocaleString()}</p>
              </div>
            </div>

            {data.campaigns.length > 0 && (
              <Card title="各連線明細">
                <div className="space-y-4">
                  {data.campaigns.map((c) => (
                    <div key={c.campaign} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-gray-800 mb-2 truncate">{c.campaign}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>筆數：{c.itemCount} 筆</span>
                        <span>收入：<span className="font-medium text-gray-900">NT${c.revenue.toLocaleString()}</span></span>
                        <span className="text-green-600">已確認：NT${c.confirmedRevenue.toLocaleString()}</span>
                        <span className="text-yellow-600">待確認：NT${c.pendingRevenue.toLocaleString()}</span>
                        <span className="col-span-2 text-green-700 font-semibold mt-1">毛利：NT${c.profit.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data.campaigns.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                {selectedCampaign ? `${selectedCampaign} 無訂單資料` : '此區間無連線訂單'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 商品管理（批次上下架）────────────────────────────────────────────────────

interface ManagedProduct { rowNum: number; id: string; code: string; name: string; spec: string; price: number; stock: number; active: boolean; }

function ProductManagement({ onSuccess, onError }: { onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const reload = () => {
    setLoading(true);
    fetch('/api/admin/products-manage')
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const toggle = (rowNum: number) =>
    setSelected((s) => { const n = new Set(s); n.has(rowNum) ? n.delete(rowNum) : n.add(rowNum); return n; });

  const batchUpdate = async (active: boolean) => {
    if (selected.size === 0) return;
    setSaving(true);
    const res = await fetch('/api/admin/products-manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowNums: Array.from(selected), active }),
    });
    if (res.ok) {
      onSuccess(`已${active ? '上架' : '下架'} ${selected.size} 件商品`);
      setSelected(new Set());
      reload();
    } else {
      onError('更新失敗，請重試');
    }
    setSaving(false);
  };

  const visible = products.filter((p) => showInactive || p.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-blue-600" />
          顯示已下架商品
        </label>
        {selected.size > 0 && (
          <span className="text-xs text-blue-600">已選 {selected.size} 件</span>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex gap-2">
          <button onClick={() => batchUpdate(true)} disabled={saving}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? '更新中...' : '上架選取'}
          </button>
          <button onClick={() => batchUpdate(false)} disabled={saving}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? '更新中...' : '下架選取'}
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 text-center py-8">載入中...</p>}

      {visible.map((p) => (
        <label key={p.rowNum} className={`flex items-center gap-3 bg-white rounded-xl shadow-sm p-3 cursor-pointer ${selected.has(p.rowNum) ? 'ring-2 ring-blue-400' : ''}`}>
          <input type="checkbox" checked={selected.has(p.rowNum)} onChange={() => toggle(p.rowNum)} className="w-4 h-4 accent-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{p.code} {p.name}</p>
            <p className="text-xs text-gray-500">{p.spec} | NT${p.price} | 庫存 {p.stock}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {p.active ? '上架中' : '已下架'}
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── 叫貨統計（訂單明細彙總）─────────────────────────────────────────────────

interface OrderStatItem { code: string; name: string; spec: string; quantity: number; total: number; }

function OrderStats() {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [campaign, setCampaign] = useState('');
  const [items, setItems] = useState<OrderStatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = (c: string) => {
    setLoading(true);
    const params = c ? `?campaign=${encodeURIComponent(c)}` : '';
    fetch(`/api/admin/order-stats${params}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        if (campaigns.length === 0 && d.campaigns?.length) setCampaigns(d.campaigns);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmt = items.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">篩選連線</label>
        <select value={campaign} onChange={(e) => { setCampaign(e.target.value); load(e.target.value); }}
          className={inputCls}>
          <option value="">全部連線</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-8">載入中...</p>}

      {!loading && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-gray-400">總數量</p>
              <p className="text-lg font-bold">{totalQty} 件</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-gray-400">總金額</p>
              <p className="text-lg font-bold">NT${totalAmt.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">商品</th>
                  <th className="text-right px-3 py-2">數量</th>
                  <th className="text-right px-3 py-2">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{item.code}</p>
                      <p className="text-xs text-gray-400">{item.name}{item.spec ? ` / ${item.spec}` : ''}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">NT${item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">沒有資料</p>
      )}
    </div>
  );
}
