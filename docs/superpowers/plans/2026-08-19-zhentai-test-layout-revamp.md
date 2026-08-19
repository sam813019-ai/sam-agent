# 振太 zhentai-test 版面調整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依 2026-08-19 spec 完成振太 `zhentai-test/` 六項客戶回饋調整，並部署上線驗證。

**Architecture:** 靜態站，無建置流程、無測試框架。改動集中在 5 個檔案的 HTML/內嵌 CSS/一支共用 JS。
驗證方式為「本機靜態伺服器（缺檔自動轉址到線上抓圖片與影格）＋ Playwright 真瀏覽器斷言腳本」，
每個任務先加會失敗的斷言、再改碼、再跑到綠、然後 commit。全部綠燈後才走 Novamira 部署與線上複驗。

**Tech Stack:** 純 HTML / CSS / vanilla JS；Python 3 `http.server`（本機預覽）；
`playwright-core` + 系統 Chrome（驗證）；Novamira MCP `execute-php`（部署）。

## Global Constraints

- 只改 `zhentai-test/`。**不得**修改 `zhentai/`、`jt-data.js`、`portal.html`、`360tour/`。
- 工作目錄：`/Users/mac/Downloads/sam-agent/zhentai-test-work/`（已含線上抓下的 7 個檔）。
- 全站**相對路徑**（此包與舊 `zhentai/` 的根相對路徑寫法不同），新增資源一律用相對路徑。
- **`products.html` 不載入 `jt-ui.css`**，它有自己內嵌的一份卡片／modal CSS。凡卡片或 modal 的 CSS 改動，
  **必須同時改 `jt-ui.css`（首頁用）與 `products.html` 內嵌 `<style>`（產品頁用）**。
- 三頁導覽列皆為 6 項，任何導覽變更要三頁同步。
- i18n：靜態文字用 `data-zh` / `data-en` / `data-vi`；含 HTML 者加 `data-i18n-html="1"`，
  屬性內的 HTML 用 `&quot;` 逸出。新增文字**三語都要給**。
- 錨點 `#home` `#latest` `#about` `#products` `#news` `#catalog` `#contact` **id 一律不得更名**。
- count-up 動畫（`.count[data-count]`，IntersectionObserver + rAF）必須保留可運作。
- `git add` **只加明確路徑**，禁止 `git add -A`（本 repo 有 4.3GB 振太 zip 地雷）。
- 部署前備份伺服器原檔為 `*.bak-20260819`；部署後 bump `?v=` 並執行整域 edge cache purge。

### 現況版本號（bump 依據）

| 檔案 | jt-data.js | jt-ui.js | jt-ui.css |
|---|---|---|---|
| `index.html` | `?v=4` | `?v=7` | `?v=6` |
| `products.html` | `?v=4` | `?v=7` | 未載入 |
| `contact.html` | `?v=4` | 未載入 | 未載入 |

### 關鍵行號（改動前的基準，改動後會位移）

`index.html`：
- `.prod-title` CSS line 486｜`.contact-title` CSS line 604
- ABOUT 基底 CSS line 384–474（`.about` / `.about-head` / `.about-yr` / `.about-statement` /
  `.about-cols` / `.about-col` / `.timeline` / `.tl-*` / `.stats` / `.stat`）
- 導覽 `<ul>` line 843–850
- `.hero-h1` 手機 media query line 814｜`.hero-h1` 主規則 line 876
- LATEST 區塊 line 926–983（註解 926、`<style>` 927–947、`<section>` 948–983）
- ABOUT 區塊 line 985–1070（註解 985、`<style>` 986–1006、`<section>` 1007–1070）
- CONTACT 區塊 line 1182–1264
- 尾端 script line 1442–1443

`products.html`：`.prod-title` line 486｜`.prod-card .mdl` line 548｜`.prod-card .foot` line 567｜
`.jt-desc-list li` line 802｜modal CSS line 769–880

`contact.html`：`.contact-title` CSS line 641｜`.contact-grid` / `.office` CSS line 648–665｜
`.contact-title` HTML line ~880｜`.contact-grid` HTML line ~890–920

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `zhentai-test-work/devserver.py` | 建立 | 本機靜態伺服器；本機有檔就服務本機版，沒有就 302 轉址到線上（讓圖片／360 影格照常載入） |
| `zhentai-test-work/check.mjs` | 建立 | Playwright 斷言腳本，逐任務累加檢查項 |
| `zhentai-test-work/package.json` | 建立 | 固定 `playwright-core` 依賴 |
| `zhentai-test-work/.gitignore` | 建立 | 排除 `node_modules/` |
| `zhentai-test-work/index.html` | 修改 | 標題字級、區塊對調、公司簡介重做、聯絡標題與文案、首頁聯絡區、modal CSS |
| `zhentai-test-work/products.html` | 修改 | 產品線標題字級、導覽順序、卡片與 modal 內嵌 CSS |
| `zhentai-test-work/contact.html` | 修改 | 導覽順序、聯絡標題與文案、四張分公司卡 |
| `zhentai-test-work/jt-ui.js` | 修改 | 移除卡片四個標記的渲染 |
| `zhentai-test-work/jt-ui.css` | 修改 | 移除卡片標記樣式、modal 說明文字放大加粗 |
| `zhentai-test-work/deploy.py` | 建立 | Novamira execute-php 分塊上傳 + filesize 驗證 + edge cache purge |

任務順序刻意由「低風險、獨立」排到「高風險、牽連廣」：
先建驗證骨架 → 純字級 → 純文案 → JS/CSS 卡片 → modal → 區塊搬移 → 整區重做 → 新資料區塊 → 部署。

---

### Task 1: 本機預覽伺服器與 Playwright 驗證骨架

**Files:**
- Create: `zhentai-test-work/devserver.py`
- Create: `zhentai-test-work/package.json`
- Create: `zhentai-test-work/.gitignore`
- Create: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: 無（第一個任務）
- Produces:
  - 本機站台 `http://localhost:8899/index.html`（以及 `products.html`、`contact.html`）
  - `check.mjs` 匯出的檢查清單格式：`{ name: string, page: 'index'|'products'|'contact', fn: async (page) => void }`，
    放在檔案內的 `const CHECKS = [...]`，後續每個任務往這個陣列**追加**項目
  - 執行指令 `node check.mjs`，全綠 exit 0、任一失敗 exit 1 並印出 `FAIL <name>: <錯誤訊息>`

- [ ] **Step 1: 建立本機伺服器**

`zhentai-test-work/devserver.py`：

```python
#!/usr/bin/env python3
"""本機預覽 zhentai-test：本機有檔就給本機版，沒有的（圖片/影片/360影格）轉址到線上。"""
import http.server
import os
import socketserver
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
REMOTE = "https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test"
PORT = 8899


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _local_missing(self):
        path = urllib.parse.urlsplit(self.path).path
        if path in ("", "/"):
            return None
        local = os.path.join(ROOT, path.lstrip("/"))
        return None if os.path.isfile(local) else path

    def do_GET(self):
        missing = self._local_missing()
        if missing:
            self.send_response(302)
            self.send_header("Location", REMOTE + missing)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, *args):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"serving {ROOT} on http://localhost:{PORT}  (missing -> {REMOTE})")
    httpd.serve_forever()
```

- [ ] **Step 2: 啟動伺服器並確認可取得首頁**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
python3 devserver.py &
sleep 1
curl -s -o /dev/null -w "index=%{http_code}\n" http://localhost:8899/index.html
curl -s -o /dev/null -w "logo=%{http_code}\n" -L http://localhost:8899/media/hero-poster.jpg
```

Expected：`index=200`、`logo=200`（第二個是經 302 轉址到線上取得的）

- [ ] **Step 3: 安裝 playwright-core**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
printf 'node_modules/\n' > .gitignore
cat > package.json <<'JSON'
{
  "name": "zhentai-test-work",
  "private": true,
  "type": "module",
  "dependencies": {
    "playwright-core": "^1.49.0"
  }
}
JSON
npm install
```

Expected：安裝成功（`playwright-core` 不含瀏覽器二進位，用系統 Chrome）

- [ ] **Step 4: 建立驗證腳本骨架，含第一條「頁面無 JS 錯誤」檢查**

`zhentai-test-work/check.mjs`：

```js
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:8899';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** 每個任務往這個陣列追加檢查項 */
const CHECKS = [
  {
    name: 'T1 三頁載入無 JS 錯誤',
    page: 'index',
    fn: async (page, errors) => {
      if (errors.length) throw new Error('JS errors: ' + errors.join(' | '));
    },
  },
];

/** 取得元素的 computed font-size（px 數值） */
async function fontSize(page, selector) {
  return page.$eval(selector, (el) => parseFloat(getComputedStyle(el).fontSize));
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const results = [];
  const pages = ['index', 'products', 'contact'];
  const ctxByPage = {};

  for (const name of pages) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(`${BASE}/${name}.html`, { waitUntil: 'networkidle' });
    ctxByPage[name] = { page, errors };
  }

  for (const check of CHECKS) {
    const { page, errors } = ctxByPage[check.page];
    try {
      await check.fn(page, errors, { fontSize });
      results.push(['PASS', check.name, '']);
    } catch (e) {
      results.push(['FAIL', check.name, e.message]);
    }
  }

  await browser.close();

  let failed = 0;
  for (const [status, name, msg] of results) {
    if (status === 'FAIL') failed++;
    console.log(`${status}  ${name}${msg ? '  -> ' + msg : ''}`);
  }
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
```

