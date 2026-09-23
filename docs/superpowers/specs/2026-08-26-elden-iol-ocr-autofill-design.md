# Elden 眼科 — IOL 生物量測報告 OCR 自動代填設計書

- 日期：2026-08-26
- 客戶：Elden（眼科儀器經銷）
- 專案代號：`elden-iol`
- 狀態：設計已核准，待實作計畫

---

## 1. 背景與問題

眼科白內障手術植入散光矯正人工水晶體（Toric IOL）時，流程是：

1. 用 ZEISS IOLMaster 700 做生物量測，印出 `IOL calculation` 報告單（紙本）
2. 技術員／醫師在 ASCRS 官網的 **Barrett Toric Calculator** 手動輸入約 30 個數值
3. 網站算出建議的 IOL 度數、散光片型號與植入軸位，列印給醫師帶進開刀房

痛點在第 2 步：**全靠肉眼讀紙本、手動鍵入**。欄位密集、字小、單位混雜（mm / D / 度），
看錯行或打錯小數點會直接導致選錯鏡片，而鏡片一旦植入即不可逆。

本專案要消除這個手動轉錄環節。

### 1.1 樣本資料（已存於 `elden-iol/docs/samples/`）

- `iolmaster700_report_sample.jpg` — ZEISS IOLMaster 700 報告單（右眼有資料，左眼 Pseudophakic）
- `barrett_toric_result_sample.jpg` — 對應的 Barrett Toric Calculator 輸出

樣本重點數值（用於建立首個測試案例）：

| 項目 | 報告單 | 官網輸入 |
|---|---|---|
| AL | 24.49 mm `(!)` | 24.49 |
| ACD | 3.15 mm | 3.15 |
| K1 / K2 | 43.08 @96° / 45.58 @6° | Flat K 43.08@96 / Steep K 45.58@6 |
| A Constant / LF | 119.30 / 2.04（**非散光片**） | 119.39 / 2.09（**散光片 DIU**） |
| SIA | 無此欄位 | 0.2 D @ 135° |

官網輸出：**17.5 D + DIU375，軸位 7°**，殘餘散光 −0.41 @97°。

---

## 2. 目標與非目標

### 目標

- 技術員把報告單照片拖進工具，數值自動填入 ASCRS 計算器頁面
- 全程零手動鍵入數字
- 報告單上的警告與 borderline 標記不被漏掉，反而更醒目
- 病患個資不離開診所電腦

### 非目標（明確不做）

- **不自行實作 Barrett 演算法。** Barrett Universal II 與 Barrett Toric 為專有演算法，
  其 Predicted PCA（預測後表面角膜散光）模型從未公開，無授權下無法精確重現。
  計算一律交由 ASCRS 官方計算器執行。
- **不自動按下 Calculate。** 填完即停，計算與判讀的責任明確留在使用者身上。
- **不重製結果圖。** 結果圖由官網產生，官網本身即有列印功能。
- 不做病患資料庫、歷史紀錄、多院所帳號系統。

---

## 3. 使用者與定位

- **使用者**：診所技術員（非工程背景），在診間電腦上操作
- **產品定位**：Elden 銷售眼科儀器時的**業務加值工具**，隨儀器附贈以綁定客戶
- **非臨床決策裝置**：工具只協助「資料輸入」，不產生也不解釋醫療建議。
  此定位大幅降低醫材軟體（SaMD）法規負擔，但仍須全程顯示免責聲明。

---

## 4. 技術可行性驗證（2026-08-26 實測）

對 `https://www.ascrs.org/tools/barrett-toric-calculator` 發出請求，回應標頭顯示：

| 標頭 | 值 | 對本專案的意義 |
|---|---|---|
| `cf-mitigated` | `challenge` | Cloudflare **互動式**挑戰，非永久封鎖。真人瀏覽器可通過。 |
| `x-frame-options` | `SAMEORIGIN` | **禁止 iframe 內嵌** |
| `cross-origin-opener-policy` | `same-origin` | `window.open` 取得的 handle 會被切斷 |
| `cross-origin-embedder-policy` | `require-corp` | 跨源資源全面封鎖 |

### 4.0.1 自動化實測（決定性證據）

