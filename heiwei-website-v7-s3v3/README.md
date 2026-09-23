# HEIWEI v7 橫幅・S3v3 加光源素材版

**建立：2026-09-22**　狀態：**預覽中，尚未上線**。上線版仍是 `heiwei-website-v7/shopline_v7_bn.html`（9/1 定版），
本資料夾任何檔案都沒有動到 v7。

## 檔案

| 檔案 | 用途 |
|---|---|
| `shopline_v7_bn_s3v3.html` | 要貼進 Shopline「客製化語法」元件的成品。從上線版逐字複製，只改影格來源（見下） |
| `test_embed_s3v3.html` | 本機模擬 Shopline 環境（載入 v7 的 `theme_common.css`）。預設讀本機 `assets/stick-v3/`，網址加 `#remote` 改讀 Vercel |
| `assets/stick-v3/` | 新影格：`d_0000–0100.webp` 440×1524 q82（桌機）＋ `m_0000–0100.webp` 264×914 q76（手機），202 張 |

## 與上線版的差異（只有這些）

1. `FRAME_BASE` → `https://heiwei-v7-frames.vercel.app/stick-v3/`（舊 `stick/` 原封不動，兩套並存）
2. 新增 `FRAME_FIRST` 常數（現為 `0`）：9/22 上午廠商 `S3v3加光源.zip` 只交 0014–0100，下午
   `防曬棒動畫S3v3加光源_DeMain_0000.zip` 補齊 0000–0014，現已 **101 張完整**、與上線版時間軸一格對一格。
   若日後再換素材缺前段，把 `FRAME_FIRST` 設成第一張可用的編號，`draw()` 會把更早的影格夾到那一張。

## 素材驗證（2026-09-22）

- 1080×1920 RGBA、101 張 alpha 聯集 bbox = `(340,111,740,1595)`，**與舊 S3 完全相同** → 相機沒動、裁切框沿用 `(320,91,760,1615)`。
- 同編號影格動作一致（0014 對 0014），只差光源：右側多一道暖光、膏體與海綿色溫較暖。
- 補交的 0000–0013 邊界與舊 S3 相同（閉合 top 604 → 第 14 張 296）。

## 轉檔指令

```python
from PIL import Image
im = Image.open(png).convert('RGBA').crop((320,91,760,1615))
im.save(f'd_{n:04d}.webp','WEBP',quality=82,method=6)
im.resize((264,914),Image.LANCZOS).save(f'm_{n:04d}.webp','WEBP',quality=76,method=6)
```

## 圖床

`/Users/mac/Downloads/sam-agent/heiwei-v7-frames/stick-v3/`（同一個 Vercel 專案加一個子資料夾，`vercel.json` 一併加了一年快取）。
重新部署：`cd heiwei-v7-frames && vercel deploy --prod --yes`

## 本機預覽

```
cd heiwei-website-v7-s3v3 && python3 -m http.server 8898
```
開 `http://localhost:8898/test_embed_s3v3.html`（必須用 http，file:// 擋影格）。