- [ ] **Step 5: 執行驗證腳本**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`PASS  T1 三頁載入無 JS 錯誤`、`1 passed, 0 failed`

若此步就有 JS 錯誤，代表基準版本本身有問題，**先記錄下來再繼續**（不要視為本次改動造成）。

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/devserver.py zhentai-test-work/check.mjs \
        zhentai-test-work/package.json zhentai-test-work/package-lock.json \
        zhentai-test-work/.gitignore \
        zhentai-test-work/index.html zhentai-test-work/products.html \
        zhentai-test-work/contact.html zhentai-test-work/portal.html \
        zhentai-test-work/jt-data.js zhentai-test-work/jt-ui.js zhentai-test-work/jt-ui.css
git commit -m "chore(zhentai-test): 建立本機預覽伺服器與 Playwright 驗證骨架，納入線上基準檔"
```

---

### Task 2: 三個標題字級縮小（spec 第 1、3、5 項的字級部分）

**Files:**
- Modify: `zhentai-test-work/index.html:814`（`.hero-h1` 手機）、`:876`（`.hero-h1`）、`:486`（`.prod-title`）、`:604`（`.contact-title`）
- Modify: `zhentai-test-work/products.html:486`（`.prod-title`）
- Modify: `zhentai-test-work/contact.html:641`（`.contact-title`）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 1 的 `CHECKS` 陣列與 `fontSize()` helper（透過 `fn` 第三參數傳入）
- Produces: 無新介面（純樣式）

- [ ] **Step 1: 加入會失敗的字級斷言**

在 `check.mjs` 的 `CHECKS` 陣列末端追加：

```js
  {
    name: 'T2 首頁 hero 標題 ≤ 56px',
    page: 'index',
    fn: async (page, _e, h) => {
      const px = await h.fontSize(page, '.hero-h1');
      if (px > 56) throw new Error(`hero-h1 = ${px}px，應 ≤ 56`);
    },
  },
  {
    name: 'T2 首頁產品線標題 ≤ 64px',
    page: 'index',
    fn: async (page, _e, h) => {
      const px = await h.fontSize(page, '.prod-title');
      if (px > 64) throw new Error(`prod-title = ${px}px，應 ≤ 64`);
    },
  },
  {
    name: 'T2 產品頁產品線標題 ≤ 64px',
    page: 'products',
    fn: async (page, _e, h) => {
      const px = await h.fontSize(page, '.prod-title');
      if (px > 64) throw new Error(`prod-title = ${px}px，應 ≤ 64`);
    },
  },
  {
    name: 'T2 首頁聯絡標題 ≤ 68px',
    page: 'index',
    fn: async (page, _e, h) => {
      const px = await h.fontSize(page, '.contact-title');
      if (px > 68) throw new Error(`contact-title = ${px}px，應 ≤ 68`);
    },
  },
  {
    name: 'T2 聯絡頁聯絡標題 ≤ 68px',
    page: 'contact',
    fn: async (page, _e, h) => {
      const px = await h.fontSize(page, '.contact-title');
      if (px > 68) throw new Error(`contact-title = ${px}px，應 ≤ 68`);
    },
  },
```

- [ ] **Step 2: 執行驗證，確認新斷言失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：5 個 T2 檢查全部 `FAIL`
（1440px 視窗下現值約：hero-h1 `6.2vw`=89px、prod-title `6.4vw`=92px、contact-title `7vw`=101px）

- [ ] **Step 3: 改字級**

`index.html` line 814（手機 media query 內）：

```css
  .hero-h1{font-size:1.7rem}
