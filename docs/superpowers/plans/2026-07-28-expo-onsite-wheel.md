# 現場即抽即中轉盤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在現有 `heiwei-expo-wheel` 專案新增一個無需認證、轉到即給、不核銷的現場版轉盤 `/onsite`，共用現有獎項設定與限量庫存，並把每次中獎寫入「現場中獎紀錄」分頁。

**Architecture:** 新增前端頁 `public/onsite.html`（純網頁，無 LINE SDK/Email）與後端 `api/onsite-draw.js`（無身分抽獎），共用現有 `lib/prize-config.js`（`getPrizeConfig`）與 `lib/store.js`（`takeStock`）。在 `lib/sheets.js` 加一個 `logOnsiteDraw`。LINE 轉盤既有檔案全部不動。

**Tech Stack:** Vercel Serverless Functions（Node.js，ES modules）、@vercel/kv（Upstash Redis）、googleapis、原生 SVG 前端。專案無測試框架，驗證以「Node 直接 import 函式」＋「curl 打端點」＋「瀏覽器實測」進行（沿用本專案宅配功能的驗證方式）。

## Global Constraints

- 專案根目錄：`/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/`（非 git repo，用 `vercel deploy --prod --yes` 部署）。
- ES modules（`import`/`export`），檔案風格、命名、註解語氣沿用現有檔案（繁體中文註解）。
- **不得修改** `api/draw.js`、`lib/prize-config.js`、`lib/store.js`、`lib/line.js`、`api/prizes.js`、`public/index.html`、`public/staff.html`、`public/delivery.html`。
- 現場版**不驗身分、不發兌換碼、不寫 `draw:<userId>`、不推播 LINE、不做每人限抽**。
- 限量與獎項設定**完全共用** LINE 版：抽獎走 `getPrizeConfig()`，扣庫存走 `takeStock(prize.id, prize.dailyCap)`（同 `stock:<日>:<id>` key）。
- 台北時區時間戳一律 `Asia/Taipei`。
- 環境變數沿用現有：`EXPO_SHEET_ID`、`GOOGLE_SERVICE_ACCOUNT_EMAIL`、`GOOGLE_PRIVATE_KEY`、`KV_REST_API_URL`、`KV_REST_API_TOKEN`。

---

### Task 1: `logOnsiteDraw` — 寫入「現場中獎紀錄」分頁

**Files:**
- Modify: `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/lib/sheets.js`（在檔尾新增一個 export，不動既有函式）
- Test: `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/_test_onsite_sheets.mjs`（臨時驗證腳本，驗完刪除）

**前置：** 先在 `EXPO_SHEET_ID` 那份 Google 表格手動建立分頁「現場中獎紀錄」，第一列表頭 `A1=中獎時間`、`B1=獎項`。（append 到不存在的分頁會失敗。）

**Interfaces:**
- Consumes: 既有 `getClient()`、`nowTPE()`（同檔案內私有函式，已存在）。
- Produces: `export async function logOnsiteDraw({ prizeFull }): Promise<void>` — 追加一列 `[nowTPE(), prizeFull]` 到 `現場中獎紀錄!A:B`；失敗只 `console.error` 不 throw。

- [ ] **Step 1: 寫失敗驗證腳本**

Create `_test_onsite_sheets.mjs`：
```js
import 'dotenv/config';
import { logOnsiteDraw } from './lib/sheets.js';
await logOnsiteDraw({ prizeFull: '測試獎項_請刪除' });
console.log('logOnsiteDraw returned OK');
```

- [ ] **Step 2: 執行確認會失敗（函式尚未定義）**

Run: `cd "/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel" && node --env-file=.env.local _test_onsite_sheets.mjs`
Expected: FAIL，錯誤訊息類似 `does not provide an export named 'logOnsiteDraw'`。

- [ ] **Step 3: 在 `lib/sheets.js` 檔尾新增函式**

```js
// 現場即抽即中：只記「時間 + 獎項」，不存任何個資。分頁「現場中獎紀錄」欄位 A中獎時間 B獎項
export async function logOnsiteDraw({ prizeFull }) {
  if (!SHEET_ID) return;
  try {
    const sheets = getClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `現場中獎紀錄!A:B`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[nowTPE(), prizeFull]] },
    });
  } catch (e) {
    console.error('logOnsiteDraw 失敗:', e.message);
  }
}
```

- [ ] **Step 4: 執行確認通過並檢查表格**

Run: `cd "/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel" && node --env-file=.env.local _test_onsite_sheets.mjs`
Expected: 印出 `logOnsiteDraw returned OK`，且「現場中獎紀錄」分頁多一列（時間 + 測試獎項_請刪除）。手動刪掉那列測試資料。

