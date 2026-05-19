# HEIWEI 經銷商平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 HEIWEI 授權經銷商入口網站，整合申請表、合約制度、授權書申請、素材庫、訂購表單於同一品牌化平台

**Architecture:** 單一靜態 HTML 網站，前端依 URL token 參數切換公開層（品牌介紹+申請表）與私密層（經銷商入口）。後端為 Google Apps Script Web App，負責 token 驗證、表單處理、LINE Bot 推播。資料存 Google Sheets。

**Tech Stack:** 純 HTML / CSS / Vanilla JS、Google Apps Script、Google Sheets、LINE Messaging API、Vercel（靜態部署）

---

## 檔案結構

```
heiwei-dealer-portal/          ← 新資料夾，在 sam-agent/ 下建立
├── index.html                 ← 整個網站的唯一 HTML（公開+私密切換）
├── css/
│   └── style.css              ← 所有樣式（暖白簡約設計系統）
├── js/
│   ├── auth.js                ← token 偵測 → GAS 驗證 → 切換顯示層
│   └── portal.js              ← 私密入口互動邏輯（導覽、分區切換）
├── gas/
│   └── Code.gs                ← Google Apps Script（複製貼到 GAS 編輯器）
└── vercel.json                ← Vercel 部署設定（SPA rewrite）
```

---

## 前置資料（已確認，直接用）

| 項目 | 值 |
|---|---|
| Google Sheet ID | `1QM2YLU0uRGzxmKva9JD_L0ZkFfoSr5TkC_xBUE2Z8C0` |
| LINE Bot Token | `jt2P+BXndbz4m7WzmTEus3NhesXvqzM+CTLBYruY4zIzH8pVSo7VucdboYwETnqrcYh7G6ZXeiWtEwB9rzPmjTbWLfXr8CCeAnznC2HKCOhHsBtA9vXW+5ItApzBS/D23zKuq3nTl23YRXsl6dQRMgdB04t89/1o/w1cDnyilFU=` |
| 陳育慶 LINE User ID | `Ua2b29684b674dbf528710a842badb32a` |

## 前置準備（手動操作，開始寫程式前完成）

### P1: 沿用現有 Google Sheet，新增分頁

現有 Sheet（`1QM2YLU0uRGzxmKva9JD_L0ZkFfoSr5TkC_xBUE2Z8C0`）已有「**授權書申請**」分頁，直接沿用並新增欄位與分頁：

- [ ] 開啟 Sheet，在「授權書申請」最後**新增 2 欄**：`token`、`狀態（待確認/已確認）`
- [ ] 新增分頁 **`申請名單`**，欄位：
  `A:時間戳記 | B:姓名 | C:店名 | D:電話 | E:LINE ID | F:縣市 | G:來源管道 | H:狀態（待審/核准/婉拒）| I:備註`
- [ ] 新增分頁 **`Token 白名單`**，欄位：
  `A:token | B:姓名 | C:店名 | D:電話 | E:LINE ID | F:授權日期 | G:狀態（啟用/停用）`
- [ ] 新增分頁 **`公告`**，欄位：
  `A:日期 | B:標題 | C:內容 | D:顯示（TRUE/FALSE）`

### P2: LINE Bot ✅ 已確認

HEIWEI LINE Bot 的 Channel Access Token 和 User ID 已填入 Task 1 的 GAS 程式碼，無需額外操作。

---

## Task 1: GAS 後端

**Files:**
- Create: `gas/Code.gs`

這是整個系統的核心，先建好後端，前端才能串接。

- [ ] **Step 1: 建立 Code.gs 基本結構**