```

`index.html` line 876：

```css
.hero-h1{font-family:var(--f-display);font-weight:800;color:#fff;font-size:clamp(1.9rem,4.2vw,3.4rem);line-height:1.1;letter-spacing:.02em;margin:0 0 16px;text-shadow:0 4px 36px rgba(0,0,0,.55)}
```

`index.html` 與 `products.html` 各自的 line 486 `.prod-title`：

```css
.prod-title{
  font-family:var(--f-serif-tc);font-weight:900;
  font-size:clamp(34px,4.2vw,60px);line-height:.95;
}
```

`index.html` line 604 與 `contact.html` line 641 各自的 `.contact-title`：

```css
.contact-title{
  font-family:var(--f-serif-tc);font-weight:900;
  font-size:clamp(34px,4.6vw,64px);line-height:.95;
}
```

- [ ] **Step 4: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`6 passed, 0 failed`

- [ ] **Step 5: 目視確認未破版**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'mobile']]) {
    const p=await b.newPage({viewport:{width:w,height:h}});
    await p.goto('http://localhost:8899/index.html',{waitUntil:'networkidle'});
    await p.screenshot({path:\`shot-t2-\${tag}.png\`});
    await p.close();
  }
  await b.close();
});
"
```

用 Read 工具開 `shot-t2-desktop.png` 與 `shot-t2-mobile.png`，確認 hero 標題不擠、不破版、黃字仍在。

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/index.html zhentai-test-work/products.html \
        zhentai-test-work/contact.html zhentai-test-work/check.mjs
git commit -m "style(zhentai-test): 縮小 hero、產品線、聯絡三處主標題字級"
```

---

### Task 3: 聯絡標題文案去除標點（spec 第 5 項文案部分）

**Files:**
- Modify: `zhentai-test-work/index.html:~1187`（`.contact-title` HTML）
- Modify: `zhentai-test-work/contact.html:~880`（`.contact-title` HTML）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 1 的 `CHECKS` 陣列
- Produces: 無新介面

- [ ] **Step 1: 加入會失敗的斷言（三語各驗一次）**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T3 聯絡標題三語皆無標點（首頁）',
    page: 'index',
    fn: async (page) => {
      for (const lang of ['zh', 'en', 'vi']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(120);
        const txt = await page.$eval('.contact-title', (el) => el.textContent);
        const bad = txt.match(/[，。,.、；;]/g);
        if (bad) throw new Error(`${lang} 仍有標點 ${bad.join('')}：${txt.trim()}`);
      }
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
  {
    name: 'T3 聯絡標題三語皆無標點（聯絡頁）',
    page: 'contact',
    fn: async (page) => {
      for (const lang of ['zh', 'en', 'vi']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(120);
        const txt = await page.$eval('.contact-title', (el) => el.textContent);
        const bad = txt.match(/[，。,.、；;]/g);
        if (bad) throw new Error(`${lang} 仍有標點 ${bad.join('')}：${txt.trim()}`);
      }
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
  {
    name: 'T3 聯絡標題黃字紅字 span 仍在（首頁）',
    page: 'index',
    fn: async (page) => {
      const n = await page.$$eval('.contact-title .y, .contact-title .r', (els) => els.length);
      if (n < 2) throw new Error(`.y/.r span 只剩 ${n} 個，i18n HTML 逸出可能壞了`);
    },
  },
```

- [ ] **Step 2: 執行驗證，確認前兩條失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：兩條 `T3 ... 無標點` 為 `FAIL`（zh 有「，。」），第三條 `PASS`

- [ ] **Step 3: 改文案**

`index.html` 與 `contact.html` 中的 `.contact-title`（兩檔內容相同），整段替換為：

```html
      <h2 class="contact-title" data-i18n-html="1" data-zh="把你的生產線<br><span class=&quot;y&quot;>自動化</span>的第<span class=&quot;r&quot;>一步</span><br>從一封信開始" data-en="The first <span class=&quot;y&quot;>step</span> to <span class=&quot;r&quot;>automate</span><br>your production line<br>starts with one message" data-vi="Bước <span class=&quot;y&quot;>đầu tiên</span> để <span class=&quot;r&quot;>tự động hóa</span><br>dây chuyền của bạn<br>bắt đầu từ một tin nhắn">
        把你的生產線<br>
        <span class="y">自動化</span>的第<span class="r">一步</span><br>
        從一封信開始
      </h2>
```

改動點只有三處：`data-zh` 去掉 `，` 與 `。`、`data-en` 去掉句尾 `.`、`data-vi` 去掉句尾 `.`，
以及 fallback 內文同步。`&quot;` 逸出格式不可動。

- [ ] **Step 4: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`9 passed, 0 failed`

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/index.html zhentai-test-work/contact.html zhentai-test-work/check.mjs
git commit -m "style(zhentai-test): 聯絡標題三語移除句尾標點"
```

---

### Task 4: 產品卡移除四個標記（spec 第 4.1 項）

**Files:**
- Modify: `zhentai-test-work/jt-ui.js:44-66`（`window.jtRenderProducts`）
- Modify: `zhentai-test-work/jt-ui.css`（`.prod-card .mdl` / `.foot` / `.arr` / `.icon` / `.pc-top` 相關規則）
- Modify: `zhentai-test-work/products.html:548,567`（同名規則的內嵌副本）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 1 的 `CHECKS` 陣列
- Produces:
  - `jtRenderProducts` 輸出的卡片 DOM 變為：
    `.prod-card > (.pc-img) + .pc-grad + .idx-no + .pc-bot > (h5 + .en)`
    —— 不再有 `.pc-top`、`.mdl`、`.foot`、`.arr`
  - `jtMode(p)` 函式**保留不動**（`jtCardThumb` 與 modal 開啟邏輯仍依賴它）

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T4 產品卡不含 mdl/foot/arr 標記（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      const n = await page.$$eval('.prod-card .mdl, .prod-card .foot, .prod-card .arr, .prod-card .pc-top',
        (els) => els.length);
      if (n) throw new Error(`仍有 ${n} 個標記元素`);
    },
  },
  {
    name: 'T4 產品卡不含 VIEW/PHOTO/360 字樣（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      const txt = await page.$eval('.prod-card', (el) => el.innerText.toUpperCase());
      for (const kw of ['VIEW', 'PHOTO', '360', 'SET ×', '準備中']) {
        if (txt.includes(kw)) throw new Error(`卡片仍出現「${kw}」：${txt.replace(/\n/g, ' / ')}`);
      }
    },
  },
  {
    name: 'T4 產品卡仍保留編號與中英名（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      const has = await page.$eval('.prod-card', (el) => ({
        idx: !!el.querySelector('.idx-no'),
        h5: !!el.querySelector('h5'),
        en: !!el.querySelector('.en'),
      }));
      if (!has.idx || !has.h5 || !has.en) throw new Error(JSON.stringify(has));
    },
  },
  {
    name: 'T4 點卡片仍能開啟 modal（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      await page.click('.prod-card');
      await page.waitForSelector('.jt-modal.open', { timeout: 8000 });
      const name = await page.$eval('#jt-modal-name-zh', (el) => el.textContent.trim());
      if (!name) throw new Error('modal 開了但產品名是空的');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'T4 首頁產品卡同樣無標記',
    page: 'index',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      const n = await page.$$eval('.prod-card .mdl, .prod-card .foot, .prod-card .arr, .prod-card .pc-top',
        (els) => els.length);
      if (n) throw new Error(`首頁仍有 ${n} 個標記元素`);
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：前兩條與最後一條 `FAIL`（`T4 ... 保留編號` 與 `T4 點卡片開 modal` 應已 `PASS`）

- [ ] **Step 3: 改 jt-ui.js 卡片渲染**

`jt-ui.js` 中 `window.jtRenderProducts` 內，把現行這段：

```js
  grid.innerHTML = list.map((p, i) => {
    const mode = jtMode(p);
    const tag = mode === 'group' ? `${window.T('tag_set')} ×${p.items.length}` : mode === '360' ? window.T('tag_360') : mode === 'png' ? window.T('tag_photo') : window.T('tag_soon');
    const foot = mode === 'group' ? window.T('view_set') : mode === '360' ? window.T('view_3d') : mode === 'png' ? window.T('view_photo') : window.T('coming');
    const pcImg = jtCardThumb(p);
    return `
    <div class="prod-card" onclick="jtOpenModal(${p._i})">
      ${pcImg}
      <div class="pc-grad"></div>
      <span class="idx-no">[${String(i+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}]</span>
      <div class="pc-top"><div class="mdl">${tag}</div></div>
      <div class="pc-bot">
        <h5>${nm(p)}</h5>
        <div class="en">${window.LANG === 'en' ? '' : p.en}</div>
        <div class="foot"><span>${foot}</span><span class="arr">→</span></div>
      </div>
    </div>`;
  }).join('');
```

替換為（刪掉 `mode` / `tag` / `foot` 三個宣告與 `.pc-top`、`.foot` 兩段 DOM）：

```js
  grid.innerHTML = list.map((p, i) => {
    const pcImg = jtCardThumb(p);
    return `
    <div class="prod-card" onclick="jtOpenModal(${p._i})">
      ${pcImg}
      <div class="pc-grad"></div>
      <span class="idx-no">[${String(i+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}]</span>
      <div class="pc-bot">
        <h5>${nm(p)}</h5>
        <div class="en">${window.LANG === 'en' ? '' : p.en}</div>
      </div>
    </div>`;
  }).join('');
```

⚠️ **`jtMode(p)` 函式本身不可刪**——`jtCardThumb()`、`jtOpenModal()` 仍在用。
這裡刪掉的只是 `jtRenderProducts` 內那個 `const mode = jtMode(p);` 區域變數。

- [ ] **Step 4: 刪除失效的 CSS（兩處都要改）**

在 `jt-ui.css` **與** `products.html` 的內嵌 `<style>` 中，各自刪除下列規則：

```css
.prod-card .mdl{...}
.prod-card .icon{...}
.prod-card .foot{...}
.prod-card:hover .foot{...}
.prod-card .arr{...}
.prod-card:hover .arr{...}
```

`.prod-card .pc-top,.prod-card .pc-bot{position:relative;z-index:2}` 這條改為只留 `.pc-bot`：

```css
.prod-card .pc-bot{position:relative;z-index:2}
```

**保留不動**：`.prod-card`、`.pc-img`、`.pc-grad`、`.idx-no`、`.prod-card h5`、`.prod-card .en`、
`.prod-card:hover`、`@media (hover:none)` 區塊。

- [ ] **Step 5: 卡片下緣留白調整**

移除 `.foot` 後卡片底部會空一截。在兩處 CSS 的 `.prod-card` 規則中，把 padding 由
`padding:26px 24px 22px` 改為 `padding:26px 24px 26px`，並把 `.prod-card .en` 的
`margin-bottom:16px` 改為 `margin-bottom:0`。

- [ ] **Step 6: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`14 passed, 0 failed`

- [ ] **Step 7: 目視確認卡片外觀**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto('http://localhost:8899/products.html',{waitUntil:'networkidle'});
  await p.waitForSelector('.prod-card');
  await p.locator('#jt-prod-grid').screenshot({path:'shot-t4-cards.png'});
  await b.close();
});
"
```

用 Read 工具開 `shot-t4-cards.png`，確認卡片乾淨、編號與中英名仍在、圖片沒被裁掉、底部無空洞。

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/jt-ui.js zhentai-test-work/jt-ui.css \
        zhentai-test-work/products.html zhentai-test-work/check.mjs
git commit -m "feat(zhentai-test): 產品卡移除 PHOTO/360/VIEW/箭頭四個標記"
```

---

### Task 5: Modal 資料卡放大、文字加大加粗（spec 第 4.2 項）

**Files:**
- Modify: `zhentai-test-work/products.html`（modal CSS，line 769–880 區間）
- Modify: `zhentai-test-work/index.html`（同名 modal CSS 副本）
- Modify: `zhentai-test-work/jt-ui.css`（`.jt-desc-list li` / `.jt-desc-title` / `.jt-spec-row`）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 4 產出的卡片 DOM（點擊開 modal 的路徑）
- Produces: 無新介面

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T5 modal 加大且文字加大加粗（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      await page.click('.prod-card');
      await page.waitForSelector('.jt-modal.open', { timeout: 8000 });
      await page.waitForTimeout(500);

      const inner = await page.$eval('.jt-modal-inner', (el) => el.getBoundingClientRect().width);
      if (inner < 1250) throw new Error(`modal 寬 ${Math.round(inner)}px，應 ≥ 1250（1440 視窗）`);

      const nameFs = await page.$eval('#jt-modal-name-zh', (el) => parseFloat(getComputedStyle(el).fontSize));
      if (nameFs < 30) throw new Error(`產品名 ${nameFs}px，應 ≥ 30`);

      const li = await page.$('.jt-desc-list li');
      if (li) {
        const s = await li.evaluate((el) => {
          const c = getComputedStyle(el);
          return { fs: parseFloat(c.fontSize), fw: parseInt(c.fontWeight, 10) };
        });
        if (s.fs < 15.5) throw new Error(`說明字 ${s.fs}px，應 ≥ 15.5`);
        if (s.fw < 500) throw new Error(`說明字重 ${s.fw}，應 ≥ 500`);
      } else {
        throw new Error('找不到 .jt-desc-list li，無法驗說明字級');
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'T5 modal 加大且文字加大加粗（首頁）',
    page: 'index',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      await page.click('.prod-card');
      await page.waitForSelector('.jt-modal.open', { timeout: 8000 });
      await page.waitForTimeout(500);
      const inner = await page.$eval('.jt-modal-inner', (el) => el.getBoundingClientRect().width);
      if (inner < 1250) throw new Error(`modal 寬 ${Math.round(inner)}px，應 ≥ 1250`);
      const nameFs = await page.$eval('#jt-modal-name-zh', (el) => parseFloat(getComputedStyle(el).fontSize));
      if (nameFs < 30) throw new Error(`產品名 ${nameFs}px，應 ≥ 30`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：兩條 T5 皆 `FAIL`（現況 modal 寬 1180px、產品名 26px、說明字 13.5px/weight 400）

- [ ] **Step 3: 改 modal 尺寸與標題字級（`products.html` 與 `index.html` 兩處）**

桌機加大區塊（`products.html` 約 line 843–847，`index.html` 有同名副本）：

```css
.jt-modal-inner{width:min(1320px,96vw)}
.jt-modal-card{min-height:640px}
```

主規則區塊（`products.html` 約 line 790–791，`index.html` 同）：

```css
.jt-modal-name-zh{font-size:clamp(22px,2.6vw,34px);font-weight:900;color:#fff;line-height:1.2;margin-bottom:6px;font-family:var(--f-sans-tc)}
.jt-modal-name-en{font-size:13px;font-weight:400;color:#555;letter-spacing:.08em;margin-bottom:18px;line-height:1.5}
```

⚠️ 後面還有深色主題覆寫 `.jt-modal-name-zh{color:var(--paper)}` 與
`.jt-modal-name-en{color:#607080}`，**保持原樣不要動**（它們只改顏色）。

- [ ] **Step 4: 改說明文字字級（`jt-ui.css` 與 `products.html` 兩處）**

```css
.jt-desc-title{font-size:13px;letter-spacing:.2em;color:#F4DB00;text-transform:uppercase;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #222}
.jt-desc-list li{position:relative;padding-left:16px;font-size:16px;font-weight:500;line-height:1.75;color:#bdbdbd}
.jt-desc-list li::before{content:'';position:absolute;left:0;top:11px;width:5px;height:5px;background:#F4DB00;transform:rotate(45deg)}
.jt-spec-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #1e1e1e;font-size:15px}
```

⚠️ 檔案後段的深色主題覆寫 `.jt-desc-list li{color:#aab4be}`、`.jt-desc-title{border-bottom-color:#2E3A48}`、
`.jt-spec-row{border-bottom-color:#27313C}` **保持原樣**。

- [ ] **Step 5: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`16 passed, 0 failed`

- [ ] **Step 6: 手機不爆版確認**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto('http://localhost:8899/products.html',{waitUntil:'networkidle'});
  await p.waitForSelector('.prod-card');
  await p.click('.prod-card');
  await p.waitForSelector('.jt-modal.open');
  await p.waitForTimeout(800);
  const over = await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  console.log('horizontal overflow:', over);
  await p.screenshot({path:'shot-t5-modal-mobile.png'});
  await b.close();
});
"
```

Expected：`horizontal overflow: false`。用 Read 開 `shot-t5-modal-mobile.png` 確認 modal 內容完整。

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/products.html zhentai-test-work/index.html \
        zhentai-test-work/jt-ui.css zhentai-test-work/check.mjs
git commit -m "style(zhentai-test): 產品 modal 加大、產品名與說明文字加大加粗"
```

---

### Task 6: 最新產品與公司簡介區塊對調 + 三頁導覽同步（spec 第 2.1 項）

**Files:**
- Modify: `zhentai-test-work/index.html`（搬動 line 926–983 與 985–1070 兩個區塊；導覽 line 843–850；兩處 `sec-label`）
- Modify: `zhentai-test-work/products.html`（導覽列）
- Modify: `zhentai-test-work/contact.html`（導覽列）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 1 的 `CHECKS` 與 `domOrder()` helper
- Produces: 首頁 section 順序 `#home → #about → #latest → #products → #catalog → #contact`；
  導覽第 2 項指向 `#about`、第 3 項指向 `#latest`

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T6 首頁 about 在 latest 之前',
    page: 'index',
    fn: async (page) => {
      const order = await page.evaluate(() => {
        const secs = [...document.querySelectorAll('section[id]')].map((s) => s.id);
        return { about: secs.indexOf('about'), latest: secs.indexOf('latest'), secs };
      });
      if (order.about < 0 || order.latest < 0) throw new Error('找不到 #about 或 #latest');
      if (order.about > order.latest) throw new Error(`順序錯誤：${order.secs.join(' → ')}`);
    },
  },
  {
    name: 'T6 三頁導覽第2項=公司簡介、第3項=最新產品',
    page: 'index',
    fn: async (page) => {
      const items = await page.$$eval('nav ul li a', (as) =>
        as.map((a) => ({ href: a.getAttribute('href'), num: a.querySelector('.num')?.textContent })));
      if (items[1].href !== '#about' || items[1].num !== '02')
        throw new Error(`第2項是 ${items[1].num} ${items[1].href}`);
      if (items[2].href !== '#latest' || items[2].num !== '03')
        throw new Error(`第3項是 ${items[2].num} ${items[2].href}`);
    },
  },
  {
    name: 'T6 產品頁導覽順序同步',
    page: 'products',
    fn: async (page) => {
      const items = await page.$$eval('nav ul li a', (as) =>
        as.map((a) => ({ href: a.getAttribute('href'), num: a.querySelector('.num')?.textContent })));
      if (!items[1].href.endsWith('#about') || items[1].num !== '02')
        throw new Error(`第2項是 ${items[1].num} ${items[1].href}`);
      if (!items[2].href.endsWith('#latest') || items[2].num !== '03')
        throw new Error(`第3項是 ${items[2].num} ${items[2].href}`);
    },
  },
  {
    name: 'T6 聯絡頁導覽順序同步',
    page: 'contact',
    fn: async (page) => {
      const items = await page.$$eval('nav ul li a', (as) =>
        as.map((a) => ({ href: a.getAttribute('href'), num: a.querySelector('.num')?.textContent })));
      if (!items[1].href.endsWith('#about') || items[1].num !== '02')
        throw new Error(`第2項是 ${items[1].num} ${items[1].href}`);
      if (!items[2].href.endsWith('#latest') || items[2].num !== '03')
        throw new Error(`第3項是 ${items[2].num} ${items[2].href}`);
    },
  },
  {
    name: 'T6 區塊小標籤編號對調',
    page: 'index',
    fn: async (page) => {
      const about = await page.$eval('#about .sec-label', (el) => el.textContent);
      const latest = await page.$eval('#latest .sec-label', (el) => el.textContent);
      if (!about.includes('[02]')) throw new Error(`about 標籤為「${about.trim()}」`);
      if (!latest.includes('[03]')) throw new Error(`latest 標籤為「${latest.trim()}」`);
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：5 條 T6 全部 `FAIL`

- [ ] **Step 3: 搬動區塊**

在 `index.html` 中，把 **ABOUT 整塊（`<!-- ═ ABOUT ═ -->` 註解 + `<style>` + `<section class="about">` 到 `</section>`，即原 line 985–1070）剪下，貼到 `<!-- ═ LATEST PRODUCTS ═ -->` 註解（原 line 926）之前**。

搬完後 `index.html` 的區塊順序應為：

```
<!-- ═ NAV ═ -->
<!-- ═ HERO ═ -->        <section class="hero" id="home">
<!-- ═ ABOUT ═ -->       <section class="about" id="about">
<!-- ═ LATEST PRODUCTS ═ --> <section class="latest" id="latest">
<!-- ═ PRODUCTS ═ -->    <section class="products" id="products">
<!-- ═ CATALOG + NEWS ═ --> <section class="cat-news" id="catalog">
<!-- ═ CONTACT ═ -->     <section class="contact" id="contact">
<!-- ═ FOOTER ═ -->
```

⚠️ 兩個 `<style>` 區塊要跟著各自的 `<section>` 一起搬，不可拆開。

- [ ] **Step 4: 改導覽列（三頁）**

`index.html` 導覽 `<ul>` 內第 2、3 兩個 `<li>` 對調並改編號：

```html
      <li><a href="#about"><span class="num">02</span><span data-zh="公司簡介" data-en="About" data-vi="Giới thiệu">公司簡介</span></a></li>
      <li><a href="#latest"><span class="num">03</span><span data-zh="最新產品" data-en="Latest" data-vi="Sản phẩm mới">最新產品</span></a></li>
```

`products.html`（line 945–946）與 `contact.html`（line 873–874）的導覽列同樣兩項對調並改編號。
這兩頁的 href 已確認是跨頁錨點形式 `index.html#latest` / `index.html#about`：

```html
      <li><a href="index.html#about"><span class="num">02</span><span data-zh="公司簡介" data-en="About" data-vi="Giới thiệu">公司簡介</span></a></li>
      <li><a href="index.html#latest"><span class="num">03</span><span data-zh="最新產品" data-en="Latest" data-vi="Sản phẩm mới">最新產品</span></a></li>
```

⚠️ 三頁的**頁尾 footer** 連結清單只有「公司簡介」沒有「最新產品」
（`index.html:1287`、`products.html:1030`、`contact.html:1001`），**不需要改**。

- [ ] **Step 5: 改區塊小標籤編號**

`index.html` about 區的 `sec-label`：

```html
        <div class="sec-label"><span data-zh="[02] 公司簡介 · About" data-en="[02] About Us" data-vi="[02] Giới thiệu">[02] 公司簡介 · About</span></div>
```

`index.html` latest 區的 `sec-label`：

```html
      <div class="sec-label"><span data-zh="[03] 最新產品 · Latest Products" data-en="[03] Latest Products" data-vi="[03] Sản phẩm mới">[03] 最新產品 · Latest Products</span></div>
```

- [ ] **Step 6: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`21 passed, 0 failed`

- [ ] **Step 7: 手機選單同步確認**

手機選單是由 JS clone 桌機 `nav ul` 生成的，順序應自動跟著改。實測：

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto('http://localhost:8899/index.html',{waitUntil:'networkidle'});
  await p.click('.menu-toggle');
  await p.waitForTimeout(600);
  console.log(await p.\$\$eval('.jt-mnav a', as=>as.map(a=>a.textContent.trim()+' '+a.getAttribute('href'))));
  await p.screenshot({path:'shot-t6-mnav.png'});
  await b.close();
});
"
```

Expected：清單第 2 項為公司簡介 `#about`、第 3 項為最新產品 `#latest`

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/index.html zhentai-test-work/products.html \
        zhentai-test-work/contact.html zhentai-test-work/check.mjs
git commit -m "feat(zhentai-test): 公司簡介與最新產品區塊對調，三頁導覽編號同步"
```

---

### Task 7: 公司簡介整區重做（spec 第 2.2 項）

**Files:**
- Modify: `zhentai-test-work/index.html`（about 區的 `<style>` 與 `<section class="about">`；基底 CSS line 384–474 區間）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 6 完成後的區塊位置
- Produces: about 區內新增 DOM `.ab-hero` / `.ab-card` / `.ab-more` / `.ab-bignum` / `.ab-photos` / `.ab-ph-1..3`；
  沿用既有 `.about-cols` / `.about-col` / `.stats` / `.stat` / `.timeline` / `.tl-node`

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T7 公司簡介新結構齊全',
    page: 'index',
    fn: async (page) => {
      const need = ['.ab-hero', '.ab-card', '.ab-more', '.ab-bignum', '.ab-photos',
                    '.ab-ph-1', '.ab-ph-2', '.ab-ph-3'];
      for (const sel of need) {
        const n = await page.$$eval(`#about ${sel}`, (els) => els.length);
        if (!n) throw new Error(`缺少 ${sel}`);
      }
    },
  },
  {
    name: 'T7 三張照片各自獨立 src（方便日後替換）',
    page: 'index',
    fn: async (page) => {
      const srcs = await page.$$eval('#about .ab-photos img', (els) => els.map((e) => e.getAttribute('src')));
      if (srcs.length !== 3) throw new Error(`照片數 ${srcs.length}，應為 3`);
      if (srcs.some((s) => !s || s.startsWith('/'))) throw new Error(`必須為相對路徑：${srcs.join(', ')}`);
    },
  },
  {
    name: 'T7 深色視差覆寫已移除',
    page: 'index',
    fn: async (page) => {
      const bg = await page.$eval('#about', (el) => getComputedStyle(el, '::before').backgroundImage);
      if (bg && bg !== 'none') throw new Error(`#about::before 仍有背景圖 ${bg}`);
      const pColor = await page.$eval('#about .about-col p', (el) => getComputedStyle(el).color);
      if (pColor.includes('255, 255, 255')) throw new Error(`三欄文字仍是白字 ${pColor}`);
    },
  },
  {
    name: 'T7 時間軸保留且在數據區之後',
    page: 'index',
    fn: async (page) => {
      const r = await page.evaluate(() => {
        const kids = [...document.querySelector('#about .wrap').children];
        const iStats = kids.findIndex((k) => k.classList.contains('stats'));
        const iTl = kids.findIndex((k) => k.classList.contains('timeline'));
        const nodes = document.querySelectorAll('#about .tl-node').length;
        return { iStats, iTl, nodes };
      });
      if (r.iTl < 0) throw new Error('時間軸不見了');
      if (r.nodes !== 6) throw new Error(`時間軸節點 ${r.nodes} 個，應為 6`);
      if (r.iTl < r.iStats) throw new Error('時間軸應排在數據區之後');
    },
  },
  {
    name: 'T7 count-up 仍會跑（大數字與數據區）',
    page: 'index',
    fn: async (page) => {
      await page.evaluate(() => document.querySelector('#about').scrollIntoView());
      await page.waitForTimeout(2500);
      const vals = await page.$$eval('#about .count', (els) => els.map((e) => e.textContent.trim()));
      if (!vals.length) throw new Error('找不到 .count 元素');
      if (vals.every((v) => v === '0')) throw new Error(`count-up 沒跑，值為 ${vals.join(', ')}`);
      const big = await page.$eval('#about .ab-bignum .count', (e) => e.textContent.trim());
      if (big === '0') throw new Error('大數字 count-up 沒跑');
    },
  },
  {
    name: 'T7 更多鈕連到 contact.html 且三語有字',
    page: 'index',
    fn: async (page) => {
      const href = await page.$eval('#about .ab-more', (el) => el.getAttribute('href'));
      if (href !== 'contact.html') throw new Error(`href = ${href}`);
      for (const lang of ['zh', 'en', 'vi']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(120);
        const t = await page.$eval('#about .ab-more', (el) => el.innerText.trim());
        if (!t) throw new Error(`${lang} 的更多鈕沒有文字`);
      }
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：6 條 T7 中前 3 條與最後 1 條 `FAIL`（時間軸與 count-up 兩條此時應已 `PASS`）

- [ ] **Step 3: 移除深色視差覆寫，換上新版 CSS**

把 about 區那個 `<style>`（原 line 986–1006，內容是 `.about::before` 視差 + 一整批 `!important` 深色覆寫）
**整段替換**為：

```html
<style>
/* ── ABOUT：明亮分層版（色塊卡 + 大數字 + 錯落照片） ── */
.about{background:var(--paper);overflow:hidden}

/* 1. 色塊卡 + 大數字 */
.ab-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;margin-bottom:-90px;position:relative;z-index:2}
.ab-card{background:var(--ink);color:var(--paper);border-radius:28px;padding:56px 52px 48px}
.ab-card .sec-label{color:var(--yellow)}
.ab-card .sec-label::before{background:var(--yellow)}
.ab-card .about-yr{font-size:clamp(72px,9vw,128px);color:#fff;margin-top:12px;margin-bottom:18px}
.ab-card .about-yr::after{color:var(--yellow)}
.ab-card .about-statement{font-size:clamp(17px,1.5vw,21px);line-height:1.75;color:rgba(242,237,225,.86);max-width:none}
.ab-card .about-statement em{color:var(--black)}
.ab-more{display:inline-flex;align-items:center;gap:14px;margin-top:32px;
  font-family:var(--f-mono);font-size:12px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--paper);transition:color .25s}
.ab-more .ic{width:42px;height:42px;border-radius:50%;border:1px solid rgba(242,237,225,.35);
  display:grid;place-items:center;font-size:15px;transition:background .25s,color .25s,border-color .25s}
.ab-more:hover{color:var(--yellow)}
.ab-more:hover .ic{background:var(--yellow);border-color:var(--yellow);color:var(--black)}
.ab-bignum{text-align:center}
.ab-bignum .n{font-family:var(--f-display);font-weight:800;line-height:1;
  font-size:clamp(48px,7vw,110px);letter-spacing:-.02em;color:var(--black)}
.ab-bignum .n sup{font-size:.44em;margin-left:4px;font-weight:600;color:var(--red)}
.ab-bignum .lbl{margin-top:12px;font-family:var(--f-sans-tc);font-size:15px;color:var(--concrete)}

/* 2. 錯落照片拼貼 */
.ab-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:96px}
.ab-photos figure{margin:0;border-radius:18px;overflow:hidden;background:var(--cream)}
.ab-photos img{width:100%;height:100%;object-fit:cover;display:block}
.ab-ph-1{aspect-ratio:4/5;margin-top:120px}
.ab-ph-2{aspect-ratio:4/5;margin-top:180px}
.ab-ph-2 img{object-position:center 40%}
.ab-ph-3{aspect-ratio:16/11;margin-top:150px;grid-column:auto}
.ab-ph-3 img{object-position:center 75%}

/* 3. 三欄改卡片 */
.about .about-cols{gap:24px;margin-bottom:0}
.about .about-col{background:#fff;border-radius:16px;padding:32px 30px;
  box-shadow:0 10px 30px -22px rgba(10,9,8,.5)}

/* 4/5. 數據區與時間軸間距 */
.about .stats{margin-top:72px}
.about .timeline{margin-top:80px}

@media(max-width:980px){
  .ab-hero{grid-template-columns:1fr;gap:32px;margin-bottom:-60px}
  .ab-card{padding:40px 30px 36px;border-radius:22px}
  .ab-bignum{text-align:left}
}
@media(max-width:820px){
  .ab-photos{grid-template-columns:1fr;gap:14px;margin-bottom:64px}
  .ab-ph-1,.ab-ph-2,.ab-ph-3{margin-top:0;aspect-ratio:16/10}
  .about .about-cols{grid-template-columns:1fr}
}
</style>
```

⚠️ 原 `@supports (-webkit-touch-callout:none)` 的 iOS 降級規則隨舊 style 一併移除（已無 fixed 背景）。

- [ ] **Step 4: 換上新版 about 區 HTML**

把 `<section class="about" id="about">` 內原本的 `.about-head` 區塊，
替換為新的 `.ab-hero` + `.ab-photos`；**`.about-cols`、`.stats`、`.timeline` 三塊照原樣保留**，
但順序調整為 `.about-cols` → `.stats` → `.timeline`。

新的 `<section>` 開頭（到 `.about-cols` 之前）：

```html
<section class="about" id="about">
  <div class="wrap">

    <!-- 1. 色塊卡 + 大數字 -->
    <div class="ab-hero">
      <div class="ab-card reveal">
        <div class="sec-label"><span data-zh="[02] 公司簡介 · About" data-en="[02] About Us" data-vi="[02] Giới thiệu">[02] 公司簡介 · About</span></div>
        <div class="about-yr">1985</div>
        <p class="about-statement">
          <span data-i18n-html="1" data-zh="一間由<em>岡山鐵道旁的小廠房</em>開始的工廠，四十年間，以振動送料技術走進全球 60 餘國的生產線，成為自動化送料領域中不可或缺的一顆螺絲。" data-en="From <em>a small workshop beside the Gangshan railway</em>, over four decades our vibratory feeding technology has reached production lines in 60+ countries — becoming an indispensable screw in the world of automated feeding." data-vi="Khởi đầu từ <em>một xưởng nhỏ bên đường sắt Gangshan</em>, suốt bốn thập kỷ công nghệ cấp liệu rung của chúng tôi đã đến dây chuyền tại hơn 60 quốc gia — trở thành con ốc không thể thiếu trong lĩnh vực cấp liệu tự động.">一間由<em>岡山鐵道旁的小廠房</em>開始的工廠，四十年間，以振動送料技術走進全球 60 餘國的生產線，成為自動化送料領域中不可或缺的一顆螺絲。</span>
        </p>
        <a class="ab-more" href="contact.html">
          <span class="ic">→</span>
          <span data-zh="更多" data-en="More" data-vi="Thêm">更多</span>
        </a>
      </div>
      <div class="ab-bignum reveal">
        <div class="n"><span class="count" data-count="60">0</span><sup>+</sup></div>
        <div class="lbl" data-zh="遍布出口國" data-en="Export countries" data-vi="Quốc gia xuất khẩu">遍布出口國</div>
      </div>
    </div>

    <!-- 2. 錯落照片拼貼（各自獨立 src，日後可單張替換） -->
    <div class="ab-photos reveal">
      <figure class="ab-ph-1"><img src="media/about-factory.jpg" alt="振太機械岡山廠區"></figure>
      <figure class="ab-ph-2"><img src="media/hero-poster.jpg" alt="振太機械生產現場"></figure>
      <figure class="ab-ph-3"><img src="media/about-factory.jpg" alt="振太機械廠區外觀"></figure>
    </div>
```

接著**原封不動保留** `.about-cols`（三個 `.about-col`）、`.stats`（四個 `.stat`）、`.timeline`（六個 `.tl-node`）
三塊，順序為 cols → stats → timeline，最後 `</div></section>` 收尾。

⚠️ `.stat` 內 `.count[data-count]` 的既有寫法不可改，count-up 靠它。
新的 `.ab-bignum .count` 用同一套寫法即可自動被既有 IntersectionObserver 接管。

- [ ] **Step 5: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`27 passed, 0 failed`

- [ ] **Step 6: 目視確認（桌機 + 手機）**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'mobile']]) {
    const p=await b.newPage({viewport:{width:w,height:h}});
    await p.goto('http://localhost:8899/index.html',{waitUntil:'networkidle'});
    await p.evaluate(()=>document.querySelector('#about').scrollIntoView());
    await p.waitForTimeout(2500);
    await p.locator('#about').screenshot({path:\`shot-t7-about-\${tag}.png\`});
    const over = await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    console.log(tag,'overflow:',over);
    await p.close();
  }
  await b.close();
});
"
```

Expected：兩個尺寸 `overflow: false`。用 Read 開兩張圖，確認：
色塊卡與大數字並排、照片高低錯落、三欄卡片可讀（深字在淺底）、數據區深色、時間軸在最下方。
**與上方 hero（深色）、下方產品線（深色）的銜接要看起來是刻意的分層，不是斷裂。**
若三欄文字在淺底上對比不足，微調 `.about .about-col p{color:var(--concrete)}` 即可。

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/index.html zhentai-test-work/check.mjs
git commit -m "feat(zhentai-test): 公司簡介改為色塊卡＋大數字＋錯落照片的明亮分層版面"
```

---

### Task 8: 聯絡頁四張分公司卡（spec 第 6.1 項）

**Files:**
- Modify: `zhentai-test-work/contact.html`（`.contact-grid` HTML 與 `.office` CSS）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 1 的 `CHECKS`
- Produces: `.contact-grid` 內 4 個 `.office` 卡，各含 `.badge` / `h4` / `.en-ttl` / `dl`

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T8 聯絡頁有四張分公司卡',
    page: 'contact',
    fn: async (page) => {
      const n = await page.$$eval('.contact-grid .office', (els) => els.length);
      if (n !== 4) throw new Error(`卡片數 ${n}，應為 4`);
    },
  },
  {
    name: 'T8 四間公司名與電話正確、晨泰已移除',
    page: 'contact',
    fn: async (page) => {
      const txt = await page.$eval('.contact-grid', (el) => el.innerText);
      const need = [
        '振太機械企業股份有限公司', '+886-7-6210108',
        '上海振好機械有限公司', '+86-21-69592750',
        '嘉興振太機械有限公司', '+86-573-84566588',
        '平陽振太責任有限公司', '+84-274-3810082',
        'chentai@jenntai.com.tw', 'zhenhaojixie@vip.126.com',
        'jiaxingjenntai@jenntai.com.cn', 'zhentai118.vn@gmail.com',
      ];
      for (const s of need) if (!txt.includes(s)) throw new Error(`缺少「${s}」`);
      if (txt.includes('晨泰')) throw new Error('晨泰螺絲機械應已移除');
    },
  },
  {
    name: 'T8 tel/mailto 連結可點',
    page: 'contact',
    fn: async (page) => {
      const tels = await page.$$eval('.contact-grid a[href^="tel:"]', (els) => els.length);
      const mails = await page.$$eval('.contact-grid a[href^="mailto:"]', (els) => els.length);
      if (tels < 4) throw new Error(`tel 連結只有 ${tels} 個`);
      if (mails < 5) throw new Error(`mailto 連結只有 ${mails} 個（台灣兩個 + 其餘各一）`);
    },
  },
  {
    name: 'T8 分公司卡三語切換不報錯且中文名有翻',
    page: 'contact',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(150);
      }
      if (errors.length > before) throw new Error('切語言時出現 JS 錯誤：' + errors.slice(before).join(' | '));
      await page.evaluate(() => window.jtSetLang('en'));
      await page.waitForTimeout(150);
      const en = await page.$eval('.contact-grid', (el) => el.innerText);
      if (!en.includes('Kaohsiung')) throw new Error('英文版地址未切換');
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
  {
    name: 'T8 手機視窗四張卡不溢出',
    page: 'contact',
    fn: async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(200);
      if (over) throw new Error('390px 下有水平溢出');
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：前 3 條 T8 `FAIL`（現況只有 2 張卡、含晨泰）

- [ ] **Step 3: 替換 `.contact-grid` 內容**

把 `contact.html` 中 `<div class="contact-grid">` 到其對應 `</div>` 之間的兩張卡，整段替換為：

```html
    <div class="contact-grid">

      <div class="office reveal">
        <span class="badge"><span data-zh="台灣總公司" data-en="Taiwan HQ" data-vi="Trụ sở Đài Loan">台灣總公司</span></span>
        <h4 data-zh="振太機械企業股份有限公司" data-en="Jenn Tai Machine Enterprise Co., Ltd." data-vi="Jenn Tai Machine Enterprise Co., Ltd.">振太機械企業股份有限公司</h4>
        <div class="en-ttl">JENN TAI MACHINE ENTERPRISE CO., LTD.</div>
        <dl>
          <dt>Addr</dt><dd data-zh="高雄市岡山區岡山路 610 巷 23 號" data-en="No.23, Lane 610, Gangshan Rd, Gangshan Dist, Kaohsiung City, Taiwan" data-vi="No.23, Lane 610, Gangshan Rd, Gangshan Dist, Kaohsiung City, Taiwan">高雄市岡山區岡山路 610 巷 23 號</dd>
          <dt>Tel</dt><dd><a href="tel:+88676210108">+886-7-6210108</a> / <a href="tel:+88676210109">6210109</a></dd>
          <dt>Fax</dt><dd>+886-7-6216766</dd>
          <dt>Email</dt><dd><a href="mailto:chentai@jenntai.com.tw">chentai@jenntai.com.tw</a></dd>
          <dt>Email</dt><dd><a href="mailto:chentai.chentai@msa.hinet.net">chentai.chentai@msa.hinet.net</a></dd>
          <dt>Hours</dt><dd data-zh="週一至週五 08:30 – 17:30" data-en="Mon–Fri 08:30 – 17:30" data-vi="T2–T6 08:30 – 17:30">週一至週五 08:30 – 17:30</dd>
        </dl>
      </div>

      <div class="office alt reveal">
        <span class="badge"><span data-zh="上海分公司" data-en="Shanghai" data-vi="Thượng Hải">上海分公司</span></span>
        <h4 data-zh="上海振好機械有限公司" data-en="Shanghai Chenhao Machinery Co., Ltd." data-vi="Shanghai Chenhao Machinery Co., Ltd.">上海振好機械有限公司</h4>
        <div class="en-ttl">SHANGHAI CHENHAO MACHINERY CO., LTD.</div>
        <dl>
          <dt>Addr</dt><dd data-zh="上海市嘉定區安亭鎮杭桂路 1112 號" data-en="No.1112, Hanggui Rd, Anting Town, Jiading District, Shanghai" data-vi="No.1112, Hanggui Rd, Anting Town, Jiading District, Shanghai">上海市嘉定區安亭鎮杭桂路 1112 號</dd>
          <dt>Tel</dt><dd><a href="tel:+862169592750">+86-21-69592750</a> / <a href="tel:+862169592751">69592751</a></dd>
          <dt>Fax</dt><dd>+86-21-69592752</dd>
          <dt>Email</dt><dd><a href="mailto:zhenhaojixie@vip.126.com">zhenhaojixie@vip.126.com</a></dd>
        </dl>
      </div>

      <div class="office reveal">
        <span class="badge"><span data-zh="浙江分公司" data-en="Zhejiang" data-vi="Chiết Giang">浙江分公司</span></span>
        <h4 data-zh="嘉興振太機械有限公司" data-en="Jiaxing Jenntai Machine Co., Ltd." data-vi="Jiaxing Jenntai Machine Co., Ltd.">嘉興振太機械有限公司</h4>
        <div class="en-ttl">JIAXING JENNTAI MACHINE CO., LTD.</div>
        <dl>
          <dt>Addr</dt><dd data-zh="浙江省嘉興市嘉善縣姚莊鎮福源路 66 號" data-en="No.66, Fuyuan Rd, Yaozhuang Town, Jiashan County, Jiaxing City, Zhejiang Province" data-vi="No.66, Fuyuan Rd, Yaozhuang Town, Jiashan County, Jiaxing City, Zhejiang Province">浙江省嘉興市嘉善縣姚莊鎮福源路 66 號</dd>
          <dt>Tel</dt><dd><a href="tel:+8657384566588">+86-573-84566588</a> / <a href="tel:+8657384566589">84566589</a></dd>
          <dt>Fax</dt><dd>+86-573-84566586</dd>
          <dt>Email</dt><dd><a href="mailto:jiaxingjenntai@jenntai.com.cn">jiaxingjenntai@jenntai.com.cn</a></dd>
        </dl>
      </div>

      <div class="office alt reveal">
        <span class="badge"><span data-zh="越南分公司" data-en="Vietnam" data-vi="Việt Nam">越南分公司</span></span>
        <h4 data-zh="平陽振太責任有限公司" data-en="Binh Duong Jenn Tai Limited Liability Company" data-vi="Công ty TNHH Jenn Tai Bình Dương">平陽振太責任有限公司</h4>
        <div class="en-ttl">BINH DUONG JENN TAI LIMITED LIABILITY COMPANY</div>
        <dl>
          <dt>Addr</dt><dd data-zh="越南胡志明市平陽坊神浪 3 工業區 N1 路旁 6B 地塊 CN19" data-en="CN19, Lo 6B, Giap Duong N1, KCN Song Than 3, Phuong Binh Duong, TP. Ho Chi Minh, Vietnam" data-vi="CN19, Lô 6B, Giáp Đường N1, KCN Sóng Thần 3, Phường Bình Dương, TP. Hồ Chí Minh, Việt Nam">越南胡志明市平陽坊神浪 3 工業區 N1 路旁 6B 地塊 CN19</dd>
          <dt>Tel</dt><dd><a href="tel:+842743810082">+84-274-3810082</a> / <a href="tel:+84961236588">+84-961236588</a></dd>
          <dt>Fax</dt><dd>+84-274-3819983</dd>
          <dt>Email</dt><dd><a href="mailto:zhentai118.vn@gmail.com">zhentai118.vn@gmail.com</a></dd>
        </dl>
      </div>

    </div>
```

- [ ] **Step 4: 調整 `.office` CSS 以容納四張卡與較長內容**

在 `contact.html` 的 `.contact-grid` / `.office` CSS 區塊（原 line 648–665），把 `.contact-grid` 與
`.office dl` 兩條改為：

```css
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px 30px;margin-bottom:50px}
.office dl{display:grid;grid-template-columns:64px 1fr;gap:8px 14px;font-family:var(--f-mono);font-size:12.5px;line-height:1.65;word-break:break-word}
```

並在該區塊後追加手機單欄規則：

```css
@media(max-width:820px){
  .contact-grid{grid-template-columns:1fr;gap:44px}
}
```

⚠️ `.office.alt .badge{background:var(--red);color:var(--paper)}` 保留不動——四張卡會呈現
黃／紅／黃／紅交替，視覺上剛好區分。

- [ ] **Step 5: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`32 passed, 0 failed`

- [ ] **Step 6: 目視確認**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'mobile']]) {
    const p=await b.newPage({viewport:{width:w,height:h}});
    await p.goto('http://localhost:8899/contact.html',{waitUntil:'networkidle'});
    await p.locator('.contact-grid').screenshot({path:\`shot-t8-offices-\${tag}.png\`});
    await p.close();
  }
  await b.close();
});
"
```

用 Read 開兩張圖，確認四張卡對齊、badge 未被裁、長地址正確換行、電話與 Email 沒有溢出。

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/contact.html zhentai-test-work/check.mjs
git commit -m "feat(zhentai-test): 聯絡頁改為台灣/上海/浙江/越南四張分公司卡"
```

---

### Task 9: 首頁聯絡區只留台灣總公司 + 查看全部據點（spec 第 6.3 項）

**Files:**
- Modify: `zhentai-test-work/index.html`（`<section class="contact">` 內的 `.contact-grid`）
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 8 的分公司資料內容
- Produces: 首頁 `.contact-grid` 內 1 個 `.office` + 1 個 `.offices-more` 連結

- [ ] **Step 1: 加入會失敗的斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T9 首頁聯絡區只有一張卡且無晨泰',
    page: 'index',
    fn: async (page) => {
      const n = await page.$$eval('#contact .contact-grid .office', (els) => els.length);
      if (n !== 1) throw new Error(`首頁卡片數 ${n}，應為 1`);
      const txt = await page.$eval('#contact .contact-grid', (el) => el.innerText);
      if (txt.includes('晨泰')) throw new Error('晨泰螺絲機械應已移除');
      if (!txt.includes('振太機械企業股份有限公司')) throw new Error('缺少台灣總公司');
    },
  },
  {
    name: 'T9 查看全部據點連結存在且三語有字',
    page: 'index',
    fn: async (page) => {
      const href = await page.$eval('#contact .offices-more', (el) => el.getAttribute('href'));
      if (href !== 'contact.html') throw new Error(`href = ${href}`);
      for (const lang of ['zh', 'en', 'vi']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(120);
        const t = await page.$eval('#contact .offices-more', (el) => el.innerText.trim());
        if (!t) throw new Error(`${lang} 沒有文字`);
      }
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
```

- [ ] **Step 2: 執行驗證，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：兩條 T9 皆 `FAIL`

- [ ] **Step 3: 改首頁聯絡區**

把 `index.html` 中 `<section class="contact" id="contact">` 內的 `<div class="contact-grid">`
整段（兩張卡）替換為：

```html
    <div class="contact-grid one">
      <div class="office reveal">
        <span class="badge"><span data-zh="台灣總公司" data-en="Taiwan HQ" data-vi="Trụ sở Đài Loan">台灣總公司</span></span>
        <h4 data-zh="振太機械企業股份有限公司" data-en="Jenn Tai Machine Enterprise Co., Ltd." data-vi="Jenn Tai Machine Enterprise Co., Ltd.">振太機械企業股份有限公司</h4>
        <div class="en-ttl">JENN TAI MACHINE ENTERPRISE CO., LTD.</div>
        <dl>
          <dt>Addr</dt><dd data-zh="高雄市岡山區岡山路 610 巷 23 號" data-en="No.23, Lane 610, Gangshan Rd, Gangshan Dist, Kaohsiung City, Taiwan" data-vi="No.23, Lane 610, Gangshan Rd, Gangshan Dist, Kaohsiung City, Taiwan">高雄市岡山區岡山路 610 巷 23 號</dd>
          <dt>Tel</dt><dd><a href="tel:+88676210108">+886-7-6210108</a> / <a href="tel:+88676210109">6210109</a></dd>
          <dt>Fax</dt><dd>+886-7-6216766</dd>
          <dt>Email</dt><dd><a href="mailto:chentai@jenntai.com.tw">chentai@jenntai.com.tw</a></dd>
          <dt>Hours</dt><dd data-zh="週一至週五 08:30 – 17:30" data-en="Mon–Fri 08:30 – 17:30" data-vi="T2–T6 08:30 – 17:30">週一至週五 08:30 – 17:30</dd>
        </dl>
      </div>
      <a class="offices-more reveal" href="contact.html">
        <span data-zh="查看全部據點" data-en="View all offices" data-vi="Xem tất cả văn phòng">查看全部據點</span>
        <span class="arr">→</span>
      </a>
    </div>
```

- [ ] **Step 4: 加 `.offices-more` 樣式**

在 `index.html` 的 `.contact-grid` CSS 規則之後追加：

```css
.contact-grid.one{grid-template-columns:1fr auto;align-items:center}
.offices-more{display:inline-flex;align-items:center;gap:12px;justify-self:end;
  font-family:var(--f-mono);font-size:12px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--paper);border-bottom:1px solid rgba(242,237,225,.3);padding-bottom:6px;
  transition:color .25s,border-color .25s}
.offices-more:hover{color:var(--yellow);border-color:var(--yellow)}
.offices-more .arr{transition:transform .25s}
.offices-more:hover .arr{transform:translateX(6px)}
@media(max-width:820px){
  .contact-grid.one{grid-template-columns:1fr;gap:28px}
  .offices-more{justify-self:start}
}
```

- [ ] **Step 5: 執行驗證，確認全綠**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`34 passed, 0 failed`

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/index.html zhentai-test-work/check.mjs
git commit -m "feat(zhentai-test): 首頁聯絡區只留台灣總公司並加查看全部據點連結"
```

---

### Task 10: 全站回歸驗證（三語 × 桌機/手機 × 360°）

**Files:**
- Modify: `zhentai-test-work/check.mjs`

**Interfaces:**
- Consumes: Task 2–9 的全部改動
- Produces: 完整回歸清單，作為部署前的放行條件

- [ ] **Step 1: 加入回歸斷言**

在 `CHECKS` 末端追加：

```js
  {
    name: 'T10 三語切換全站無 JS 錯誤（首頁）',
    page: 'index',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(250);
      }
      if (errors.length > before) throw new Error(errors.slice(before).join(' | '));
    },
  },
  {
    name: 'T10 三語切換全站無 JS 錯誤（產品頁）',
    page: 'products',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(250);
      }
      if (errors.length > before) throw new Error(errors.slice(before).join(' | '));
    },
  },
  {
    name: 'T10 360° 產品仍能載入影格',
    page: 'products',
    fn: async (page) => {
      const ok = await page.evaluate(async () => {
        const target = JT_DATA.find((p) => p.frames);
        if (!target) return 'no-360-product';
        jtSetupViewer(target);
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const mask = document.querySelector('.jt-loading, #jt-loading');
          const hidden = !mask || getComputedStyle(mask).display === 'none' || mask.style.opacity === '0';
          if (hidden) return 'ok';
        }
        return 'timeout';
      });
      if (ok === 'timeout') throw new Error('360 載入遮罩 30 秒內未消失');
      if (ok === 'no-360-product') throw new Error('JT_DATA 找不到有 frames 的產品');
    },
  },
  {
    name: 'T10 三頁桌機與手機皆無水平溢出',
    page: 'index',
    fn: async (page) => {
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(400);
        const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (over) throw new Error(`${w}px 下有水平溢出`);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    },
  },