- [ ] **Step 5: 刪除臨時腳本**

Run: `cd "/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel" && rm _test_onsite_sheets.mjs`

---

### Task 2: `api/onsite-draw.js` — 無認證抽獎端點

**Files:**
- Create: `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/api/onsite-draw.js`
- Test: 用 `vercel dev` 或部署後 curl 驗證（見步驟）

**Interfaces:**
- Consumes: `getPrizeConfig()`（`lib/prize-config.js`，回傳 `{ prizes:[{id,full,label,weight,dailyCap,redeem,color,text}], fallbackId }`）、`takeStock(prizeId, cap)`（`lib/store.js`，回傳 boolean）、`logOnsiteDraw({prizeFull})`（Task 1）。
- Produces: `POST /api/onsite-draw`，body 可空，回傳 `200 { prizeId, prizeFull, label }`；失敗回 `400/500 { error }`。

- [ ] **Step 1: 建立端點檔案**

```js
// POST /api/onsite-draw  — 現場即抽即中，無需任何身分。
// 回傳：{ prizeId, prizeFull, label }
// 與 LINE 版共用「獎品設定」與限量庫存；不發兌換碼、不核銷、不記個資、不限每人次數。

import { getPrizeConfig } from '../lib/prize-config.js';
import { takeStock } from '../lib/store.js';
import { logOnsiteDraw } from '../lib/sheets.js';

function pickPrize(prizes) {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of prizes) { if ((r -= p.weight) < 0) return p; }
  return prizes[prizes.length - 1];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const { prizes, fallbackId } = await getPrizeConfig();
    let prize = pickPrize(prizes);
    const got = await takeStock(prize.id, prize.dailyCap);
    if (!got) prize = prizes.find((p) => p.id === fallbackId) || prize;

    await logOnsiteDraw({ prizeFull: prize.full });

    res.status(200).json({ prizeId: prize.id, prizeFull: prize.full, label: prize.label });
  } catch (e) {
    res.status(400).json({ error: e.message || '抽獎失敗' });
  }
}
```

- [ ] **Step 2: 本機起 dev server**

Run: `cd "/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel" && vercel dev --listen 3000`（背景執行；若無法本機起則跳過，改用 Task 4 部署後驗證）
Expected: server 起在 `http://localhost:3000`。

- [ ] **Step 3: 打端點驗證正常回傳**

Run: `curl -s -X POST http://localhost:3000/api/onsite-draw -H 'Content-Type: application/json' -d '{}'`
Expected: 回 JSON 含 `prizeId`、`prizeFull`、`label` 三個欄位（例如 `{"prizeId":"cash50","prizeFull":"50元折價券","label":"50元券"}`）。

- [ ] **Step 4: 驗證 GET 被擋**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/onsite-draw`
Expected: `405`。

- [ ] **Step 5: 驗證限量發完轉保底（暫時設定驗證）**

在「獎品設定」分頁把某一個非保底獎的「每日限量」暫時改成 `0`、等 60 秒快取過期，連打 `/api/onsite-draw` 數次，確認**不會**回傳那個獎（發完自動略過改保底）。驗證後把限量改回原值。
Run: `for i in $(seq 1 10); do curl -s -X POST http://localhost:3000/api/onsite-draw -H 'Content-Type: application/json' -d '{}' | grep -o '"prizeId":"[^"]*"'; done`
Expected: 回傳結果中不含被設為 0 的那個 prizeId。

- [ ] **Step 6: Commit**（本專案非 git repo，跳過 git；改為記錄「Task 2 完成」於 `部署資訊.md`。若專案已是 git repo 則 `git add api/onsite-draw.js && git commit -m "feat: 現場即抽即中抽獎端點"`）

---

### Task 3: `public/onsite.html` — 現場轉盤頁

**Files:**
- Create: `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/public/onsite.html`

**Interfaces:**
- Consumes: `GET /api/prizes`（畫盤用，回傳陣列 `[{id,label,color,text,full,weight}]`）、`POST /api/onsite-draw`（Task 2，回傳 `{prizeId,prizeFull,label}`）。
- Produces: 網頁 `/onsite`，現場觸控用。

