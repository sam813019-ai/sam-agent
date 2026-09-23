// Vercel serverless function — 生成個人化授權書 PDF
const { PDFDocument, rgb, StandardFonts, TextRenderingMode } = require('pdf-lib');
const _fontkit = require('@pdf-lib/fontkit');
const fontkit  = _fontkit.default || _fontkit;
const fs   = require('fs');
const path = require('path');

// 本地字型：api/fonts/NotoSansTC.otf（繁體中文 Variable TTF）
const FONT_PATH = path.join(__dirname, 'fonts', 'NotoSansTC.otf');

let _fontCache = null;

function loadFont() {
  if (_fontCache) return _fontCache;
  _fontCache = fs.readFileSync(FONT_PATH);
  return _fontCache;
}

module.exports = async function handler(req, res) {
  const { name, contract_no, start_date, tax_id, owner } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    // 讀取基底 PDF
    const pdfPath   = path.join(process.cwd(), '何謂美_爆白經銷證書.pdf');
    const baseBytes = fs.readFileSync(pdfPath);

    // 載入字型
    const fontBytes = loadFont();

    // 初始化 pdf-lib
    const pdfDoc    = await PDFDocument.load(baseBytes);
    pdfDoc.registerFontkit(fontkit);
    const cjkFont   = await pdfDoc.embedFont(fontBytes);                    // 繁體中文（名字用）
    const latinFont = await pdfDoc.embedFont(StandardFonts.Helvetica);      // ASCII（合約號、日期用）

    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const DARK = rgb(0.1, 0.1, 0.1);

    // ── 有效期間計算 ──────────────────────────────
    const start = start_date ? new Date(start_date) : new Date();
    const end   = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    const fmt = d =>
      `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
    const dateRange = `${fmt(start)} - ${fmt(end)}`;

    // ── 1. 代理名稱（置中，粗體，橫線上方白底區域）──
    const nameSize = 20;
    const nameW    = cjkFont.widthOfTextAtSize(name, nameSize);
    page.drawText(name, {
      x:             (width - nameW) / 2,
      y:             height * 0.485,
      size:          nameSize,
      font:          cjkFont,
      color:         DARK,
      renderingMode: TextRenderingMode.FillAndStroke,
      strokeColor:   DARK,
      lineWidth:     0.5
    });

    // ── 2. 合約字號（Helvetica，無間距問題）─────────
    if (contract_no) {
      page.drawText(contract_no, {
        x:    width * 0.265,
        y:    height * 0.397,
        size: 11,
        font: latinFont,
        color: DARK
      });
    }

    // ── 3. 有效期間 ───────────────────────────────
    page.drawText(dateRange, {
      x:    width * 0.265,
      y:    height * 0.370,
      size: 11,
      font: latinFont,
      color: DARK
    });

    // ── 4. 統一編號 / 負責人（選填，基底 PDF 無標籤，需自行畫）──
    // 座標對齊基底 PDF 的「合約字號：」「有效期間：」兩行：
    // 標籤冒號右緣 x≈0.2321W、行距 0.0262H、值起點 x=0.265W
    const LABEL_SIZE  = 11;
    const LABEL_RIGHT = width * 0.2321;
    const LINE_GAP    = height * 0.0262;
    let   nextY       = height * 0.370 - LINE_GAP;   // 接在「有效期間」下一行

    // 基底 PDF 的標籤字重較粗；pdf-lib 1.17 的 renderingMode/strokeColor 在 drawText
    // 沒有作用，因此用多次微位移疊印做出加粗效果。
    const BOLD_OFFSET = 0.2;
    const drawCJK = (text, x, y) => {
      for (const [dx, dy] of [[0,0], [BOLD_OFFSET,0], [0,BOLD_OFFSET], [BOLD_OFFSET,BOLD_OFFSET]]) {
        page.drawText(text, { x: x + dx, y: y + dy, size: LABEL_SIZE, font: cjkFont, color: DARK });
      }
    };

    const drawExtraLine = (label, value, isCJKValue) => {
      if (!value) return;
      drawCJK(label, LABEL_RIGHT - cjkFont.widthOfTextAtSize(label, LABEL_SIZE), nextY);
      if (isCJKValue) {
        drawCJK(value, width * 0.265, nextY);
      } else {
        page.drawText(value, {
          x: width * 0.265, y: nextY, size: LABEL_SIZE, font: latinFont, color: DARK
        });
      }
      nextY -= LINE_GAP;
    };

    drawExtraLine('統一編號：', tax_id, false);   // 統編為數字，用 Helvetica
    drawExtraLine('負責人：',   owner,  true);

    // ── 輸出 PDF ──────────────────────────────────
    const outBytes = await pdfDoc.save();
    const safeName = name.replace(/[^一-鿿㐀-䶿\w]/g, '_');
    const filename = `何謂美_授權書_${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(outBytes));

  } catch (err) {
    console.error('[auth-cert]', err.message);
    res.status(500).json({ error: 'PDF generation failed', detail: err.message });
  }
};