```

⚠️ `jtSetupViewer(產品物件)` 才會進 360 分支——`jtShowSingle(i)` 的 `i` **不是** `JT_DATA` 索引，
不要用它來測 360。

- [ ] **Step 2: 執行完整驗證**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && node check.mjs
```

Expected：`38 passed, 0 failed`

若 T10 的 360 檢查因選擇器對不上而失敗，先用下列指令找出實際的遮罩選擇器再修正斷言：

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
grep -n "loading\|遮罩\|mask\|jtFrameLoaded\|FRAMES_TOTAL" jt-ui.js | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/check.mjs
git commit -m "test(zhentai-test): 補全三語、360、RWD 回歸驗證"
```

---

### Task 11: 部署上線與線上複驗

**Files:**
- Create: `zhentai-test-work/deploy.py`
- Modify: `zhentai-test-work/index.html`、`products.html`（`?v=` bump）

**Interfaces:**
- Consumes: Task 2–10 全綠的五個檔案
- Produces: 線上 `zhentai-test/` 更新完成

- [ ] **Step 1: bump 版本號**

`index.html`：

```html
<link rel="stylesheet" href="jt-ui.css?v=8">
...
<script src="jt-ui.js?v=8"></script>
```

`products.html`：

```html
<script src="jt-ui.js?v=8"></script>
```

`contact.html` 只載 `jt-data.js?v=4`，本次未改 `jt-data.js`，**維持不變**。

改完重跑一次 `node check.mjs`，Expected：`38 passed, 0 failed`

- [ ] **Step 2: 寫部署腳本**

`zhentai-test-work/deploy.py`（沿用既有 Novamira execute-php 流程）：

```python
#!/usr/bin/env python3
"""部署 zhentai-test：備份 → 分塊 base64 上傳 → filesize 驗證 → purge edge cache。"""
import base64
import json
import os
import sys
import urllib.request

