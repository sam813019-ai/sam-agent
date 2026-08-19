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
      if (!li) throw new Error('找不到 .jt-desc-list li，無法驗說明字級');
      const s = await li.evaluate((el) => {
        const c = getComputedStyle(el);
        return { fs: parseFloat(c.fontSize), fw: parseInt(c.fontWeight, 10) };
      });
      if (s.fs < 15.5) throw new Error(`說明字 ${s.fs}px，應 ≥ 15.5`);
      if (s.fw < 500) throw new Error(`說明字重 ${s.fw}，應 ≥ 500`);

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
    name: 'T6 首頁導覽第2項=公司簡介、第3項=最新產品',
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