以 Playwright 驅動**系統安裝的真實 Chrome**（`channel: chrome`，headed 模式，持久化 profile）
載入該頁面，每 5 秒輪詢一次、持續 60 秒：

```
[0] title="請稍候..." inputs=1
[1] title="請稍候..." inputs=1
 …（共 12 次）
[11] title="請稍候..." inputs=1
```

頁面 60 秒內始終停留在 Cloudflare 挑戰畫面，從未進入計算器。
即使使用真實 Chrome 執行檔，受自動化控制的瀏覽器仍無法通過挑戰。

**這是「後端 headless browser 全自動」方案不可行的實證，而非推測。**
同時它反證了擴充功能方案的價值：真人早已通過挑戰、就坐在頁面上，
content script 完全不需要面對這道關卡。

### 結論

1. **純網頁版方案不可行。** `X-Frame-Options` 與 COOP/COEP 三重封鎖，
   任何網頁都無法內嵌 ASCRS 頁面再寫入欄位。
2. **後端 headless browser 全自動方案不可行。** Cloudflare 挑戰會攔截自動化流量。
3. **Chrome 擴充功能是唯一乾淨的路徑，且不受上述任何限制影響** ——
   content script 在使用者已通過 Cloudflare 挑戰的真實分頁中執行，
   同源政策與 X-Frame-Options 對它完全不適用。

換言之，這些防護機制排除了其他所有方案，卻**完全不影響**我們選定的方案。

### 4.1 尚待確認：DOM 寫入行為

唯一剩餘的未知是 ASCRS 頁面的前端框架。若其輸入欄位為 React／Vue 受控元件，
直接設定 `input.value` 不會被框架接受，必須：

```js
// 取原生 value setter，繞過框架覆寫的 setter
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(el, value);
// 再手動派發事件讓框架同步 state
el.dispatchEvent(new Event('input',  { bubbles: true })); // React / Vue
el.dispatchEvent(new Event('change', { bubbles: true })); // Angular / 原生
```

此手法為業界標準解，適用 React、Vue、Angular、jQuery 與原生表單，**沒有已知的無解情境**。
真正需要確認的只是「要派發哪些事件、順序為何」，屬於調校而非可行性問題。

驗證工具已備妥（見 `elden-iol/tools/`）：

- `ascrs-probe.js` — 盤點所有欄位、偵測框架、輸出建議選擇器（唯讀，不修改頁面）
- `ascrs-filltest.js` — 用上述手法實測寫入，並偵測值是否被框架還原

**實作第一步：在真實瀏覽器執行這兩支腳本，據其輸出定案 content script 的寫入策略。**

---

## 5. 架構

```
報告單照片 / PDF
      │  拖入擴充功能側邊面板
      ▼
┌─────────────────────────────┐
│ 本機去識別化（Canvas）        │  病患姓名／ID 區塊塗黑
│ 個資不離開這台電腦            │  只有數值區塊被送出
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ 辨識 API（Vercel Function）   │  Claude Vision
│ 無狀態、不落地任何資料         │  → 結構化 JSON + 逐欄信心值
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ 確認畫面（擴充功能 UI）        │  逐欄「原值 → 填入值」對照
│ 低信心欄位反白，警告置頂       │  技術員必須確認才能繼續
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Content Script               │  寫入 ASCRS 欄位 + 派發事件
│ 注入使用者已開啟的計算器分頁   │  **不觸發 Calculate**
└─────────────┬───────────────┘
              ▼
     技術員自行按 Calculate → 官網產生結果 → 官網列印
```

### 5.1 元件

| 元件 | 職責 | 依賴 |
|---|---|---|
| `sidepanel/` | 上傳、預覽、確認畫面、設定 | React + Tailwind |
| `lib/redact.ts` | Canvas 上遮蔽姓名／ID 區塊 | 無 |
| `lib/lens-constants.ts` | 鏡片型號 → 散光片常數對照表 | 無 |
| `lib/mapping.ts` | 報告單欄位 → 官網欄位的轉換規則 | `lens-constants` |
| `content/fill.ts` | 定位欄位、寫值、派發事件 | 無 |
| `background/` | side panel 生命週期、與 content script 通訊 | 無 |
| `api/recognize` | 呼叫 Claude Vision，回傳結構化 JSON | Vercel Function |

