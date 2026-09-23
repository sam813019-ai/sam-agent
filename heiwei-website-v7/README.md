# HEIWEI v7 — 產品停靠左側 ＋ v4 完整 UX

在 v5 的深底世界上，加兩件事：**產品開蓋後停靠左側、文案固定右欄**，以及**把 v4 的四項互動搬進來**。

```bash
cd heiwei-website-v7 && python3 -m http.server 8897   # → http://127.0.0.1:8897
```

## 1. 產品運鏡路徑（單向停靠，不來回擺動）

v5/v6 的產品固定在畫面正中，只有影格在變。v7 讓它在**開蓋那一段移到左側，然後就停在那裡不再移動**：

| 捲動 | 水平位移 | 縮放 | 說明 |
|---|---|---|---|
| 0% | 正中 | 1.00 | 開場 |
| 26% | 左 −19vw（抵達定位） | 1.06 | 蓋子脫離，**本體開始旋轉** |
| 42% | 固定 | **1.26** | 旋轉起手，推近 |
| 70% | 固定 | **1.26** | 整圈轉完都維持最近，不忽大忽小 |
| 86% | 固定 | 1.10 | 膏體完全伸出 → 拉遠讓位 |
| 100% | 固定 | 1.04 | 產品最高，縮到最小才不會切到 |

**放大掛在旋轉段**（影格 26–86 是產品本體整整轉一圈，同時膏體升起）。
從開場到最近，視覺放大約 **1.56 倍**。

之後所有變化都來自影格本身，四段文案共用**右側同一直欄**，只做淡入淡出。
實測產品水平中心：`720 → 26% 抵達 446 → 之後全程鎖在 446`。

### 放大的兩個上限（實測，別隨便調高）

用 alpha 量過每張影格的實際佔幅：

| 影格 | 內容佔畫布高 | 可放大上限 |
|---|---|---|
| 26–86（旋轉段） | 80–82% | **1.5x** |
| 100（膏體全出） | 97.4% | **1.29x** |

所以峰值放在旋轉段（1.26x 安全），收尾一定要降回 1.04 —— 不降就會切到頭尾。

程式在 `PATH` 陣列，改數字就改運鏡。關鍵幾點：

- 位移用 `smoothstep` 補間，不是線性，否則抵達定位時會有生硬的煞車感
- **放大的向下補償交給 `yFix()` 即時算，不能寫死 vh** —— 內容在畫布裡靠上（從 1.3% 起算），
  純放大會讓瓶蓋鑽到導覽列底下；而導覽列高度是固定 px、不隨視窗高度縮放，
  用 vh 補償在矮視窗（如 1440×700）會補不夠。實測三種視窗頂端都穩定在 73–76px
- 文案欄固定左邊界、靠左對齊 —— 眼睛每換一段都回到同一個起點，比左右交替好讀
- **手機 `XF = 0` 完全不位移**，且放大幅度乘 `ZF = 0.55` 收斂 —— 手機文案在下方，
  畫面高度要留給它，滿幅放大會壓到文字
- 位移只改 CSS `transform`，不重繪 canvas，效能跟 v5 相同
- 捲動距離從 520vh 拉長到 **600vh**

## 2. 從 v4 搬進來的 UX

| 功能 | 說明 |
|---|---|
| 跑馬燈 | 無限橫向滾動，滑鼠移上去會暫停 |
| 四大特點 | Glide / Tone-up / Portable / Daily，v4 原文案，4 欄 → 2 欄 → 1 欄 |
| 熱銷排行 | 2 / 1 / 3 頒獎台排列，第一名抬高且加深標記 |
| 肌膚問題篩選 | 6 個 chip，即時篩出對應商品，chip 上顯示件數 |
| 品牌數字 | 10 年 / 14 天 / 2000 萬，進入視窗才開始跑動 |
| 行動版選單 | 漢堡 → 下拉，含 `aria-expanded`；點連結自動收起 |
| 章節進度條 | 底部置中，顯示 06:00 / 09:00 / 12:00 / 16:00，可點擊跳段 |

## ⚠️ 待確認

`TOP3 = ["toner","ampoule","mask5d"]` 這一行是**沿用 v4 的暫定名次，不是真實銷售數據**。
拿到真實排行後改這一行的順序即可，畫面會自動跟著換。

## 踩過的坑

