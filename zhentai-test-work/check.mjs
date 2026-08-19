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
    name: 'T4 產品卡只留中英名、不含編號（產品頁）',
    page: 'products',
    fn: async (page) => {
      await page.waitForSelector('.prod-card', { timeout: 10000 });
      const has = await page.$eval('.prod-card', (el) => ({
        idx: !!el.querySelector('.idx-no'),
        h5: !!el.querySelector('h5'),
        en: !!el.querySelector('.en'),
      }));
      if (has.idx) throw new Error('編號 .idx-no 應已移除');
      if (!has.h5 || !has.en) throw new Error(JSON.stringify(has));
      const n = await page.$$eval('.prod-card', (els) =>
        els.filter((e) => /\[\s*\d+\s*\/\s*\d+\s*\]/.test(e.innerText)).length);
      if (n) throw new Error(`還有 ${n} 張卡出現 [NN / NN] 編號`);
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
  {
    name: 'T7 公司簡介新結構齊全',
    page: 'index',
    fn: async (page) => {
      const need = ['.ab-hero', '.ab-card', '.ab-more', '.ab-bignum', '.ab-photos',
                    '.ab-ph-1', '.ab-ph-2'];
      for (const sel of need) {
        const n = await page.$$eval(`#about ${sel}`, (els) => els.length);
        if (!n) throw new Error(`缺少 ${sel}`);
      }
    },
  },
  {
    name: 'T7 兩張照片、無圓角、各自獨立 src',
    page: 'index',
    fn: async (page) => {
      const srcs = await page.$$eval('#about .ab-photos img', (els) => els.map((e) => e.getAttribute('src')));
      if (srcs.length !== 2) throw new Error(`照片數 ${srcs.length}，應為 2`);
      if (srcs.some((s) => !s || s.startsWith('/'))) throw new Error(`必須為相對路徑：${srcs.join(', ')}`);
      const radii = await page.$$eval('#about .ab-photos figure',
        (els) => els.map((e) => getComputedStyle(e).borderRadius));
      if (radii.some((r) => r && r !== '0px')) throw new Error(`照片仍有圓角：${radii.join(', ')}`);
    },
  },
  {
    name: 'T7 深色視差覆寫已移除',
    page: 'index',
    fn: async (page) => {
      const bg = await page.$eval('#about', (el) => getComputedStyle(el, '::before').backgroundImage);
      if (bg && bg !== 'none') throw new Error(`#about::before 仍有背景圖 ${bg}`);
      const pColor = await page.$eval('#about .about-col p', (el) => getComputedStyle(el).color);
      if (pColor.includes('255, 255, 255')) throw new Error(`三欄文字仍是白字 ${pColor}`);
    },
  },
  {
    name: 'T7 數據帶已移除、時間軸保留 10 個節點',
    page: 'index',
    fn: async (page) => {
      const stats = await page.$$eval('#about .stats', (els) => els.length);
      if (stats) throw new Error('數據帶 .stats 應已移除');
      const nodes = await page.$$eval('#about .tl-node', (els) => els.length);
      if (nodes !== 10) throw new Error(`時間軸節點 ${nodes} 個，應為 10`);
      const years = await page.$$eval('#about .tl-node .yr', (els) => els.map((e) => e.textContent.trim()));
      const want = ['1985', '2005', '2008', '2011', '2012', '2013', '2014', '2016', '2024', '2025'];
      if (years.join(',') !== want.join(',')) throw new Error(`年份為 ${years.join(', ')}`);
    },
  },
  {
    name: 'T7 大數字 count-up 仍會跑',
    page: 'index',
    fn: async (page) => {
      // observer 門檻 threshold:.4，且 html{scroll-behavior:smooth} 會讓捲動有動畫，
      // 固定等待會 flaky → 改成輪詢等值變化
      await page.evaluate(() => document.querySelector('#about .ab-bignum').scrollIntoView({ block: 'center' }));
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(250);
        const v = await page.$eval('#about .ab-bignum .count', (e) => e.textContent.trim());
        if (v !== '0') return;
      }
      throw new Error('大數字 count-up 10 秒內沒跑');
    },
  },
  {
    name: 'T7 公司簡介文字取自公司簡介 docx',
    page: 'index',
    fn: async (page) => {
      const txt = await page.$eval('#about', (el) => el.innerText);
      const need = [
        '專業生產振動送料機廠商',
        '品質第一',
        '上海振好機械有限公司',
        '嘉興振太機械有限公司',
        '平陽振太責任有限公司',
        '升降式自動上料機',
        '全自動上料平台系統',
      ];
      for (const s of need) if (!txt.includes(s)) throw new Error(`缺少「${s}」`);
    },
  },
  {
    name: 'T7 更多鈕連到 contact.html 且三語有字',
    page: 'index',
    fn: async (page) => {
      const href = await page.$eval('#about .ab-more', (el) => el.getAttribute('href'));
      if (href !== 'contact.html') throw new Error(`href = ${href}`);
      for (const lang of ['zh', 'en', 'vi']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(120);
        const t = await page.$eval('#about .ab-more', (el) => el.innerText.trim());
        if (!t) throw new Error(`${lang} 的更多鈕沒有文字`);
      }
      await page.evaluate(() => window.jtSetLang('zh'));
    },
  },
  {
    name: 'T8 聯絡頁有四張分公司卡',
    page: 'contact',
    fn: async (page) => {
      const n = await page.$$eval('.contact-grid .office', (els) => els.length);
      if (n !== 4) throw new Error(`卡片數 ${n}，應為 4`);
    },
  },
  {
    name: 'T8 四間公司名與電話正確、晨泰已移除',
    page: 'contact',
    fn: async (page) => {
      const txt = await page.$eval('.contact-grid', (el) => el.innerText);
      const need = [
        '振太機械企業股份有限公司', '+886-7-6210108',
        '上海振好機械有限公司', '+86-21-69592750',
        '嘉興振太機械有限公司', '+86-573-84566588',
        '平陽振太責任有限公司', '+84-274-3810082',
        'chentai@jenntai.com.tw', 'zhenhaojixie@vip.126.com',
        'jiaxingjenntai@jenntai.com.cn', 'zhentai118.vn@gmail.com',
      ];
      for (const s of need) if (!txt.includes(s)) throw new Error(`缺少「${s}」`);
      if (txt.includes('晨泰')) throw new Error('晨泰螺絲機械應已移除');
    },
  },
  {
    name: 'T8 tel/mailto 連結可點',
    page: 'contact',
    fn: async (page) => {
      const tels = await page.$$eval('.contact-grid a[href^="tel:"]', (els) => els.length);
      const mails = await page.$$eval('.contact-grid a[href^="mailto:"]', (els) => els.length);
      if (tels < 4) throw new Error(`tel 連結只有 ${tels} 個`);
      if (mails < 5) throw new Error(`mailto 連結只有 ${mails} 個（台灣兩個 + 其餘各一）`);
    },
  },
  {
    name: 'T8 分公司卡三語切換不報錯且英文地址有切',
    page: 'contact',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(150);
      }
      if (errors.length > before) throw new Error('切語言時出現 JS 錯誤：' + errors.slice(before).join(' | '));
      await page.evaluate(() => window.jtSetLang('en'));
      await page.waitForTimeout(200);
      const en = await page.$eval('.contact-grid', (el) => el.innerText);
      if (!en.includes('Kaohsiung')) throw new Error('英文版地址未切換');
      await page.evaluate(() => window.jtSetLang('zh'));
      await page.waitForTimeout(150);
    },
  },
  {
    name: 'T8 手機視窗四張卡不溢出',
    page: 'contact',
    fn: async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(300);
      if (over) throw new Error('390px 下有水平溢出');
    },
  },
  {
    name: 'T9 首頁聯絡區直接顯示四張分公司卡',
    page: 'index',
    fn: async (page) => {
      const n = await page.$$eval('#contact .contact-grid .office', (els) => els.length);
      if (n !== 4) throw new Error(`首頁卡片數 ${n}，應為 4`);
      const txt = await page.$eval('#contact .contact-grid', (el) => el.innerText);
      if (txt.includes('晨泰')) throw new Error('晨泰螺絲機械應已移除');
      for (const s of ['振太機械企業股份有限公司', '上海振好機械有限公司',
                       '嘉興振太機械有限公司', '平陽振太責任有限公司']) {
        if (!txt.includes(s)) throw new Error(`缺少「${s}」`);
      }
    },
  },
  {
    name: 'T9 首頁不再有「查看全部據點」連結',
    page: 'index',
    fn: async (page) => {
      const n = await page.$$eval('#contact .offices-more', (els) => els.length);
      if (n) throw new Error('.offices-more 應已移除');
    },
  },
  {
    name: 'T9b 客製詢價表單已整區移除（首頁）',
    page: 'index',
    fn: async (page) => {
      const n = await page.$$eval('.form-wrap, form, .fld', (els) => els.length);
      if (n) throw new Error(`仍有 ${n} 個表單元素`);
      const txt = await page.$eval('#contact', (el) => el.innerText);
      for (const kw of ['客製詢價', 'Inquiry Form']) {
        if (txt.includes(kw)) throw new Error(`仍出現「${kw}」`);
      }
    },
  },
  {
    name: 'T9b 客製詢價表單已整區移除（聯絡頁）',
    page: 'contact',
    fn: async (page) => {
      const n = await page.$$eval('.form-wrap, form, .fld', (els) => els.length);
      if (n) throw new Error(`仍有 ${n} 個表單元素`);
      const txt = await page.$eval('#contact', (el) => el.innerText);
      for (const kw of ['客製詢價', 'Inquiry Form']) {
        if (txt.includes(kw)) throw new Error(`仍出現「${kw}」`);
      }
    },
  },
  {
    name: 'T9b 詢價按鈕與 modal CTA 仍指向有效目標',
    page: 'products',
    fn: async (page) => {
      const cta = await page.$eval('.jt-modal-cta', (el) => el.getAttribute('href'));
      if (cta !== 'contact.html') throw new Error(`modal CTA href = ${cta}`);
      const nav = await page.$$eval('nav a.btn, nav .nav-cta a.btn', (els) =>
        els.map((e) => e.getAttribute('href')));
      if (!nav.some((h) => h && h.includes('contact.html')))
        throw new Error(`導覽詢價鈕 href = ${nav.join(', ')}`);
    },
  },
  {
    name: 'T10 三語切換全站無 JS 錯誤（首頁）',
    page: 'index',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(250);
      }
      if (errors.length > before) throw new Error(errors.slice(before).join(' | '));
    },
  },
  {
    name: 'T10 三語切換全站無 JS 錯誤（產品頁）',
    page: 'products',
    fn: async (page, errors) => {
      const before = errors.length;
      for (const lang of ['en', 'vi', 'zh']) {
        await page.evaluate((l) => window.jtSetLang(l), lang);
        await page.waitForTimeout(250);
      }
      if (errors.length > before) throw new Error(errors.slice(before).join(' | '));
    },
  },
  {
    name: 'T10 360° 產品影格能載入完成（遮罩會消失）',
    page: 'products',
    fn: async (page) => {
      // jtShowSingle(i) 的 i 不是 JT_DATA 索引，要直接呼叫 jtSetupViewer(產品物件)
      const started = await page.evaluate(() => {
        const target = JT_DATA.find((p) => p.frames);
        if (!target) return false;
        jtSetupViewer(target);
        return true;
      });
      if (!started) throw new Error('JT_DATA 找不到有 frames 的產品');
      for (let i = 0; i < 80; i++) {
        await page.waitForTimeout(500);
        const done = await page.evaluate(() => {
          const m = document.querySelector('#jt-modal-loading');
          return !m || getComputedStyle(m).display === 'none' || getComputedStyle(m).opacity === '0';
        });
        if (done) return;
      }
      const txt = await page.$eval('#jt-modal-loading span', (e) => e.textContent).catch(() => '(無)');
      throw new Error(`40 秒內遮罩沒消失，停在「${txt}」`);
    },
  },
  {
    name: 'T10 三頁桌機與手機皆無水平溢出',
    page: 'index',
    fn: async (page) => {
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(500);
        const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (over) throw new Error(`${w}px 下有水平溢出`);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(200);
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