```javascript
// gas/Code.gs
// 部署為 Google Apps Script Web App（執行身份：我、存取：任何人）

const SHEET_ID = '1QM2YLU0uRGzxmKva9JD_L0ZkFfoSr5TkC_xBUE2Z8C0';
const LINE_TOKEN = 'jt2P+BXndbz4m7WzmTEus3NhesXvqzM+CTLBYruY4zIzH8pVSo7VucdboYwETnqrcYh7G6ZXeiWtEwB9rzPmjTbWLfXr8CCeAnznC2HKCOhHsBtA9vXW+5ItApzBS/D23zKuq3nTl23YRXsl6dQRMgdB04t89/1o/w1cDnyilFU=';
const OWNER_LINE_USER_ID = 'Ua2b29684b674dbf528710a842badb32a';

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  if (action === 'verify') {
    return verifyToken(token);
  }
  if (action === 'announcements') {
    return getAnnouncements();
  }
  return jsonResponse({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'apply') return handleApply(data);
  if (action === 'auth-form') return handleAuthForm(data);
  return jsonResponse({ ok: false, error: 'unknown action' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: 實作 token 驗證**

```javascript
function verifyToken(token) {
  if (!token) return jsonResponse({ ok: false, error: 'no token' });

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Token 白名單');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][6] === '啟用') {
      return jsonResponse({
        ok: true,
        name: data[i][1],
        store: data[i][2],
        phone: data[i][3]
      });
    }
  }
  return jsonResponse({ ok: false, error: 'invalid token' });
}
```

- [ ] **Step 3: 實作公告讀取**

```javascript
function getAnnouncements() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('公告');
  const data = sheet.getDataRange().getValues();
  const announcements = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === true || data[i][3] === 'TRUE') {
      announcements.push({
        date: data[i][0],
        title: data[i][1],
        body: data[i][2]
      });
    }
  }
  // 最新在前
  announcements.reverse();
  return jsonResponse({ ok: true, data: announcements });
}
```

- [ ] **Step 4: 實作申請表處理**

```javascript
function handleApply(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('申請名單');
  sheet.appendRow([
    new Date(),
    data.name,
    data.store,
    data.phone,
    data.lineId,
    data.city,
    data.source,
    '待審',
    ''
  ]);

  const msg = `📋 新經銷商申請\n\n姓名：${data.name}\n店名：${data.store || '無'}\n電話：${data.phone}\nLINE ID：${data.lineId}\n縣市：${data.city}\n來源：${data.source || '未填'}`;
  pushLineMessage(msg);

  return jsonResponse({ ok: true });
}
```

- [ ] **Step 5: 實作授權書申請處理**

```javascript
function handleAuthForm(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('授權書申請');
  sheet.appendRow([
    new Date(),
    data.token,
    data.store,
    data.owner,
    data.taxId,
    data.address,
    data.phone,
    '待確認'
  ]);

  const msg = `🖊️ 授權書申請\n\n店名：${data.store}\n負責人：${data.owner}\n統編：${data.taxId || '無'}\n地址：${data.address}\n電話：${data.phone}`;
  pushLineMessage(msg);

  return jsonResponse({ ok: true });
}
```

- [ ] **Step 6: 實作 LINE Messaging API 推播**

```javascript
function pushLineMessage(text) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: OWNER_LINE_USER_ID,
    messages: [{ type: 'text', text: text }]
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + LINE_TOKEN,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

- [ ] **Step 7: 部署 GAS Web App**
  1. 在 GAS 編輯器：執行 → 部署 → 新增部署
  2. 類型選「網頁應用程式」
  3. 執行身份：**我（你的 Google 帳號）**
  4. 具有存取權的使用者：**任何人**
  5. 複製部署後的 Web App URL（格式：`https://script.google.com/macros/s/XXXX/exec`）
  6. 記下這個 URL，後面前端要用

- [ ] **Step 8: 測試 GAS**
  在瀏覽器開啟：`YOUR_GAS_URL?action=verify&token=test`
  預期回傳：`{"ok":false,"error":"invalid token"}`

  在 Token 白名單 Sheet 手動加一列測試資料：
  `hw-test001 | 測試店 | 測試員 | 0900000000 | @test | 2026-05-19 | 啟用`
  再測：`YOUR_GAS_URL?action=verify&token=hw-test001`
  預期：`{"ok":true,"name":"測試員","store":"測試店","phone":"0900000000"}`

- [ ] **Step 9: Commit GAS 檔案**

```bash
git add gas/Code.gs
git commit -m "feat: GAS backend - token verify, apply form, LINE push"
```

---

## Task 2: 專案骨架 & CSS 設計系統

**Files:**
- Create: `heiwei-dealer-portal/index.html`
- Create: `heiwei-dealer-portal/css/style.css`
- Create: `heiwei-dealer-portal/vercel.json`

- [ ] **Step 1: 建立資料夾**

```bash
mkdir -p heiwei-dealer-portal/css heiwei-dealer-portal/js heiwei-dealer-portal/gas
```

- [ ] **Step 2: 建立 index.html 骨架**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HEIWEI 何謂美 — 授權經銷夥伴</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- 共用 Header -->
  <header class="site-header">
    <div class="header-inner">
      <div class="brand">HEIWEI <span class="dot">·</span> 何謂美</div>
      <div class="header-sub" id="header-sub">授權經銷夥伴</div>
    </div>
  </header>

  <!-- 載入中畫面 -->
  <div id="view-loading" class="view">
    <div class="loading-wrap">
      <div class="spinner"></div>
      <p>驗證中...</p>
    </div>
  </div>

  <!-- 公開層：品牌介紹 + 申請表 -->
  <div id="view-public" class="view hidden">
    <!-- Task 3 填入 -->
  </div>

  <!-- 錯誤頁：token 無效 -->
  <div id="view-error" class="view hidden">
    <!-- Task 4 填入 -->
  </div>

  <!-- 私密層：經銷商入口 -->
  <div id="view-portal" class="view hidden">
    <!-- Task 5~10 填入 -->
  </div>

  <script src="js/auth.js"></script>
  <script src="js/portal.js"></script>