- [ ] **Step 1: 建立頁面（沿用 index.html 的盤面繪製與轉動公式，移除 LINE/Email，改極簡結果 + 再抽一次）**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>HEIWEI 美容展・現場幸運轉盤</title>
<style>
  :root{
    --gray:#97999B;--gray-deep:#6E7072;--gray-soft:#C9CACB;
    --leaf:#8C9A8E;--leaf-deep:#6E7C70;--ink:#3C3D3E;
    --paper:#F4F2EE;--paper-2:#EAE7E1;--line:#DAD7D1;
    --serif:"Noto Serif CJK TC","Noto Serif TC",serif;
    --sans:"Noto Sans CJK TC","Noto Sans TC",sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body{height:100%}
  body{font-family:var(--sans);color:var(--ink);display:flex;justify-content:center;min-height:100vh;
    background:radial-gradient(120% 80% at 50% -10%, #FBFAF7 0%, var(--paper) 55%, var(--paper-2) 100%);}
  .app{width:100%;max-width:440px;padding:34px 24px 44px;display:flex;flex-direction:column;align-items:center}
  .brand{font-family:var(--serif);letter-spacing:.32em;font-size:15px;color:var(--gray-deep);margin-left:.32em}
  .eyebrow{font-size:12px;letter-spacing:.22em;color:var(--leaf-deep);margin-top:14px}
  h1{font-family:var(--serif);font-size:30px;font-weight:600;margin-top:8px;letter-spacing:.04em;text-align:center;line-height:1.35}
  .sub{font-size:14px;color:var(--gray-deep);margin-top:10px;text-align:center;line-height:1.7}
  .rule{width:34px;height:1px;background:var(--leaf);margin:16px 0 2px;opacity:.6}
  .stage{position:relative;width:340px;height:340px;margin:26px 0 8px;display:flex;align-items:center;justify-content:center}
  .pointer{position:absolute;top:-4px;left:50%;transform:translateX(-50%);z-index:5;width:0;height:0;
    border-left:14px solid transparent;border-right:14px solid transparent;border-top:24px solid var(--ink);
    filter:drop-shadow(0 2px 3px rgba(0,0,0,.25));}
  .pointer::after{content:"";position:absolute;top:-32px;left:-6px;width:12px;height:12px;border-radius:50%;background:var(--ink)}
  .wheel-wrap{width:340px;height:340px;border-radius:50%;padding:8px;background:#fff;
    box-shadow:0 10px 30px -12px rgba(60,61,62,.35), inset 0 0 0 1px var(--line);}
  svg{display:block;border-radius:50%;transition:transform 5s cubic-bezier(.16,.84,.29,1)}
  .hub{position:absolute;width:66px;height:66px;border-radius:50%;background:#fff;z-index:4;
    box-shadow:0 3px 10px rgba(60,61,62,.25), inset 0 0 0 1px var(--line);
    display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:16px;color:var(--gray-deep);letter-spacing:.06em;}
  .spin{margin-top:22px;width:100%;padding:20px;border:none;border-radius:16px;background:var(--ink);color:#fff;
    font-family:var(--sans);font-size:19px;font-weight:600;letter-spacing:.18em;cursor:pointer;transition:transform .1s,background .2s,opacity .2s;}
  .spin:active{transform:scale(.985)}
  .spin:disabled{background:var(--gray-soft);cursor:default;opacity:.85}
  .hint{font-size:13px;color:var(--gray-deep);margin-top:14px;text-align:center;letter-spacing:.03em;min-height:18px}
  .foot{margin-top:30px;font-size:11px;color:var(--gray-soft);letter-spacing:.16em;text-align:center}
  .overlay{position:fixed;inset:0;background:rgba(60,61,62,.45);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:24px;z-index:20}
  .overlay.show{display:flex;animation:fade .3s ease}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  .card{width:100%;max-width:380px;background:var(--paper);border-radius:20px;overflow:hidden;
    box-shadow:0 24px 60px -20px rgba(0,0,0,.45);transform:translateY(8px);animation:rise .35s cubic-bezier(.2,.8,.3,1) forwards}
  @keyframes rise{to{transform:translateY(0)}}
  .card-top{background:var(--leaf-deep);color:#fff;padding:30px 26px;text-align:center}
  .win-label{font-size:13px;letter-spacing:.3em;opacity:.85}
  .prize{font-family:var(--serif);font-size:34px;font-weight:600;margin-top:12px;letter-spacing:.03em;line-height:1.35}
  .card-body{padding:26px 26px 28px;text-align:center}
  .give-note{font-size:14px;color:var(--gray-deep);letter-spacing:.04em;line-height:1.7}
  .again{margin-top:22px;width:100%;padding:18px;border:none;border-radius:14px;background:var(--ink);color:#fff;
    font-family:var(--sans);font-size:17px;font-weight:600;letter-spacing:.14em;cursor:pointer}
</style>
</head>
<body>
<div class="app">
  <div class="brand">HEIWEI ・ 何 謂 美</div>
  <div class="eyebrow">2026 台北美容展 ・ 8/14–8/17</div>
  <h1>現場幸運轉盤</h1>
  <div class="sub">消費即可轉一次<br>轉到什麼，現場立即致贈</div>
  <div class="rule"></div>

  <div class="stage">
    <div class="pointer"></div>
    <div class="wheel-wrap"><svg id="wheel" viewBox="0 0 320 320" width="324" height="324"></svg></div>
    <div class="hub">開轉</div>
  </div>

  <button class="spin" id="spinBtn" disabled>轉 動 幸 運 盤</button>
  <div class="hint" id="hint">載入中…</div>
  <div class="foot">HEIWEI ・ 夏 日 防 曬</div>
</div>

<div class="overlay" id="overlay">
  <div class="card">
    <div class="card-top">
      <div class="win-label">恭 喜 中 獎</div>
      <div class="prize" id="rPrize"></div>
    </div>
    <div class="card-body">
      <div class="give-note">請將此獎項現場致贈給客人</div>
      <button class="again" id="againBtn">下 一 位 ・ 再 抽 一 次</button>
    </div>
  </div>
</div>

<script>
/* 現場版：無 LINE、無 Email、無兌換碼。畫盤來源 /api/prizes，抽獎打 /api/onsite-draw。 */
const DEFAULT_DISPLAY = [
  { id:'cash50', label:'50元券', color:'#7E8A80', text:'#fff', weight:1, full:'50元折價券' },
];
let DISPLAY = DEFAULT_DISPLAY;

const svg=document.getElementById('wheel');
const R=160,CX=160,CY=160,NS='http://www.w3.org/2000/svg';
let N=DISPLAY.length,SEG=360/N;
const polar=(cx,cy,r,deg)=>{const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};
function buildWheel(){
  N=DISPLAY.length; SEG=360/N; svg.innerHTML='';
  DISPLAY.forEach((p,i)=>{
    const s=i*SEG-SEG/2,e=i*SEG+SEG/2,[x1,y1]=polar(CX,CY,R,s),[x2,y2]=polar(CX,CY,R,e);
    const path=document.createElementNS(NS,'path');
    path.setAttribute('d',`M${CX},${CY} L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z`);
    path.setAttribute('fill',p.color);path.setAttribute('stroke','#fff');path.setAttribute('stroke-width','1.5');
    svg.appendChild(path);
    const [tx,ty]=polar(CX,CY,R*0.62,i*SEG),lines=String(p.label||'').split('\n');
    const t=document.createElementNS(NS,'text');
    t.setAttribute('x',tx);t.setAttribute('y',ty);t.setAttribute('fill',p.text);
    t.setAttribute('font-size','13');t.setAttribute('font-weight','600');
    t.setAttribute('font-family','"Noto Sans CJK TC","Noto Sans TC",sans-serif');
    t.setAttribute('text-anchor','middle');t.setAttribute('transform',`rotate(${i*SEG} ${tx} ${ty})`);
    lines.forEach((ln,k)=>{const ts=document.createElementNS(NS,'tspan');
      ts.setAttribute('x',tx);ts.setAttribute('dy',k===0?(lines.length>1?'-2':'4'):'15');ts.textContent=ln;t.appendChild(ts);});
    svg.appendChild(t);
  });
}

const btn=document.getElementById('spinBtn'),hint=document.getElementById('hint');
let rot=0,busy=false;

async function loadPrizes(){
  try{
    const res=await fetch('/api/prizes');
    if(res.ok){ const data=await res.json(); if(Array.isArray(data)&&data.length) DISPLAY=data; }
  }catch(e){ /* 失敗用內建預設 */ }
  buildWheel();
}
async function boot(){
  await loadPrizes();
  btn.disabled=false;
  hint.textContent='點下方按鈕開始';
}
boot();

btn.addEventListener('click',async()=>{
  if(busy) return;
  busy=true; btn.disabled=true; btn.textContent='轉動中…'; hint.textContent='';
  try{
    const res=await fetch('/api/onsite-draw',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'抽獎失敗');
    spinTo(data.prizeId,()=>showResult(data));
  }catch(e){
    hint.textContent=e.message||'抽獎失敗，請再試一次';
    btn.textContent='轉 動 幸 運 盤'; btn.disabled=false; busy=false;
  }
});

function spinTo(prizeId,done){
  const idx=Math.max(0,DISPLAY.findIndex(d=>d.id===prizeId));
  const jitter=(Math.random()-0.5)*(SEG*0.55);
  rot+=360*6 - idx*SEG + jitter;
  svg.style.transform=`rotate(${rot}deg)`;
  setTimeout(done,5100);
}

function showResult(r){
  document.getElementById('rPrize').textContent=r.prizeFull;
  document.getElementById('overlay').classList.add('show');
}
document.getElementById('againBtn').addEventListener('click',()=>{
  document.getElementById('overlay').classList.remove('show');
  busy=false; btn.disabled=false; btn.textContent='轉 動 幸 運 盤'; hint.textContent='點下方按鈕開始';
});
</script>
</body>
</html>
```

- [ ] **Step 2: 本機開頁目視檢查**

在瀏覽器開 `http://localhost:3000/onsite`（`vercel dev` 執行中）。
Expected: 轉盤以真實獎項畫出來（來自 /api/prizes）、按鈕可點、點下去會轉 5 秒、跳出大字獎項卡、點「下一位」回到待轉可再轉。

- [ ] **Step 3: 驗證指針對齊**

連轉 3～5 次，每次確認指針停下時「大字卡顯示的獎項」與「指針指到的扇形文字」一致。
Expected: 完全一致（沿用 index.html 同一組 `spinTo` 公式，已驗證對齊）。

- [ ] **Step 4: 記錄完成**（非 git repo：於 `部署資訊.md` 追加一行「Task 3 完成」；git repo：`git add public/onsite.html && git commit -m "feat: 現場轉盤頁 /onsite"`）

---

### Task 4: 部署與端到端驗證

**Files:** 無新增，部署整包。

- [ ] **Step 1: 確認「現場中獎紀錄」分頁已建立**（Task 1 前置）。若尚未建立，先建好表頭 `中獎時間 | 獎項`。

- [ ] **Step 2: 部署正式**

Run: `cd "/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel" && vercel deploy --prod --yes`
Expected: 部署成功，回傳 production URL。

- [ ] **Step 3: 線上端點驗證**

Run: `curl -s -X POST https://heiwei-expo-wheel.vercel.app/api/onsite-draw -H 'Content-Type: application/json' -d '{}'`
Expected: 回 `{prizeId,prizeFull,label}`，且「現場中獎紀錄」分頁多一列（時間 + 獎項）。

- [ ] **Step 4: 線上頁面實測**

在手機/平板開 `https://heiwei-expo-wheel.vercel.app/onsite`：連轉多次、確認指針對齊、卡片大字正確、「下一位」可重轉、表格持續累加紀錄。

- [ ] **Step 5: 回歸驗證 LINE 版未壞**

開 `https://heiwei-expo-wheel.vercel.app/`（需在 LINE 內走 LIFF）確認原本抽獎流程正常；或至少 `curl -s -o /dev/null -w "%{http_code}" https://heiwei-expo-wheel.vercel.app/api/prizes` 應回 `200`。

- [ ] **Step 6: 更新專案紀錄**

在 `部署資訊.md` 記錄現場版網址 `https://heiwei-expo-wheel.vercel.app/onsite` 與說明（無認證、共用設定與庫存、寫「現場中獎紀錄」）。並提醒使用者可另做 QR code 給現場人員。

---

## Self-Review

**Spec coverage:**
- 無認證入口 → Task 3（onsite.html 無 LINE/Email）✅
- 轉到即給、不核銷 → Task 2（不發碼、不寫 draw、不推播）✅
- 後台獎項/機率設定，且與現有一模一樣 → 共用 `getPrizeConfig()`／「獎品設定」分頁（Task 2）✅
- 限量共用 → `takeStock(prize.id, prize.dailyCap)`（Task 2）✅
- 中獎紀錄「時間+獎項」 → Task 1 `logOnsiteDraw`＋「現場中獎紀錄」分頁 ✅
- 不動 LINE 版 → Global Constraints 明列不得修改清單；Task 4 Step 5 回歸驗證 ✅

**Placeholder scan:** 無 TBD/TODO；每個 code step 均含完整程式碼。✅

**Type consistency:** `getPrizeConfig()` 回傳的 `prizes[].{id,full,label,weight,dailyCap}`、`fallbackId` 與 Task 2 使用一致；`takeStock(prizeId, cap)` 簽章與 store.js 一致；`logOnsiteDraw({prizeFull})` 定義（Task 1）與呼叫（Task 2）一致；`/api/onsite-draw` 回傳 `{prizeId,prizeFull,label}` 與 onsite.html 消費欄位一致。✅
