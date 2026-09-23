# HEIWEI v5 —「光的一天」捲軸驅動版

爆白潤色防曬棒為主軸的新版官網。**與 `heiwei-website-v2/` 的 index / v3 / v4 完全獨立，未動到任何原檔。**

## 本機預覽

必須用 http 開，直接雙擊 `index.html`（file://）會被瀏覽器擋掉影格載入。

```bash
cd heiwei-website-v5
python3 -m http.server 8899
# → http://127.0.0.1:8899
```

## 素材來源與轉檔

原始檔來自 Google Drive 資料夾「給山姆」（2026-07-16）：

| 來源 | 內容 |
|---|---|
| `防曬棒動畫S3_DeMain.mov` | 179 MB，qtrle / ARGB / 1080×1920 / 30fps / 101 影格 / 3.37 秒 |
| `S3.zip` | 同一段動畫的 PNG 影格序列，101 張，帶 alpha，命名連續無跳號 |

實際採用 `S3.zip`（MOV 只用來驗規格）。轉檔流程：

1. 量測全 101 張的 alpha 聯集 bbox = `(340, 111, 740, 1595)`，
   左右邊界在每一張都相同 → **相機全程靜止、產品水平中心正好在畫面中心**，
   因此可以直接當捲軸序列用。
2. 裁切到 `(320, 91, 760, 1615)`（聯集 + 20px 緩衝）= 440×1524，
   丟掉原本 71% 的透明空白。
3. 輸出兩套 WebP：
   - `d_0000.webp`–`d_0100.webp` — 440×1524，q82，桌機用，**2.2 MB**
   - `m_0000.webp`–`m_0100.webp` — 264×914，q76，手機用，**1.1 MB**

重跑轉檔（來源 PNG 需在手邊）：

```bash
# 裁切
python3 -c "
from PIL import Image; import glob
for i,f in enumerate(sorted(glob.glob('S3/*.png'))):
    im=Image.open(f).convert('RGBA').crop((320,91,760,1615))
    im.save(f'crop/d_{i:04d}.png')
    im.resize((264,914), Image.LANCZOS).save(f'crop/m_{i:04d}.png')
"
# 壓縮
for f in crop/d_*.png; do cwebp -q 82 -alpha_q 90 "$f" -o "assets/stick/$(basename $f .png).webp"; done
for f in crop/m_*.png; do cwebp -q 76 -alpha_q 85 "$f" -o "assets/stick/$(basename $f .png).webp"; done
```

## 設計概念

**捲軸 = 一天的光。** 背景光暈隨捲動從晨光（左下暖橘）→ 正午（頂端淡金，最亮）
→ 黃昏（右下玫瑰），同時產品開蓋、旋出膏體、底部海綿分離。四段文案對應
06:00 / 09:00 / 12:00 / 16:00，把「一支防曬棒陪你過完一天」講完。

深色底是刻意的：alpha 去背的粉色產品在暗底上最跳，而且呼應「光」的主題。
型錄區換成亮底，因為 Shopline 的商品圖是白底拍攝，放暗底會出現白方塊。

## 技術要點

- 影格用 `<canvas>` 繪製，`position:sticky` 釘住，捲動距離 520vh
- 全部影格先預載（含進度條），4 秒逾時保險放行
- 桌機 / 手機依 `matchMedia` 自動選 `d_` 或 `m_` 序列
- `prefers-reduced-motion` 時取消釘住、直接顯示最終影格與全部文案
- 型錄商品資料與 Shopline 圖庫 ID 沿用 `heiwei-website-v2/index-v4.html`

## 已驗證

1440×900、1440×720、390×844（2x）三種視窗：無 JS 錯誤、無橫向溢出、
導覽列進亮段自動換色、UV 時光機互動正常。