</body>
</html>
```

- [ ] **Step 3: 建立 CSS 設計系統**

```css
/* css/style.css */
:root {
  --bg: #FDFCFA;
  --bg-soft: #F5F3EF;
  --dark: #1A1A1A;
  --gold: #C4A45A;
  --gold-light: #E8D5A3;
  --border: #EDE9E3;
  --text-muted: #888;
  --text-body: #444;
  --white: #fff;
  --error: #C0392B;
  --success: #27AE60;
  --radius: 6px;
  --shadow: 0 2px 12px rgba(0,0,0,0.06);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif; background: var(--bg); color: var(--dark); min-height: 100vh; }

/* Header */
.site-header { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 20px; position: sticky; top: 0; z-index: 100; }
.header-inner { display: flex; justify-content: space-between; align-items: center; max-width: 480px; margin: 0 auto; }
.brand { font-size: 11px; letter-spacing: 4px; font-weight: 700; color: var(--dark); }
.brand .dot { color: var(--gold); }
.header-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; }

/* View 切換 */
.view { max-width: 480px; margin: 0 auto; }
.hidden { display: none !important; }

/* Loading */
.loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-wrap p { font-size: 13px; color: var(--text-muted); }

/* Buttons */
.btn { display: block; width: 100%; padding: 14px; font-size: 12px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; border: none; border-radius: var(--radius); cursor: pointer; text-align: center; text-decoration: none; }
.btn-dark { background: var(--dark); color: var(--white); }
.btn-gold { background: var(--gold); color: var(--dark); }
.btn-outline { background: transparent; color: var(--dark); border: 1.5px solid var(--border); }
.btn:active { opacity: 0.85; }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--dark); margin-bottom: 6px; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 12px 14px; font-size: 14px;
  border: 1.5px solid var(--border); border-radius: var(--radius);
  background: var(--white); color: var(--dark); outline: none;
  font-family: inherit;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--gold); }
.form-group textarea { resize: vertical; min-height: 80px; }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* Cards */
.card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.card-dark { background: var(--dark); border-color: var(--dark); }

/* Section spacing */
.section { padding: 20px 16px; }
.section + .section { border-top: 1px solid var(--border); }
.section-label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 12px; }

/* Announcement item */
.ann-item { padding: 14px 0; border-bottom: 1px solid var(--bg-soft); }
.ann-item:last-child { border-bottom: none; }
.ann-date { font-size: 10px; color: var(--gold); letter-spacing: 1px; margin-bottom: 4px; }
.ann-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.ann-body { font-size: 13px; color: var(--text-body); line-height: 1.6; }