每個元件皆可獨立測試：`redact` 與 `mapping` 為純函式；
`fill.ts` 對本地 HTML fixture 測試；`api/recognize` 對樣本圖測試。

---

## 6. 核心 know-how：欄位對應

報告單到官網**不是一對一搬運**。這張表是產品最主要的價值來源，必須以可維護的資料檔實作。

| 官網欄位 | 來源 | 轉換規則 |
|---|---|---|
| Flat K + 軸 | 報告單 K1 或 TK1 | 依醫師偏好選 K（前表面）或 TK（含後表面）；**兩者不可混用** |
| Steep K + 軸 | 報告單 K2 或 TK2 | 同上 |
| AL | 報告單 AL | 直接對應 |
| ACD | 報告單 ACD | 直接對應 |
| **A Constant / LF** | **不在報告單上** | 報告單印的是非散光片常數。需查對照表換成對應散光片系列的常數。<br>樣本：ZCB00-1（119.30/2.04）→ DIU 系列（119.39/2.09） |
| **SIA + 軸位** | **不在報告單上** | 醫師個人手術誘發散光偏好，存於設定檔。樣本為 0.2 D @135° |
| Surgeon / Date | 不在報告單上 | 設定檔帶入醫師名，日期取當日 |
| Patient / ID | 已於本機遮蔽 | 留空，或由技術員自行輸入 |
| K Index | 頁面選項 | 設定檔（樣本用 1.3375） |
| Cylinder 正負 | 頁面選項 | 設定檔（樣本用 −ve） |

### 6.1 設定檔（`chrome.storage.local`）

```ts
interface ClinicProfile {
  surgeonName: string;        // "中慈 Dr彭"
  defaultSIA: number;         // 0.2
  defaultSIAAxis: number;     // 135
  keratometrySource: 'K' | 'TK';
  kIndex: 1.3375 | 1.332;
  cylinderConvention: 'positive' | 'negative';
  preferredLensFamily: string; // "JJ_DIU"
}
```

**不儲存任何病患資料。**

---

## 7. 辨識輸出資料模型

辨識 API 回傳的結構。每個數值皆附信心值，供 UI 決定是否強制人工確認。

```ts
interface Measurement<T = number> {
  value: T | null;
  confidence: number;      // 0–1
  borderline: boolean;     // 報告單上的 (!) 標記
  rawText: string;         // 模型讀到的原始文字，供人工比對
}

interface EyeData {
  laterality: 'OD' | 'OS';
  status: 'Phakic' | 'Pseudophakic' | 'Aphakic' | 'unknown';
  hasData: boolean;        // Pseudophakic 眼通常整欄為 ---
  al: Measurement;
  acd: Measurement;
  lt: Measurement;
  wtw: Measurement;
  k1: Measurement; k1Axis: Measurement;
  k2: Measurement; k2Axis: Measurement;
  tk1: Measurement; tk1Axis: Measurement;
  tk2: Measurement; tk2Axis: Measurement;
  targetRefraction: Measurement;
  lensModel: Measurement<string>;   // "AMO Tecnic 1 ZCB00-1"
  aConstant: Measurement;           // 報告單上的非散光片常數
}

interface RecognitionResult {
  device: 'IOLMaster700' | 'unknown';
  reportDate: string | null;
  eyes: EyeData[];
  warnings: string[];      // 例："OD: Axial length measurements slightly inconsistent."
  overallConfidence: number;
}
```

`warnings` 為必要欄位。樣本報告單頂端即有眼軸量測不一致的警告，
純數字 OCR 會完全漏掉這類訊息——這正是採用 Vision 模型而非傳統 OCR 的主要理由。

---

## 8. 安全關卡

選錯鏡片不可逆，以下皆為硬性要求：

1. **警告一律置頂紅字**：`(!)` borderline 標記與文字警告皆須顯示，不得摺疊隱藏
2. **左右眼明確選擇**：報告單左 OD 右 OS，須正確判斷哪一眼有資料，
   且無論如何都要求使用者明確確認眼別
