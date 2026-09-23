# 振太網站 360° 旋轉檢視批次升級 — 設計

日期：2026-06-24
範圍：products.html 21 個產品從 2D 單圖升級成 360° 拖曳旋轉檢視

## 背景

products.html 已有一套可拖曳旋轉的 360° 影格檢視器（`jtLoadFrames`），目前只有篩選系列「羅拉篩選機(兩軸)」上線（241 張 webp，路徑 `/wp-content/uploads/zhentai/frames_webp/`，檔名 `frame_000.webp`…`frame_240.webp`）。

使用者提供 Drive「2026 360」共用資料夾，內含 23 個產品的旋轉影格序列。下載到 `振太網站/360/`（23 個 zip）。經抽查：**每包皆 241 張，命名 `產品_Main_0000.png`…`_Main_0240.png`（4 位、0-indexed），與羅拉伺服器端 `frame_000–240.webp` 完全對齊。**

## 決策

- **不改檢視器邏輯**：張數全為 241，`FRAMES_TOTAL=241` 與 `frames` 字串 base URL 維持原樣，零程式風險。
- **每產品一個 ASCII slug 子夾**：`/wp-content/uploads/zhentai/frames_webp/<slug>/`，避免中文檔名在連載迴圈踩編碼雷。
- **羅拉(兩軸)維持現有 flat 路徑不動**（已上線）→ 23 包裡「羅拉(兩軸)」那包**跳過不傳**。
- **階梯式送料機暫緩**（使用者待與客戶確認）→ 不在本批。
- 本批共 **21 個產品**。

## 轉檔流程（逐產品，控制磁碟）

1. 解壓單一 zip 到 tmp（中文內層資料夾）。
2. Python 讀出 PNG 清單（以位元組處理檔名避編碼問題），依 `_Main_NNNN` 數字排序。
3. 重新命名/連結成乾淨序列 → 一次 ffmpeg image2 轉 `frame_%03d.webp`（`libwebp -q:v 82`，contain 原圖，對齊羅拉 ~50KB 畫質基準）。
4. 輸出到 `振太網站/frames_out/<slug>/frame_000.webp`…
5. 刪除解壓出的 PNG（省空間）。

對應：`_Main_0000.png → frame_000.webp` … `_Main_0240.png → frame_240.webp`（去前綴、4 位降 3 位）。

## 上傳

沿用 Novamira execute-php base64 分塊寫絕對路徑（`/srv/htdocs/wp-content/uploads/zhentai/frames_webp/<slug>/`），逐檔驗 filesize、0 失敗。分批跑（21×241 ≈ 5000 張）。

## JT_DATA 變更

定義 `const FB = '/wp-content/uploads/zhentai/frames_webp/';`，21 個產品（含子項）各加 `frames: FB+'<slug>/'`。卡片 360° 標籤由既有 `productMode()` 自動帶出，免改。

## Slug 對照表

| 產品 | series | slug |
|---|---|---|
| 升降式自動定量上料機 | replenishing | elevator-conveyor |
| 填充式上料機 | replenishing | filling-feeder |
| 磁力式上料機 | replenishing | magnetic-feeder |
| 提升機+兩段式補料 | replenishing | lifter-two-stage |
| 料桶翻料機 | replenishing | tilt-loader |
| 平送式補料桶 | replenishing | linear-hopper |
| 活動連接式補料桶 | replenishing | connectable-hopper |
| 偏心馬達補料桶 | replenishing | eccentric-hopper |
| 平送式鐵屑、油水分離機 | sorting | linear-scrap-sep |
| 磁力式鐵屑、油水分離機 | sorting | magnetic-scrap-sep |
| 離心甩油鐵屑分離機 | sorting | centrifugal-scrap-sep |
| 羅拉篩選機(四軸) | sorting（子項） | roller-4axis |
| 渦電流送料裝置 | feeding-orientation | eddy-current |
| 隔音箱 | feeding-orientation | soundproof-case |
| JL-0 / JL-1 / JL-2 | feeding-orientation（子項） | jl-0 |
| ML-2 | feeding-orientation（子項） | ml-2 |
| 補料桶用 ML-3 | feeding-orientation（子項） | ml-3 |
| ML-8 | feeding-orientation（子項） | ml-8 |
| STL-6 / STL-7 | feeding-orientation（子項） | stl-6 |
| STL-12 | feeding-orientation（子項） | stl-12 |
| 矯直機 | machinery | straightening |

## 驗收

- 每 slug 子夾線上 241 張 webp，filesize 與本機一致。
- products.html 21 產品卡片顯示 360° 標籤，點開可拖曳旋轉、自動旋轉、loading 正常。
- 其餘產品維持 2D 不變。