/* Alert */
.alert { padding: 12px 16px; border-radius: var(--radius); font-size: 13px; margin-bottom: 16px; }
.alert-error { background: #FEE; border: 1px solid #FCC; color: var(--error); }
.alert-success { background: #EFE; border: 1px solid #ADA; color: var(--success); }
```

- [ ] **Step 4: 建立 vercel.json**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add heiwei-dealer-portal/
git commit -m "feat: project scaffold + CSS design system"
```

---

## Task 3: 公開層 — 品牌介紹 + 申請表

**Files:**
- Modify: `heiwei-dealer-portal/index.html`（填入 `#view-public` 區塊）

- [ ] **Step 1: 填入公開層 HTML**

找到 `<!-- Task 3 填入 -->` 這行，替換為：

```html
<!-- Hero -->
<div style="background: var(--dark); padding: 40px 20px 32px; text-align: center;">
  <div style="font-size:10px;letter-spacing:4px;color:var(--gold);margin-bottom:12px;text-transform:uppercase;">Authorized Dealer Program</div>
  <h1 style="font-size:26px;font-weight:300;color:var(--white);letter-spacing:2px;line-height:1.4;margin-bottom:12px;">成為 HEIWEI<br>授權經銷夥伴</h1>
  <p style="font-size:13px;color:#666;line-height:1.7;">何謂美，源自對美的探索與堅持<br>誠邀認同品牌理念的夥伴一起成長</p>
</div>

<!-- 優勢 -->
<div class="section">
  <div class="section-label">合作優勢</div>
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div class="card" style="display:flex;gap:14px;align-items:flex-start;">
      <div style="font-size:24px;">🎁</div>
      <div>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">專屬進貨折扣</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">依合作量級享有不同折扣結構，詳情於核准後在夥伴入口查看</div>
      </div>
    </div>
    <div class="card" style="display:flex;gap:14px;align-items:flex-start;">
      <div style="font-size:24px;">🖼️</div>
      <div>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">完整素材支援</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">商品圖、品牌 Logo、活動 Banner、影片素材隨時可下載使用</div>
      </div>
    </div>
    <div class="card" style="display:flex;gap:14px;align-items:flex-start;">
      <div style="font-size:24px;">💬</div>
      <div>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">專屬 LINE 窗口</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">核准後透過官方 LINE@ 直接與品牌方溝通，快速回應</div>
      </div>
    </div>
  </div>
</div>

<!-- 申請表 -->
<div class="section">
  <div class="section-label">申請加入</div>
  <div id="apply-alert"></div>
  <form id="apply-form">
    <div class="form-group">
      <label>姓名 <span style="color:var(--error)">*</span></label>
      <input type="text" name="name" placeholder="陳小美" required>
    </div>
    <div class="form-group">
      <label>店名 / 品牌名稱</label>
      <input type="text" name="store" placeholder="美麗日記店（無實體店可留空）">
    </div>
    <div class="form-group">
      <label>聯絡電話 <span style="color:var(--error)">*</span></label>
      <input type="tel" name="phone" placeholder="0912-345-678" required>
    </div>
    <div class="form-group">
      <label>LINE ID <span style="color:var(--error)">*</span></label>
      <input type="text" name="lineId" placeholder="@heiwei 或 手機號碼" required>
    </div>
    <div class="form-group">
      <label>所在縣市 <span style="color:var(--error)">*</span></label>
      <select name="city" required>
        <option value="">請選擇</option>
        <option>台北市</option><option>新北市</option><option>桃園市</option>
        <option>台中市</option><option>台南市</option><option>高雄市</option>
        <option>基隆市</option><option>新竹市</option><option>新竹縣</option>
        <option>苗栗縣</option><option>彰化縣</option><option>南投縣</option>
        <option>雲林縣</option><option>嘉義市</option><option>嘉義縣</option>
        <option>屏東縣</option><option>宜蘭縣</option><option>花蓮縣</option>
        <option>台東縣</option><option>澎湖縣</option><option>金門縣</option>
        <option>連江縣</option>
      </select>
    </div>
    <div class="form-group">
      <label>如何得知 HEIWEI</label>
      <select name="source">
        <option value="">請選擇</option>
        <option>Instagram</option><option>Facebook</option><option>LINE</option>
        <option>Threads</option><option>朋友介紹</option><option>展覽活動</option><option>其他</option>
      </select>
    </div>
    <button type="submit" class="btn btn-dark" id="apply-btn">送出申請</button>
    <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:12px;">申請送出後，我們將在 3 個工作天內透過 LINE 與您聯繫</p>
  </form>
</div>
```

- [ ] **Step 2: 在 portal.js 加入申請表送出邏輯**

在 `js/portal.js` 建立此檔案：

```javascript
// js/portal.js
// 注意：GAS_URL 在 auth.js 定義，此檔不重複宣告

// 申請表送出
document.getElementById('apply-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('apply-btn');
  const alert = document.getElementById('apply-alert');
  const form = e.target;

  btn.textContent = '送出中...';
  btn.disabled = true;

  const data = {
    action: 'apply',
    name: form.name.value.trim(),
    store: form.store.value.trim(),
    phone: form.phone.value.trim(),
    lineId: form.lineId.value.trim(),
    city: form.city.value,
    source: form.source.value
  };

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.ok) {
      alert.innerHTML = '<div class="alert alert-success">✓ 申請已送出！我們將在 3 個工作天內透過 LINE 與您聯繫。</div>';
      form.reset();
    } else {
      throw new Error('server error');
    }
  } catch {
    alert.innerHTML = '<div class="alert alert-error">送出失敗，請稍後再試或直接聯絡 LINE@。</div>';
  } finally {
    btn.textContent = '送出申請';
    btn.disabled = false;
  }
});
```

- [ ] **Step 3: 在瀏覽器開啟 index.html 確認公開層顯示正常**（用 VS Code Live Server 或直接開檔案）
- [ ] **Step 4: 填一筆測試申請，確認 LINE 收到推播、Sheet 有記錄**
- [ ] **Step 5: Commit**

```bash
git add heiwei-dealer-portal/
git commit -m "feat: public layer - brand landing + apply form"
```

---

## Task 4: Token 驗證 & 錯誤頁

**Files:**
- Create: `heiwei-dealer-portal/js/auth.js`
- Modify: `heiwei-dealer-portal/index.html`（填入 `#view-error`）

- [ ] **Step 1: 建立 auth.js**

```javascript
// js/auth.js
const GAS_URL = 'YOUR_GAS_WEB_APP_URL'; // ← 同 portal.js

async function init() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  showView('loading');

  if (!token) {
    // 無 token → 顯示公開層
    showView('public');
    return;
  }

  // 有 token → 驗證
  try {
    const res = await fetch(`${GAS_URL}?action=verify&token=${token}`);
    const json = await res.json();

    if (json.ok) {
      // 驗證成功 → 初始化入口
      window.DEALER = { token, name: json.name, store: json.store };
      initPortal();
      showView('portal');
    } else {
      showView('error');
    }
  } catch {
    showView('error');
  }
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`)?.classList.remove('hidden');
}