- 產品原本設計成左→右→左→右來回位移，實際看會暈 → 改成只移動一次就定位
- 放大的向下補償一開始寫成 `vh`，矮視窗補不夠、瓶蓋鑽進導覽列 → 改成依畫布尺寸即時算
- 進度指示器原本放左側直排，會跟左側文案疊在一起 → 改底部橫排
- 節拍內原本各有一組段落刻度，跟底部進度條重複 → 移除
- Italiana 的舊體數字會把 `02` 畫成像 `O2`，名次改用 Noto Serif TC + `tabular-nums`
- 導覽列換色的 toggle 必須放在捲動 early-return 之前

素材與轉檔流程見 `../heiwei-website-v5/README.md`，三版共用同一套 101 張 WebP 影格。

---

## Shopline 嵌入版（2026-08-27）

| 檔案 | 用途 |
|---|---|
| `shopline_v7.html` | **貼進 Shopline「客製化語法」元件的就是這支** |
| `test_embed.html` | 本機模擬 Shopline 環境（含 `.CustomPage{overflow:hidden}`），貼上去之前先在這裡驗 |
| `shopline-probe.html` | 平台能力探針，測完即可刪 |

### 探針實測結果（客製化語法元件，非商品描述）

| 能力 | 結果 |
|---|---|
| `<style>` | ✅ |
| CSS 變數 | ✅ **可用**（跟商品描述不同，那邊會被砍） |
| `<script>` | ✅ **可執行** |
| `position:sticky` | ✅ 屬性本身沒被砍 |
| 祖先容器 | ⚠️ `div.CustomPage → overflow:hidden` |

### 轉換做了四件事

1. 拆掉 `doctype/html/head/body` 外殼，內容包進 `.hw-v7`
2. `body{}` 的樣式移到 `.hw-v7`，加 `width:100vw;margin-left:calc(50% - 50vw)` 破格滿版
   （不破格的話深底只會出現在 1200px 的中間一條）
3. **`.CustomPage{overflow:visible !important}`** ← 沒這行 `#pin` 的 sticky 完全失效，產品不會釘住
4. 影格改讀 `FRAME_BASE`（Shopline 讀不到本機 `assets/`）

另外：`#loader` 從 `position:fixed;z-index:100` 改成 `absolute;z-index:5`，
否則載入遮罩會蓋住整個商店（含 header）；`#nav` 用 CSS 隱藏但 DOM 保留，
因為 JS 有 5 處操作它，直接刪 DOM 會 crash。

### 影格圖床

Vercel 專案 `heiwei-v7-frames`（`/Users/mac/Downloads/sam-agent/heiwei-v7-frames`）
網址：`https://heiwei-v7-frames.vercel.app/stick/`　202 張、3.3MB、已設一年快取。
重新部署：`cd heiwei-v7-frames && vercel deploy --prod --yes`

### 踩到的第二個 sticky 陷阱

`body{...overflow-x:hidden}` 搬到 `.hw-v7` 之後 sticky 仍然死的。
原因：一軸設 `hidden` 會讓另一軸從 `visible` 變成 `auto`（CSS 規範），
`.hw-v7` 就成了 sticky 的捲動容器，而它自己不捲動 → `#pin` 完全失效。
掛在 `body` 上時沒事，是因為 body/html 的 overflow 會傳播到視窗。

**解法：改用 `overflow-x:clip`**，clip 不建立捲動容器。
headless 實測：捲到 stage 40% / 60% 時 `#pin.getBoundingClientRect().top` 都是 0，確認釘住。

### 第三個坑：Shopline 主題的全域 button 樣式

底部時間軸（06:00 / 09:00 / 12:00 / 16:00）在 Shopline 上會變成一條**白色膠囊**，
文字也從淺灰變深色。原因是主題給所有 `button` 套了白底＋邊框＋圓角＋自己的字色，
權重壓過 v7 原本的裸 `button{...}` reset。

順帶發現同一批裸選擇器（`a` / `img` / `footer` / `*`）會**外洩污染整個商店**——
`a{text-decoration:none}` 會讓 header、footer 的連結底線消失。

**解法：全部 scope 進 `.hw-v7`**，button 再加 `!important` 強制歸零
（background / border / radius / shadow / padding / appearance / color / font）。

headless 實測（test_embed.html 內有模擬主題 button 樣式的環境）：
- 時間軸 button：`background-color: rgba(0,0,0,0)`、`border: 0px`、`box-shadow: none` ✅
- 商店 header 的連結：`text-decoration: underline` 保持原樣，沒被污染 ✅