ENDPOINT = "https://waynebear20996-mlebi.wpcomstaging.com/wp-json/mcp/mcp-adapter-default-server"
USER, APP_PW = "sam813019", "ASN28lfIc7RF7pV74UBXru0R"
DEST = "/srv/htdocs/wp-content/uploads/zhentai-test"
HERE = os.path.dirname(os.path.abspath(__file__))
FILES = ["index.html", "products.html", "contact.html", "jt-ui.js", "jt-ui.css"]
CHUNK = 1_000_000
SESSION = {"id": None}


def call(method, params=None, notify=False):
    body = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        body["params"] = params
    if not notify:
        body["id"] = 1
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method="POST")
    token = base64.b64encode(f"{USER}:{APP_PW}".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    if SESSION["id"]:
        req.add_header("mcp-session-id", SESSION["id"])
    with urllib.request.urlopen(req) as resp:
        if not SESSION["id"]:
            SESSION["id"] = resp.headers.get("mcp-session-id")
        raw = resp.read().decode()
    if notify:
        return None
    for line in raw.splitlines():
        if line.startswith("data:"):
            raw = line[5:].strip()
            break
    return json.loads(raw)


def php(code):
    r = call("tools/call", {
        "name": "mcp-adapter-execute-ability",
        "arguments": {"ability_name": "novamira/execute-php", "parameters": {"code": code}},
    })
    return r["result"]["structuredContent"]["data"]["output"]


def main():
    call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                        "clientInfo": {"name": "zhentai-deploy", "version": "1.0"}})
    call("notifications/initialized", notify=True)

    print("— 備份 —")
    for f in FILES:
        print(f, php(f'@copy("{DEST}/{f}", "{DEST}/{f}.bak-20260819"); echo "ok";'))

    print("— 上傳 —")
    for f in FILES:
        local = os.path.join(HERE, f)
        data = base64.b64encode(open(local, "rb").read()).decode()
        tmp = f"{DEST}/.{f}.b64"
        php(f'@unlink("{tmp}"); echo "ok";')
        for i in range(0, len(data), CHUNK):
            part = data[i:i + CHUNK]
            php(f'file_put_contents("{tmp}", "{part}", FILE_APPEND); echo "ok";')
        php(f'file_put_contents("{DEST}/{f}", base64_decode(file_get_contents("{tmp}"))); '
            f'@unlink("{tmp}"); echo "ok";')
        remote = php(f'echo filesize("{DEST}/{f}");').strip()
        want = os.path.getsize(local)
        status = "OK" if str(want) == remote else "MISMATCH"
        print(f"{f}: local={want} remote={remote} {status}")
        if status == "MISMATCH":
            sys.exit(1)

    print("— purge edge cache —")
    print(php('if (class_exists("Edge_Cache_Plugin")) '
              '{ Edge_Cache_Plugin::get_instance()->purge_domain_now("manual"); echo "purged"; } '
              'else { echo "no-plugin"; }'))


