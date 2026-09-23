/* ============================================================
   振太機械 — 共用產品 UI 邏輯（依賴 jt-data.js，無 three.js）
   兩頁共用：index.html、products.html
   ============================================================ */
let jtAnimId = null;  // GLB 動畫已移除，保留 null 以相容既有守衛


// ── 資料 / i18n 來自 jt-data.js（共用單一資料源）──
const imgURL = window.imgURL;  // JT_DATA / JT_DESC 已是 jt-data.js 的全域常數，直接使用
const nm = (o) => (o && (o[window.LANG] != null ? o[window.LANG] : o.zh)) || '';  // 取當前語言名稱
// three.js 檢視器變數（GLB 用，目前無產品使用，但函式有引用）

// 判斷單品顯示模式
function jtMode(p) {
  if (p.items) return 'group';
  if (p.frames) return '360';
  if (p.img && p.img.length) return 'png';
  return 'empty';
}

// ── Render product grid ──
window.jtRenderProducts = function(seriesSlug) {
  window.jtCurrentSeries = seriesSlug;
  const grid = document.getElementById('jt-prod-grid');
  const list = JT_DATA.filter(p => p.series === seriesSlug);
  if (!list.length) { grid.innerHTML = `<div class="jt-grid-loading">${window.T('no_in_series')}</div>`; return; }
  const total = list.length;
  grid.innerHTML = list.map((p, i) => {
    const mode = jtMode(p);
    const tag = mode === 'group' ? `${window.T('tag_set')} ×${p.items.length}` : mode === '360' ? window.T('tag_360') : mode === 'png' ? window.T('tag_photo') : window.T('tag_soon');
    const foot = mode === 'group' ? window.T('view_set') : mode === '360' ? window.T('view_3d') : mode === 'png' ? window.T('view_photo') : window.T('coming');
    const pcImg = jtCardThumb(p);
    return `
    <div class="prod-card" onclick="jtOpenModal(${p._i})">
      ${pcImg}
      <div class="pc-grad"></div>
      <span class="idx-no">[${String(i+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}]</span>
      <div class="pc-top"><div class="mdl">${tag}</div></div>
      <div class="pc-bot">
        <h5>${nm(p)}</h5>
        <div class="en">${window.LANG === 'en' ? '' : p.en}</div>
        <div class="foot"><span>${foot}</span><span class="arr">→</span></div>
      </div>
    </div>`;
  }).join('');
};

// 卡片 hover 浮現圖：群組用第一個子項的圖；單品用第一張圖；無圖則無
function jtCardThumb(p) {
  let rel = null;
  if (p.items) { const f = p.items.find(it => it.img && it.img.length); rel = f ? f.img[0] : null; }
  else if (p.img && p.img.length) rel = p.img[0];
  if (rel) {
    return `<div class="pc-img"><img src="${imgURL(p.series, rel)}" loading="lazy" alt="" onerror="this.closest('.pc-img').remove()"></div>`;
  }
  return '';
}

// ── Open modal ──
const $jt = id => document.getElementById(id);
let jtCurrentImgs = [];

