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
    // 首頁 hero 是 31MB 影片，networkidle 永遠不會到；用 load + 固定等待讓 JS 跑完
    await page.goto(`${BASE}/${name}.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
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
