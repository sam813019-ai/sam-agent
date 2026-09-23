# 團購顧客 CRM V1 — 資料與腳本存檔（2026-09-07）

從暫存區搬出來的完整工作檔，重開機不會遺失。V2 時直接沿用，不必重抓 API（重抓約 1 小時）。

## data/ — 各團客戶與完整購買歷史（抓自 Shopline Open API）
| 檔案 | 內容 |
|---|---|
| `chenling.json` | 陳綾團 427 位 |
| `yb.json` | Yboutique 兩檔 1,401 位（含 sid 可分辨 5 月／8 月檔） |
| `coco.json` | COCO 團 1,539 位 |
| `tonglin.json` | 桐林團 955 位 |
| `stella.json` | Stella 團 33 位 |
| `pinxin_repeat.json` | 品馨團 142 位（hist 為 list 格式，其餘為 dict） |
| `cross_items.json` | 品馨團 13 位跨團客戶的前後團品項明細 |

資料截止：2026-09-04。V2 要更新請重跑 `scripts/shopline/team_fetch.py`。

## html/ — 各報告的 HTML 原稿
`crm.html` 是所有報告的 **CSS 來源**，其他 builder 腳本會從它讀樣式，不要刪。
改版型改這一份即可（`pinxin_reports.py` 產生）。

## 產 PDF 的方式
```bash
python3 scripts/shopline/<team>_report.py <html所在目錄>
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer --print-to-pdf="docs/檔名.pdf" "file:///絕對路徑/xxx.html"
```

## 對應的腳本（在 scripts/shopline/）
`team_fetch.py` 抓團 → `<team>_report.py` 產 HTML → Chrome headless 轉 PDF
`tag_crm_v1.py` 上 V1 標籤（可 --dry-run）／`scan_order_sources.py` 找新團 source_id

## 成品 PDF 在 docs/
總方案 V1、陳綾、Yboutique、COCO、桐林、Stella、品馨（CRM 版＋團主版）、團購顧客標籤報告
