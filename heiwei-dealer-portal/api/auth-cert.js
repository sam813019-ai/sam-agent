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
  const { name, contract_no, start_date } = req.query;
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