main()
```

- [ ] **Step 3: 執行部署**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work && python3 deploy.py
```

Expected：5 個檔案全部 `OK`（local 與 remote filesize 相同）、最後印出 `purged`

**任一檔 `MISMATCH` 就停下來**，不要繼續，先查原因（分塊未清乾淨或 base64 截斷）。

- [ ] **Step 4: 線上真瀏覽器複驗**

把 `check.mjs` 的 `BASE` 暫時指向線上再跑一次：

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
sed -i '' "s|const BASE = 'http://localhost:8899';|const BASE = 'https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test';|" check.mjs
node check.mjs
sed -i '' "s|const BASE = 'https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test';|const BASE = 'http://localhost:8899';|" check.mjs
```

Expected：`38 passed, 0 failed`

**若線上仍看到舊版**（典型 CDN edge cache 症狀）：重跑一次 purge

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
python3 -c "
import deploy
deploy.call('initialize', {'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'p','version':'1'}})
deploy.call('notifications/initialized', notify=True)
print(deploy.php('Edge_Cache_Plugin::get_instance()->purge_domain_now(\"manual\"); echo \"purged\";'))
"
```

⚠️ 不要用 curl 判斷是否更新——curl 可能命中不同 CDN cache variant 而誤判。一律用真瀏覽器。