init();
```

- [ ] **Step 2: 填入錯誤頁 HTML**

找到 `<!-- Task 4 填入 -->` 替換為：

```html
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;padding:32px;text-align:center;gap:16px;">
  <div style="font-size:48px;">🔒</div>
  <h2 style="font-size:20px;font-weight:700;">連結無效或已過期</h2>
  <p style="font-size:13px;color:var(--text-muted);line-height:1.7;">此連結不存在或已被停用。<br>如需協助，請聯絡 HEIWEI 官方 LINE@。</p>
  <a href="https://line.me/R/ti/p/YOUR_LINE_AT" class="btn btn-dark" style="width:auto;padding:12px 28px;">聯絡 LINE@</a>
</div>
```

> 將 `YOUR_LINE_AT` 換成 HEIWEI 官方 LINE@ 的 ID（例如 `@heiwei`）

- [ ] **Step 3: 測試**
  - 開啟 `index.html` → 應顯示公開層
  - 開啟 `index.html?token=invalid` → 應顯示錯誤頁
  - 開啟 `index.html?token=hw-test001`（Task 1 建的測試 token）→ 應顯示「驗證中...」後進入入口（入口還未做，這步驟先確認不報錯）

- [ ] **Step 4: Commit**

```bash
git add heiwei-dealer-portal/js/auth.js heiwei-dealer-portal/index.html
git commit -m "feat: token auth + error page"
```

---

## Task 5: 私密入口 — 首頁（Hero + 公告摘要 + 卡片導覽）

**Files:**
- Modify: `heiwei-dealer-portal/index.html`（填入 `#view-portal`）
- Modify: `heiwei-dealer-portal/js/portal.js`（加入 `initPortal`）

- [ ] **Step 1: 填入入口主結構 HTML**

找到 `<!-- Task 5~10 填入 -->` 替換為：

```html
<!-- 入口 Hero -->
<div id="portal-hero" style="background:var(--dark);padding:24px 20px;">
  <div style="font-size:10px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Welcome</div>
  <div id="portal-name" style="font-size:20px;font-weight:700;color:var(--white);margin-bottom:4px;"></div>
  <div style="font-size:11px;color:var(--gold);letter-spacing:1px;">✓ 授權合作中</div>
</div>

<!-- 最新公告摘要 -->
<div class="section">
  <div class="section-label">最新公告</div>
  <div id="ann-summary"></div>
  <button class="btn btn-outline" style="margin-top:12px;font-size:11px;" onclick="showSection('announcements')">查看全部公告</button>
</div>

<!-- 功能卡片 -->
<div class="section">
  <div class="section-label">功能選單</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
    <div class="card" style="cursor:pointer;text-align:center;" onclick="showSection('contracts')">
      <div style="font-size:28px;margin-bottom:8px;">📄</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;">制度 & 合約</div>
      <div style="font-size:11px;color:var(--text-muted);">折扣、規範、PDF</div>
    </div>
    <div class="card" style="cursor:pointer;text-align:center;" onclick="showSection('auth-form')">
      <div style="font-size:28px;margin-bottom:8px;">🖊️</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;">授權書申請</div>
      <div style="font-size:11px;color:var(--text-muted);">填表送出等待確認</div>
    </div>
    <div class="card card-dark" style="cursor:pointer;text-align:center;" onclick="showSection('materials')">
      <div style="font-size:28px;margin-bottom:8px;">🖼️</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;color:var(--gold);">素材庫</div>
      <div style="font-size:11px;color:#555;">商品圖、Logo、Banner</div>
    </div>
    <div class="card" style="cursor:pointer;text-align:center;" onclick="showSection('order')">
      <div style="font-size:28px;margin-bottom:8px;">📦</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;">訂購出貨</div>
      <div style="font-size:11px;color:var(--text-muted);">填寫訂購表單</div>
    </div>
    <div class="card" style="cursor:pointer;text-align:center;grid-column:span 2;" onclick="openLine()">
      <div style="font-size:28px;margin-bottom:8px;">💬</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;">聯絡 HEIWEI</div>
      <div style="font-size:11px;color:var(--text-muted);">開啟官方 LINE@ 直接對話</div>
    </div>
  </div>
</div>

<!-- 各功能子頁（預設隱藏） -->
<div id="section-announcements" class="hidden"></div>
<div id="section-contracts" class="hidden"></div>
<div id="section-auth-form" class="hidden"></div>
<div id="section-materials" class="hidden"></div>
<div id="section-order" class="hidden"></div>
```