function jtModalOpen() {
  const m = $jt('jt-modal');
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

window.jtOpenModal = function(i) {
  const p = JT_DATA[i];
  if (!p) return;
  jtModalOpen();
  if (p.items) jtShowGroup(p);
  else jtShowSingle(p, null);
};

// 下鑽：群組 → 單一子項
window.jtOpenSub = function(gi, si) {
  const p = JT_DATA[gi];
  if (!p || !p.items || !p.items[si]) return;
  jtShowSingle({ ...p.items[si], series: p.series }, gi);
};

// 產品說明 HTML（依 LANG 查 JT_DESC）
function jtDescHTML(zhKey) {
  const d = (JT_DESC[zhKey] || {})[window.LANG] || (JT_DESC[zhKey] || {}).zh;
  if (!d || !d.length) return '';
  return '<div class="jt-desc"><div class="jt-desc-title">' + window.T('desc_title') + '</div><ul class="jt-desc-list">'
    + d.map(x => `<li>${x}</li>`).join('') + '</ul></div>';
}
// 系列標籤（三語）
function jtSeriesTag(series) { return window.L(window.I18N.series_label[series]) || ''; }

// 單品畫面（PNG 大圖 或 360°）
function jtShowSingle(obj, backIdx) {
  $jt('jt-modal-group-screen').style.display = 'none';
  $jt('jt-modal-single').style.display = 'grid';
  $jt('jt-modal-series').textContent = jtSeriesTag(obj.series);
  $jt('jt-modal-name-zh').textContent = nm(obj);
  $jt('jt-modal-name-en').textContent = window.LANG === 'en' ? '' : (obj.en || '');
  $jt('jt-modal-bg-text').textContent = 'JENN TAI';
  $jt('jt-modal-badge').innerHTML = '<span>●</span> JENN TAI MACHINE <span>●</span> EST 1985';
  $jt('jt-modal-specs').innerHTML = jtDescHTML(obj.zh);
  const back = $jt('jt-modal-back');
  if (backIdx != null) { back.style.display = 'block'; back.onclick = () => jtOpenModal(backIdx); }
  else back.style.display = 'none';
  jtSetupViewer(obj);
}

// 群組畫面（一次呈現多個子項目）
function jtShowGroup(p) {
  $jt('jt-modal-single').style.display = 'none';
  $jt('jt-modal-group-screen').style.display = 'flex';
  jtStopFrames();
  if (jtAnimId) { cancelAnimationFrame(jtAnimId); jtAnimId = null; }
  $jt('jt-group-series').textContent = jtSeriesTag(p.series);
  $jt('jt-group-name-zh').textContent = nm(p);
  $jt('jt-group-name-en').textContent = window.LANG === 'en' ? '' : (p.en || '');
  $jt('jt-group-desc').innerHTML = jtDescHTML(p.zh);
  $jt('jt-group-grid').innerHTML = p.items.map((it, k) => {
    const rel = it.img && it.img.length ? it.img[0] : null;
    const thumb = rel
      ? `<img src="${imgURL(p.series, rel)}" loading="lazy" alt="" onerror="jtThumbErr(this)"><span class="v3d"${it.frames ? '' : ' style="display:none"'}>360°</span>`
      : `<span class="ph">準備中</span>${it.frames ? '<span class="v3d">360°</span>' : ''}`;
    return `<div class="jt-group-item" onclick="jtOpenSub(${p._i},${k})">
      <div class="jt-group-thumb">${thumb}</div>
      <div class="gz">${nm(it)}</div>
      <div class="ge">${window.LANG === 'en' ? '' : (it.en || '')}</div>
    </div>`;
  }).join('');
}
window.jtThumbErr = function(img) { img.parentElement.innerHTML = '<span class="ph">圖片準備中</span>'; };

// 設定單品左側檢視區
function jtSetupViewer(obj) {
  jtStopFrames();
  if (jtAnimId) { cancelAnimationFrame(jtAnimId); jtAnimId = null; }
  const photo = $jt('jt-modal-photo'), frame = $jt('jt-frame-img'), canvas = $jt('jt-modal-canvas'),
        loading = $jt('jt-modal-loading'), nomodel = $jt('jt-no-model'), hint = $jt('jt-modal-hint'),
        thumbs = $jt('jt-modal-thumbs');
  photo.style.display = 'none'; frame.style.display = 'none'; canvas.style.display = 'none';
  nomodel.style.display = 'none'; loading.classList.add('hidden');
  thumbs.classList.remove('show'); thumbs.innerHTML = ''; hint.textContent = '';
  jtCurrentImgs = (obj.img || []).map(r => imgURL(obj.series, r));

  if (obj.frames) {
    hint.textContent = window.T('drag_rotate');
    jtLoadFrames(obj.frames);           // 360° 影格（會顯示 frame-img）
  } else if (jtCurrentImgs.length) {
    photo.onerror = jtPhotoErr;
    photo.src = jtCurrentImgs[0];
    photo.style.display = 'block';
    hint.textContent = window.T('photo_hint');
    if (jtCurrentImgs.length > 1) {
      thumbs.classList.add('show');
      thumbs.innerHTML = jtCurrentImgs.map((u, k) =>
        `<img src="${u}" class="${k === 0 ? 'active' : ''}" onclick="jtSwapPhoto(${k})" alt="">`).join('');
    }
  } else {
    nomodel.style.display = 'flex';
    $jt('jt-no-model-txt').textContent = window.T('model_prep');
  }
}
window.jtPhotoErr = function() {
  $jt('jt-modal-photo').style.display = 'none';
  $jt('jt-no-model').style.display = 'flex';
  $jt('jt-no-model-txt').textContent = window.T('img_prep');
};
window.jtSwapPhoto = function(k) {
  const photo = $jt('jt-modal-photo');
  photo.style.display = 'block';
  photo.src = jtCurrentImgs[k];
  document.querySelectorAll('#jt-modal-thumbs img').forEach((t, j) => t.classList.toggle('active', j === k));
};

// ── Close modal ──
window.jtCloseModal = function() {
  document.getElementById('jt-modal').classList.remove('open');
  document.getElementById('jt-modal').setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  if (jtAnimId) { cancelAnimationFrame(jtAnimId); jtAnimId = null; }
  jtStopFrames();
};

// ── Frame Animation Viewer ──
const FRAMES_TOTAL = 241;
const FRAME_SENS = 3;
let jtFrameCache = [], jtFrameLoaded = 0, jtFrameAllReady = false;
let jtFrameCurrent = 0, jtFrameAutoTimer = null;
let jtFrameDragging = false, jtFrameLastX = 0, jtFrameAccum = 0;

function jtLoadFrames(baseUrl) {
  jtFrameCache = []; jtFrameLoaded = 0; jtFrameAllReady = false;
  jtFrameCurrent = 0; jtFrameAccum = 0;
  if (jtFrameAutoTimer) { clearInterval(jtFrameAutoTimer); jtFrameAutoTimer = null; }

  const img = document.getElementById('jt-frame-img');
  const overlay = document.getElementById('jt-modal-loading');
  img.style.display = 'block';
  overlay.classList.remove('hidden');
  document.querySelector('#jt-modal-loading span').textContent = window.T('loading') + ' 0%';
  img.src = `${baseUrl}frame_000.webp`;

  for (let i = 0; i < FRAMES_TOTAL; i++) {
    const fi = new Image();
    jtFrameCache[i] = fi;
    fi.onload = () => {
      jtFrameLoaded++;
      const pct = Math.round(jtFrameLoaded / FRAMES_TOTAL * 100);
      const sp = document.querySelector('#jt-modal-loading span');
      if (sp) sp.textContent = window.T('loading') + ` ${pct}%`;
      if (jtFrameLoaded === FRAMES_TOTAL) {
        jtFrameAllReady = true;
        overlay.classList.add('hidden');
        _jtFrameStartAuto();
      }
    };
    fi.src = `${baseUrl}frame_${String(i).padStart(3,'0')}.webp`;
  }

  img.addEventListener('mousedown', _jtFMDown);
  window.addEventListener('mousemove', _jtFMMove);
  window.addEventListener('mouseup', _jtFMUp);
  img.addEventListener('touchstart', _jtFTStart, { passive: false });
  window.addEventListener('touchmove', _jtFTMove, { passive: false });
  window.addEventListener('touchend', _jtFMUp);
}

function jtStopFrames() {
  if (jtFrameAutoTimer) { clearInterval(jtFrameAutoTimer); jtFrameAutoTimer = null; }
  jtFrameDragging = false;
  const img = document.getElementById('jt-frame-img');
  if (img) {
    img.style.display = 'none';
    img.removeEventListener('mousedown', _jtFMDown);
    img.removeEventListener('touchstart', _jtFTStart);
  }
  window.removeEventListener('mousemove', _jtFMMove);
  window.removeEventListener('mouseup', _jtFMUp);
  window.removeEventListener('touchmove', _jtFTMove);
  window.removeEventListener('touchend', _jtFMUp);
}

function _jtFrameShow(n) {
  jtFrameCurrent = ((n % FRAMES_TOTAL) + FRAMES_TOTAL) % FRAMES_TOTAL;
  const c = jtFrameCache[jtFrameCurrent];
  if (c && c.complete) document.getElementById('jt-frame-img').src = c.src;
}
function _jtFrameStartAuto() {
  if (jtFrameAutoTimer) return;
  jtFrameAutoTimer = setInterval(() => {
    if (!jtFrameDragging && jtFrameAllReady) _jtFrameShow(jtFrameCurrent + 1);
  }, 40);
}
function _jtFMDown(e) { e.preventDefault(); jtFrameDragging = true; jtFrameLastX = e.clientX; clearInterval(jtFrameAutoTimer); jtFrameAutoTimer = null; }
function _jtFMMove(e) {
  if (!jtFrameDragging || !jtFrameAllReady) return;
  const dx = e.clientX - jtFrameLastX; jtFrameLastX = e.clientX;
  jtFrameAccum += dx;
  const sh = Math.round(jtFrameAccum / FRAME_SENS);
  if (sh) { _jtFrameShow(jtFrameCurrent - sh); jtFrameAccum -= sh * FRAME_SENS; }
}
function _jtFMUp() { if (jtFrameDragging) { jtFrameDragging = false; _jtFrameStartAuto(); } }
function _jtFTStart(e) { e.preventDefault(); jtFrameDragging = true; jtFrameLastX = e.touches[0].clientX; clearInterval(jtFrameAutoTimer); jtFrameAutoTimer = null; }
function _jtFTMove(e) {
  e.preventDefault();
  if (!jtFrameDragging || !jtFrameAllReady) return;
  const dx = e.touches[0].clientX - jtFrameLastX; jtFrameLastX = e.touches[0].clientX;
  jtFrameAccum += dx;
  const sh = Math.round(jtFrameAccum / FRAME_SENS);
  if (sh) { _jtFrameShow(jtFrameCurrent - sh); jtFrameAccum -= sh * FRAME_SENS; }
}

document.getElementById('jt-modal-close').addEventListener('click', jtCloseModal);
document.getElementById('jt-modal').addEventListener('click', e => { if (e.target === e.currentTarget) jtCloseModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') jtCloseModal(); });

// ── Init Three.js renderer (once) ──


// ── Load GLB ──


// ── Boot ──
jtRenderProducts('feeding-orientation');
window.jtApplyI18n();   // 套用當前語言（含跨頁記憶）

/* ── 分頁切換（四系列）── */
(function () {
  const tabs = document.querySelectorAll('#jt-tabs .tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    window.jtRenderProducts(t.dataset.series);
  }));
})();