- [ ] **Step 5: 線上截圖存證**

```bash
cd /Users/mac/Downloads/sam-agent/zhentai-test-work
node -e "
import('playwright-core').then(async ({chromium})=>{
  const B='https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test';
  const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for (const pg of ['index','products','contact'])
    for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'mobile']]) {
      const p=await b.newPage({viewport:{width:w,height:h}});
      await p.goto(\`\${B}/\${pg}.html\`,{waitUntil:'networkidle'});
      await p.waitForTimeout(2000);
      await p.screenshot({path:\`live-\${pg}-\${tag}.png\`,fullPage:true});
      await p.close();
    }
  await b.close();
});
"
```

用 Read 逐張確認六張線上截圖無異常。

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Downloads/sam-agent
git add zhentai-test-work/deploy.py zhentai-test-work/index.html zhentai-test-work/products.html
git commit -m "chore(zhentai-test): 部署腳本與版本號 bump，六項改版上線"
```

- [ ] **Step 7: 更新專案記憶**

更新 `/Users/mac/.claude/projects/-Users-mac-Downloads-sam-agent/memory/project_zhentai_website.md`，
新增一節「2026-08-19 zhentai-test 六項版面調整 ✅」，內容至少涵蓋：

- 六項改動摘要與 spec／plan 檔案路徑
- **`products.html` 不載入 `jt-ui.css`、自帶一份內嵌卡片/modal CSS**（本次新發現，改樣式要改兩處）
- 工作目錄 `zhentai-test-work/` 與其中的 `devserver.py`（缺檔轉址到線上）、`check.mjs`（38 條斷言）、`deploy.py`
- 版本號現況：`jt-ui.js?v=8` / `jt-ui.css?v=8` / `jt-data.js?v=4`
- 伺服器備份檔 `*.bak-20260819`

---

## 完成條件

1. `node check.mjs` 對本機 38 條全綠
2. `node check.mjs` 對線上 38 條全綠
3. 六張線上截圖（三頁 × 桌機/手機）目視無異常
4. 記憶檔已更新

## 不做（範圍外）

- `zhentai/`（舊版）不同步
- `jt-data.js`、`portal.html`、`360tour/` 不動
- 越南文校對
- 轉正式網域 `jenntai.com.tw`