- [ ] **Step 2: 在 portal.js 加入 initPortal 與導覽邏輯**

在 `portal.js` 最下方加入：

```javascript
// GAS_URL 已在 auth.js 定義，此處直接使用
const LINE_AT_URL = 'https://line.me/R/ti/p/YOUR_LINE_AT'; // ← 換成 HEIWEI LINE@ 連結

function initPortal() {
  // 顯示名稱
  document.getElementById('portal-name').textContent =
    window.DEALER.store || window.DEALER.name;

  // 載入公告摘要
  loadAnnouncements(2);
}

async function loadAnnouncements(limit) {
  const container = document.getElementById('ann-summary');
  container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">載入中...</p>';
  try {
    const res = await fetch(`${GAS_URL}?action=announcements`);
    const json = await res.json();
    const items = (json.data || []).slice(0, limit);
    if (items.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">目前無公告</p>';
      return;
    }
    container.innerHTML = items.map(a => `
      <div class="ann-item">
        <div class="ann-date">${a.date}</div>
        <div class="ann-title">${a.title}</div>
        <div class="ann-body">${a.body}</div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">公告載入失敗</p>';
  }
}

const PORTAL_HOME = document.getElementById('portal-hero')?.parentElement;

function showSection(name) {
  // 隱藏首頁的 hero + 卡片
  document.getElementById('portal-hero').classList.add('hidden');
  document.querySelectorAll('#view-portal > .section').forEach(s => s.classList.add('hidden'));
  // 顯示目標子頁
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${name}`)?.classList.remove('hidden');
}

function showPortalHome() {
  document.getElementById('portal-hero').classList.remove('hidden');
  document.querySelectorAll('#view-portal > .section').forEach(s => s.classList.remove('hidden'));
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
}

function openLine() {
  window.open(LINE_AT_URL, '_blank');
}
```

- [ ] **Step 3: 在 Google Sheet 公告 tab 加兩筆測試公告，確認首頁摘要正常顯示**
- [ ] **Step 4: Commit**

```bash
git add heiwei-dealer-portal/
git commit -m "feat: portal homepage - hero, announcement summary, card nav"
```

---

## Task 6: 私密入口 — 公告全頁 & 制度合約

**Files:**
- Modify: `heiwei-dealer-portal/js/portal.js`

- [ ] **Step 1: 在 portal.js 加入公告全頁**

```javascript
function renderAnnouncements() {
  const el = document.getElementById('section-announcements');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="showPortalHome()" style="background:none;border:none;font-size:20px;cursor:pointer;">←</button>
        <div class="section-label" style="margin:0;">所有公告</div>
      </div>
      <div id="ann-full">載入中...</div>
    </div>
  `;
  loadAllAnnouncements();
}

