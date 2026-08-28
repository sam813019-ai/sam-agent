/**
 * ASCRS Barrett Toric Calculator — 寫值可行性實測
 *
 * 這支才是真正驗證「第 4 段技術風險」的腳本。
 * 它用 content script 未來會用的同一套手法試填一個欄位，
 * 然後回報框架有沒有真的「吃下去」。
 *
 * 用法：在計算器頁面 Console 貼上執行，然後【用眼睛看畫面】欄位有沒有變。
 * 只填測試值，不會按 Calculate、不會送出。
 */
(() => {
  // 這是繞過 React/Vue 受控元件的標準手法：
  // 直接呼叫原生 value setter，跳過框架覆寫的 setter，再手動派發事件讓框架同步 state。
  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
                : el instanceof HTMLSelectElement   ? HTMLSelectElement.prototype
                : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    const ownSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    if (setter && ownSetter !== setter) setter.call(el, value);
    else el.value = value;
  };

  const fireAll = el => {
    el.dispatchEvent(new Event('focus',  { bubbles: true }));
    el.dispatchEvent(new Event('input',  { bubbles: true }));   // React / Vue
    el.dispatchEvent(new Event('change', { bubbles: true }));   // Angular / 原生 / jQuery
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: '0' })); // 老式 keyup 監聽
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  };

  const results = [];
  const targets = [...document.querySelectorAll('input[type=text], input[type=number], input:not([type])')]
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.disabled && !el.readOnly;
    })
    .slice(0, 6); // 只測前 6 個可見欄位，夠判斷了

  if (!targets.length) {
    console.warn('❌ 找不到可見的文字輸入欄位 — 計算器可能在 iframe 裡，或還沒切到正確頁籤');
    return;
  }

  targets.forEach((el, i) => {
    const before = el.value;
    const testVal = '42.42';
    setNativeValue(el, testVal);
    fireAll(el);

    // 給框架一點時間跑 re-render
    const domOk = el.value === testVal;
    results.push({
      idx: i,
      id: el.id || el.name || `(no id) ${el.className}`.slice(0, 40),
      label: el.getAttribute('aria-label') || el.placeholder || '',
      before,
      afterImmediate: el.value,
      acceptedImmediately: domOk,
    });
  });

  // 100ms 後再檢查一次 — 受控元件如果沒同步 state，會把值「彈回去」
  setTimeout(() => {
    results.forEach((r, i) => {
      const el = targets[i];
      r.afterDelay = el.value;
      r.revertedByFramework = r.acceptedImmediately && el.value !== '42.42';
      r.VERDICT = r.revertedByFramework ? '🔴 被框架還原（需要更深的注入手法）'
                : el.value === '42.42'   ? '🟢 寫入成功且保持住'
                : '🟡 沒寫進去（選擇器或事件不對）';
    });
    console.table(results);
    const ok = results.filter(r => r.VERDICT.startsWith('🟢')).length;
    console.log(`%c結論：${ok}/${results.length} 個欄位寫入成功`,
      `font-size:14px;font-weight:bold;color:${ok === results.length ? 'green' : 'orange'}`);
    console.log('👉 現在【用眼睛看畫面】：欄位上是不是真的顯示 42.42？如果畫面沒變但上表說成功，代表框架 state 沒同步。');
    try { copy(JSON.stringify(results, null, 2)); console.log('✅ 已複製結果'); } catch (e) {}
  }, 300);

  console.log('⏳ 300ms 後輸出結果…');
})();