3. **信心值門檻**：低於門檻的欄位以反白標示，使用者必須逐一確認才能填入
4. **原值並陳**：確認畫面同時顯示模型讀到的 `rawText` 與轉換後的值
5. **絕不自動計算**：填入後停止，Calculate 由使用者按下
6. **免責聲明常駐**：
   > 本工具僅協助資料輸入，計算結果由 ASCRS 官方計算器產生，最終判斷以醫師為準。
7. **常數轉換須明示**：A Constant 從報告單值換成散光片值時，
   UI 必須明確顯示「119.30 → 119.39（因鏡片由 ZCB00-1 換為 DIU 系列）」

---

## 9. 隱私

- 姓名與 ID 區塊在**瀏覽器本機**以 Canvas 塗黑後才上傳，個資不出診所
- 辨識 API 無狀態，不寫入任何儲存體、不留日誌
- 擴充功能不儲存病患資料，`chrome.storage.local` 僅存診所設定
- 若 Elden 客戶對雲端辨識仍有疑慮，可加購本機部署選項（後續版本評估）

---

## 10. MVP 範圍

**做**：

- 單眼、單一鏡片系列（J&J DIU）
- 只填 Toric IOL 頁籤所需欄位
- 輸入：手機拍攝的報告單照片（JPG/PNG）
- 診所設定檔
- 確認畫面與全部安全關卡

**不做**（後續版本再議）：

- 多廠牌鏡片常數表（Alcon、ZEISS）
- 其他機型報告單（Lenstar、Pentacam）
- PDF 原生解析快速通道
- 雙眼批次處理
- 病患資料庫與歷史紀錄

---

## 11. 技術棧

| 層 | 選擇 | 理由 |
|---|---|---|
| 擴充功能 | Manifest V3 + TypeScript + Vite + CRXJS | MV3 為現行唯一可上架標準 |
| UI | React + Tailwind（Side Panel API） | 確認畫面欄位多、狀態複雜，值得用框架 |
| 辨識 API | Vercel Function（Node，Fluid Compute） | 無狀態、易部署；已有 Vercel 使用經驗 |
| 視覺模型 | Claude Vision | 能同時理解表格結構與警告文字 |
| 儲存 | `chrome.storage.local` | 僅設定檔 |

---

## 12. 驗證策略

1. **黃金測試集**：收集 10–20 張去識別化真實報告單，人工標註正確值，
   逐欄比對辨識正確率。此為專案品質的唯一客觀指標。
2. **對照驗證**：以樣本資料跑完整流程，確認官網輸出與
   `barrett_toric_result_sample.jpg` 完全一致（17.5 D / DIU375 / 軸位 7°）。
3. **填值測試**：對本地 HTML fixture 測試 `fill.ts`，
   並定期對真實 ASCRS 頁面執行 `ascrs-filltest.js` 偵測改版。

---

## 13. 風險

| 風險 | 影響 | 對策 |
|---|---|---|
| ASCRS 改版導致選擇器失效 | 填不進去 | 選擇器集中管理；填入前驗證欄位存在，失敗則明確報錯並回退到手動複製模式 |
| 受控元件不接受寫入 | 阻斷 | 已備原生 setter + 事件派發標準解；實作前先跑 `ascrs-filltest.js` 定案 |
| 翻拍照片辨識率不足 | 產品不可用 | 黃金測試集量化；必要時要求 PDF 輸入或加強拍照引導 |
| 錯誤數值造成臨床傷害 | 嚴重 | 強制人工確認關卡 + 信心值標示 + 原值並陳 + 不自動計算 |
| 報告單版面因韌體版本而異 | 辨識失準 | 收集多版本樣本；Vision 模型對版面變動的耐受度優於樣板比對 |

---

## 14. 待與 Elden 確認

1. 診所拿到的是紙本還是可匯出 PDF？（PDF 準確率差距極大）
2. 診所電腦使用哪種瀏覽器？（擴充功能需 Chrome 或 Edge）
3. 客戶主要使用哪些廠牌的散光片？（決定常數對照表涵蓋範圍）
4. 除 IOLMaster 700 外是否有其他機型報告單？
5. 能否提供 10–20 張去識別化真實報告單以建立測試集？
6. 醫師慣用 K 還是 TK？慣用 SIA 值與切口軸位為何？