async function loadAllAnnouncements() {
  const container = document.getElementById('ann-full');
  try {
    const res = await fetch(`${GAS_URL}?action=announcements`);
    const json = await res.json();
    const items = json.data || [];
    if (items.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">目前無公告</p>';
      return;
    }
    container.innerHTML = items.map(a => `
      <div class="ann-item">
        <div class="ann-date">${a.date}</div>
        <div class="ann-title">${a.title}</div>
        <div class="ann-body">${a.body}</div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">載入失敗</p>';
  }
}
```

- [ ] **Step 2: 加入制度合約頁（靜態內容 + PDF 下載）**

```javascript
function renderContracts() {
  const el = document.getElementById('section-contracts');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="showPortalHome()" style="background:none;border:none;font-size:20px;cursor:pointer;">←</button>
        <div class="section-label" style="margin:0;">制度 & 合約</div>
      </div>

      <div class="section-label">折扣結構</div>
      <div class="card" style="margin-bottom:16px;">
        <p style="font-size:13px;color:var(--text-body);line-height:1.8;">
          ▸ 基本經銷：進貨折 <strong>7 折</strong><br>
          ▸ 優質夥伴（月進貨 $30,000+）：<strong>65 折</strong><br>
          ▸ 金牌夥伴（月進貨 $60,000+）：<strong>6 折</strong><br>
          <span style="font-size:11px;color:var(--text-muted);">※ 折扣依實際合約為準，如有疑問請聯絡窗口</span>
        </p>
      </div>

      <div class="section-label">合作規範</div>
      <div class="card" style="margin-bottom:16px;">
        <p style="font-size:13px;color:var(--text-body);line-height:1.8;">
          ▸ 禁止低於官方售價銷售<br>
          ▸ 素材使用需保留 HEIWEI 品牌標示<br>
          ▸ 不得私自代工或仿製產品<br>
          ▸ 每季至少達最低進貨量（依合約）
        </p>
      </div>

      <div class="section-label">文件下載</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="YOUR_CONTRACT_PDF_URL" target="_blank" class="card" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;">
          <div style="font-size:28px;">📄</div>
          <div>
            <div style="font-size:13px;font-weight:700;">合作合約書</div>
            <div style="font-size:11px;color:var(--text-muted);">PDF 下載</div>
          </div>
          <div style="margin-left:auto;font-size:18px;">↓</div>
        </a>
        <a href="YOUR_AUTH_TEMPLATE_PDF_URL" target="_blank" class="card" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;">
          <div style="font-size:28px;">🖊️</div>
          <div>
            <div style="font-size:13px;font-weight:700;">授權書範本</div>
            <div style="font-size:11px;color:var(--text-muted);">PDF 下載（供參考）</div>
          </div>
          <div style="margin-left:auto;font-size:18px;">↓</div>
        </a>
      </div>
    </div>
  `;
}
```

> `YOUR_CONTRACT_PDF_URL` 和 `YOUR_AUTH_TEMPLATE_PDF_URL` 換成你 Google Drive 的 PDF 分享連結

- [ ] **Step 3: 在 showSection 加入 render 呼叫**

在 `showSection` function 結尾加：

```javascript
if (name === 'announcements') renderAnnouncements();
if (name === 'contracts') renderContracts();
```

- [ ] **Step 4: Commit**

```bash
git add heiwei-dealer-portal/js/portal.js
git commit -m "feat: portal - announcements full page + contracts section"
```

---

## Task 7: 私密入口 — 授權書申請表

**Files:**
- Modify: `heiwei-dealer-portal/js/portal.js`

- [ ] **Step 1: 加入授權書申請頁**

```javascript
function renderAuthForm() {
  const el = document.getElementById('section-auth-form');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="showPortalHome()" style="background:none;border:none;font-size:20px;cursor:pointer;">←</button>
        <div class="section-label" style="margin:0;">授權書申請</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:20px;">填寫以下資料，送出後我們將在確認後核發授權書。</p>
      <div id="auth-alert"></div>
      <form id="auth-form">
        <div class="form-group">
          <label>店名 / 品牌名稱 <span style="color:var(--error)">*</span></label>
          <input type="text" name="store" placeholder="美麗日記店" required>
        </div>
        <div class="form-group">
          <label>負責人姓名 <span style="color:var(--error)">*</span></label>
          <input type="text" name="owner" placeholder="陳小美" required>
        </div>
        <div class="form-group">
          <label>統一編號（無則留空）</label>
          <input type="text" name="taxId" placeholder="12345678">
        </div>
        <div class="form-group">
          <label>店面地址 <span style="color:var(--error)">*</span></label>
          <input type="text" name="address" placeholder="高雄市仁武區○○路○○號" required>
        </div>
        <div class="form-group">
          <label>聯絡電話 <span style="color:var(--error)">*</span></label>
          <input type="tel" name="phone" placeholder="0912-345-678" required>
        </div>
        <button type="submit" class="btn btn-dark" id="auth-btn">送出授權書申請</button>
      </form>
    </div>
  `;

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('auth-btn');
    const alert = document.getElementById('auth-alert');
    const form = e.target;

    btn.textContent = '送出中...';
    btn.disabled = true;

    const data = {
      action: 'auth-form',
      token: window.DEALER.token,
      store: form.store.value.trim(),
      owner: form.owner.value.trim(),
      taxId: form.taxId.value.trim(),
      address: form.address.value.trim(),
      phone: form.phone.value.trim()
    };

    try {
      const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
      const json = await res.json();
      if (json.ok) {
        alert.innerHTML = '<div class="alert alert-success">✓ 申請已送出！確認後我們將透過 LINE 通知您。</div>';
        form.reset();
      } else throw new Error();
    } catch {
      alert.innerHTML = '<div class="alert alert-error">送出失敗，請稍後再試。</div>';
    } finally {
      btn.textContent = '送出授權書申請';
      btn.disabled = false;
    }
  });
}
```

- [ ] **Step 2: 在 showSection 加入 render 呼叫**

```javascript
if (name === 'auth-form') renderAuthForm();
```

- [ ] **Step 3: 測試：填授權書申請，確認 LINE 收到推播，Sheet 有記錄**
- [ ] **Step 4: Commit**

```bash
git add heiwei-dealer-portal/js/portal.js
git commit -m "feat: portal - auth application form"
```

---

## Task 8: 私密入口 — 素材庫 & 訂購表單

**Files:**
- Modify: `heiwei-dealer-portal/js/portal.js`

- [ ] **Step 1: 加入素材庫頁（Google Drive 嵌入）**

```javascript
function renderMaterials() {
  const DRIVE_FOLDER_URL = 'YOUR_GOOGLE_DRIVE_FOLDER_SHARE_URL'; // ← 換成你的 Drive 資料夾連結
  const el = document.getElementById('section-materials');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="showPortalHome()" style="background:none;border:none;font-size:20px;cursor:pointer;">←</button>
        <div class="section-label" style="margin:0;">素材庫</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:16px;">以下為最新品牌素材，點擊連結在 Google Drive 中預覽或下載。</p>
      <a href="${DRIVE_FOLDER_URL}" target="_blank" class="btn btn-gold" style="margin-bottom:16px;">
        開啟 Google Drive 素材資料夾 ↗
      </a>
      <div class="card">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.8;">
          <strong style="color:var(--dark);">資料夾包含：</strong><br>
          📸 商品圖（去背版、情境版）<br>
          🏷️ 品牌 Logo（各尺寸、各底色）<br>
          🎨 活動 Banner<br>
          🎬 品牌影片素材
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: 加入訂購出貨頁（Tally iframe）**

```javascript
function renderOrder() {
  const TALLY_URL = 'https://tally.so/r/xXPxOd';
  const el = document.getElementById('section-order');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="showPortalHome()" style="background:none;border:none;font-size:20px;cursor:pointer;">←</button>
        <div class="section-label" style="margin:0;">訂購出貨</div>
      </div>
    </div>
    <iframe
      src="${TALLY_URL}"
      style="width:100%;height:80vh;border:none;"
      title="訂購表單"
    ></iframe>
  `;
}
```

- [ ] **Step 3: 在 showSection 加入 render 呼叫**

```javascript
if (name === 'materials') renderMaterials();
if (name === 'order') renderOrder();
```

- [ ] **Step 4: 確認素材連結可正常開啟、Tally 表單可在 iframe 內正常顯示**
- [ ] **Step 5: Commit**

```bash
git add heiwei-dealer-portal/js/portal.js
git commit -m "feat: portal - materials library + order form"
```

---

## Task 9: Vercel 部署

**Files:**
- `vercel.json`（Task 2 已建立）

- [ ] **Step 1: 確認 GAS_URL 和 LINE_AT_URL 已在 auth.js / portal.js 填入正確值**（搜尋所有 `YOUR_` 字串確認都替換完）

```bash
grep -r "YOUR_" heiwei-dealer-portal/
```

預期：無任何輸出（所有佔位符都已替換）

- [ ] **Step 2: 在 GitHub 建立新 Repo 或 push 到現有 repo**

```bash
cd heiwei-dealer-portal
git init
git add .
git commit -m "feat: initial HEIWEI dealer portal"
git branch -M main
git remote add origin https://github.com/sam813019-ai/heiwei-dealer-portal.git
git push -u origin main
```

- [ ] **Step 3: 連結 Vercel**
  1. 前往 [vercel.com](https://vercel.com) → Add New Project
  2. 選擇剛剛的 GitHub repo
  3. Framework Preset 選 **Other**
  4. Root Directory 留空（或選 `heiwei-dealer-portal/`）
  5. 點 Deploy

- [ ] **Step 4: 驗收**
  - 開啟 Vercel 給的 URL → 應看到公開層（品牌介紹 + 申請表）
  - 開啟 `URL?token=hw-test001` → 應進入經銷商入口
  - 開啟 `URL?token=badtoken` → 應看到錯誤頁

- [ ] **Step 5: 設定自訂網域（選做）**
  - 在 Vercel 專案設定 → Domains → 加入你的自訂網域（例如 `dealer.heiwei.com.tw`）

---

## Task 10: 產生第一批 Token

- [ ] **Step 1: 在 GAS 加入 Token 產生工具函式**

在 `Code.gs` 加入（僅在 GAS 手動執行，不是 API）：

```javascript
function generateToken(name, store, phone, lineId) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'hw-';
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Token 白名單');
  sheet.appendRow([token, name, store, phone, lineId, new Date(), '啟用']);

  Logger.log(`Token 產生完成：${token}`);
  Logger.log(`連結：https://YOUR_VERCEL_URL/?token=${token}`);
  return token;
}
```

- [ ] **Step 2: 在 GAS 編輯器執行 `generateToken`，輸入第一位真實經銷商資料**
  - 執行後在 Logs 看到 token 和完整連結
  - 把連結用 LINE 發給該經銷商

---

## 完成驗收清單

- [ ] 公開層申請表可送出，GAS Sheet 有記錄，LINE 收到推播
- [ ] 有效 token URL 可進入入口，顯示正確店名
- [ ] 無效 token 顯示錯誤頁
- [ ] 公告從 Sheet 讀取，首頁顯示最新兩則
- [ ] 制度合約頁折扣、規範、PDF 連結正確
- [ ] 授權書申請可送出，LINE 收到推播
- [ ] 素材庫連結正常開啟
- [ ] 訂購表單 iframe 正常顯示
- [ ] Vercel 部署成功，手機瀏覽正常