### 第四個坑（真正的元凶）：class 名跟 Bootstrap 撞車

底部時間軸的白膠囊**不是 button 造成的**——白條是連續一整條、中間沒被 gap 切開，
代表白底來自 `.progress` 這個容器本身。

Shopline varm 主題是 Bootstrap 底，抓下 `common-*.css` 比對後確認：

    .progress{height:20px;margin-bottom:20px;overflow:hidden;
      background-color:#f5f5f5;border-radius:4px;box-shadow:inset 0 1px 2px rgba(0,0,0,.1)}

比對 v7 的 82 個 class 與主題 CSS，**6 個撞名**：
`progress`（灰底圓角條）、`label`（深灰藥丸＋白字＋黑框）、`mark`（黃色螢光底）、
`badge`（灰圓標）、`nav`（list-style）、`in`。

**光加 `.hw-v7` 前綴提高權重沒有用**——v7 這幾條規則本身沒宣告 `background`，
沒有競爭對手，主題的值直接生效。必須**明確歸零**。

解法兩層：
1. 全部 82 個選擇器加 `.hw-v7` 前綴（權重 0-2-0 打贏主題 0-1-0，順便杜絕外洩）
2. 檔案最前面加一段「撞名歸零」，把主題會注入的屬性清乾淨；
   放最前面是刻意的，這樣 v7 自己的宣告仍會覆蓋回來

實測（`test_embed.html` 直接載入真實主題 CSS `theme_common.css`）：

| 元素 | 結果 |
|---|---|
| `.progress` | background 透明、radius 0、height auto、overflow visible ✅ |
| `.label` | 背景透明、字色回到 v7 的 #786C69 ✅ |
| `.mark` | 黃底消失 ✅ |
| `#pin` sticky | 捲到 stage 60% 時 top = 0 ✅ |

CSS 完整性：222 → 225 條規則（+3 為新增的歸零與 button reset），
括號平衡、keyframes 未被誤加前綴、`:root` 變數保留，
217 條原始宣告原封不動，只有 5 條是刻意改的
（`html{scroll-behavior}` ×2、`body`、`button`、`#loader`）。

`theme_common.css` 是抓下來的主題樣式，只給本機測試用，不要上傳。

### 之後再遇到樣式被主題吃掉

1. 抓主題 CSS：`curl -s https://www.heiweibeauty.com | grep -oE 'https://cdn.shoplineapp.com/assets/[a-z_]*common[^"]*\.css'`
2. `grep -oE '\.你的class\s*\{[^}]*' 主題.css` 看它注入什麼
3. 在「撞名歸零」那段補上該屬性

### 2026-08-28 刪除兩個區塊

依老闆要求移除：
1. **品牌數字**（10年／14天／2,000萬）—— 整個 `<section id="about">`
2. **v7 自己的頁尾** —— 整個 `<footer>`，避免跟商店頁尾疊成兩個

一併清掉 14 條只服務這兩段的 CSS（`.stats*`、`footer`、`.f-grid`／`.f-about`／`.f-col`／`.f-base`）。
`#about` 錨點只被要刪的頁尾連結引用，刪完沒有孤兒連結。

**沒有連帶壞掉的原因：**
- JS 完全沒引用 `footer` 或 `#stats`
- 數字跑動走 `IntersectionObserver` 對 `.rise` 找 `[data-to]`，
  用的是 `querySelectorAll?.()`，目標消失只是跑空陣列，不會報錯
- ⚠️ `.beat`（四段文案的捲動區間）**也用 `data-to`**，但 `.beats` 不是 `.rise`，
  不會被 observe，所以文案不會被數字動畫覆寫。之後若要把 `.rise` 加到 `.beats` 上要當心這點
- `countUp()` 現在沒有目標了，屬於死碼。刻意留著，之後想加回數字區塊直接用

**版面收尾：** v7 現在結束在「全系列」的亮底段（`sec-light`），
接著就是商店自己的頁尾——若商店頁尾照配色建議改成深炭 `#131011`，
銜接會是 亮底 → 深炭，剛好是自然的收尾。

### 2026-08-29 深淺跳色

把三段從深底改成亮底，讓捲動過程有明暗節奏：

| # | 段落 | 標題 | 底色 |
|---|---|---|---|
| — | hero / pin | 光的一天 | 深 `#131011` |
| 1 | features | 一支要做完的四件事 | **亮 `#F6F2EE`** |
| 2 | uv | 你以為的安全時間，其實不安全 | 深 `#1B1618` |
| 3 | ingredients | 不只擋光，還在養 | **亮 `#F6F2EE`** |
| 4 | ranking | 熱銷排行 | **亮 `#EDE7E1`**（較深的紙色） |
| 5 | concerns | 你想解決哪種肌膚問題 | 深 `#1B1618` |
| 6 | catalog | 和你為肌膚之美而生 | 亮 `#F6F2EE` |

ranking 用 `sec-light-2`（紙色深一階）是因為它的卡片本來就是 `--paper`，
底色若同色卡片會融進背景；深一階才浮得出來。

**光改 class 不夠**：`sec-light` 只換了 section 底色與主文字，段落內部的
格線／卡片底／次要文字原本都吃深底專用色（`--line-dark`／`--night`／`--on-night-*`），
在亮底上會直接消失。所以配了一整組 `.sec-light` 內的覆寫，包含：

- `.feats`／`.ing` 的格線與卡片底 → `--line-light`／`--paper`
- 次要文字 → `--ink-soft`／`--ink-mute`
- **`.feats .en` 與 `.ing .mark` 的淺粉 `#EFC4D2` → 深粉 `#C4657F`**
  （淺粉在亮底上只有 1.2:1，等於看不見）
- `.spec-strip` 的三條分隔線與 dt

驗證方式：Chrome headless 在這台機器不穩（會卡住不輸出），改用靜態分析——
掃出 CSS 裡所有使用深底專用色的規則，比對三個亮底段內實際出現的 class，
確認每一條都有對應覆寫。結果：需要覆寫的 13 條全部有，其餘是不在亮底範圍的誤報
（loader、底部時間軸、仍為深底的 concerns 段）。

⚠️ ingredients 與 ranking 相連、兩段都亮，靠紙色差一階做區隔。
若實際看起來覺得亮的區塊太長，把 ranking 改回 `sec-dark` 即可
（它的卡片是亮的，深底反而更跳）。

## ⚠️ 上線版：`shopline_v7_bn.html`（9/1 13:39 定版）

使用者 2026-09-17 確認：Shopline 首頁橫幅用的是這支。手機不放大、不轉向、產品上移 42px（`margin-bottom:84px`）。
`shopline_v7_bn_0831昨天版.html` 手機會放大＋轉向，**不是上線版**；`shopline_v7_bn_0917.html` 以 0831 誤為底，**作廢**。
要改上線橫幅一律從 `shopline_v7_bn.html` 複製。

## （作廢）0917 手機修正版：`shopline_v7_bn_0917.html`

以 `shopline_v7_bn_0831昨天版.html` 為底，只改兩處，其餘逐字相同：

1. **開頭黑屏** — 根因有兩層：`#loader` 是 `position:absolute; inset:0`，但 `.hw-v7` 高 600vh，
   所以字標與進度條被放到 300vh 下面，頂端只看到一片黑；而且原本要等 101 張影格全到（或 4 秒逾時）
   才開場，逾時那一刻第 0 張若還沒到，`draw(0)` 靜默失敗、畫布一直空白，要等使用者捲動才補畫。
   → loader 改成只蓋第一個畫面（`height:100svh`）；**第 0 張一到就開場**；之後任何影格到手時
   若正是目前需要的（`wantFrame`）就立刻補畫。
2. **開蓋時產品貼上緣** — 手機影格從第 26 張起內容從畫布 1% 處開始。新增 `DROP_M = 44`（px），
   手機整支產品**固定**往下放 44px，是常數、不隨捲動變化（第一版做成開蓋段漸進下移，
   使用者實機看起來像整個畫面在跑，已改掉）。p=0 產品下緣在畫布 82%，下移後仍離「of Light」很遠。
   要調高低只改 `DROP_M`。
   ⚠️ 取捨：往下 44px 後，第一段文案的「06:00 — 晨光」時間標會壓在產品底部；
   但 0831 版在放大峰值（p .42–.70）本來就已經壓到，文字在最上層仍可讀。

驗證方式（headless Chrome 不吃 scrollTo，用位移外框模擬捲動）：把整段包在
`<div style="position:absolute;top:-1300px">` 裡再截 390×844，pinCheck 會自動切到 JS 後備模式。
