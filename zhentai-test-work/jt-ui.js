/* ============================================================
   振太機械 — 共用產品 UI 邏輯（依賴 jt-data.js，無 three.js）
   兩頁共用：index.html、products.html
   ============================================================ */
let jtAnimId = null;  // GLB 動畫已移除，保留 null 以相容既有守衛


// ── 資料 / i18n 來自 jt-data.js（共用單一資料源）──
const imgURL = window.imgURL;  // JT_DATA / JT_DESC 已是 jt-data.js 的全域常數，直接使用
const nm = (o) => (o && (o[window.LANG] != null ? o[window.LANG] : o.zh)) || '';  // 取當前語言名稱
// three.js 檢視器變數（GLB 用，目前無產品使用，但函式有引用）

function jtEnsureVideo() {
  let video = document.getElementById('jt-modal-video');
  if (!video) {
    video = document.createElement('video');
    video.id = 'jt-modal-video';
    video.className = 'jt-modal-video';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = true;
    video.preload = 'metadata';
    video.style.cssText = 'display:none;width:100%;max-height:440px;background:#111820;object-fit:contain';
    const frame = document.getElementById('jt-frame-img');
    frame.parentElement.insertBefore(video, frame);
  }
  return video;
}

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
  grid.innerHTML = list.map((p) => {
    const pcImg = jtCardThumb(p);
    return `
    <div class="prod-card" onclick="jtOpenModal(${p._i})">
      ${pcImg}
      <div class="pc-grad"></div>
      <div class="pc-bot">
        <h5>${nm(p)}</h5>
        <div class="en">${window.LANG === 'en' ? '' : p.en}</div>
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
    const mediaTag = it.frames ? '360°' : it.video ? 'VIDEO' : '';
    const thumb = rel
      ? `<img src="${imgURL(p.series, rel)}" loading="lazy" alt="" onerror="jtThumbErr(this)">${mediaTag ? `<span class="v3d">${mediaTag}</span>` : ''}`
      : `<span class="ph">準備中</span>${mediaTag ? `<span class="v3d">${mediaTag}</span>` : ''}`;
    return `<div class="jt-group-item" onclick="jtOpenSub(${p._i},${k})">
      <div class="jt-group-thumb">${thumb}</div>
      <div class="gz">${nm(it)}</div>
      <div class="ge">${window.LANG === 'en' ? '' : (it.en || '')}</div>
    </div>`;
  }).join('');
  jtSetupGroupActions(p);
}
window.jtThumbErr = function(img) { img.parentElement.innerHTML = '<span class="ph">圖片準備中</span>'; };

function jtSetupGroupActions(p) {
  const screen = $jt('jt-modal-group-screen');
  const inquiry = screen.querySelector('.jt-group-cta');
  if (!inquiry) return;
  let actions = screen.querySelector('.jt-group-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'jt-group-actions';
    inquiry.parentNode.insertBefore(actions, inquiry);
    actions.appendChild(inquiry);
  }
  actions.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;margin:26px 44px 36px';
  inquiry.style.margin = '0';
  let videoBtn = actions.querySelector('.jt-video-cta');
  if (p.videoUrl) {
    if (!videoBtn) {
      videoBtn = document.createElement('a');
      videoBtn.className = 'jt-modal-cta jt-video-cta';
      videoBtn.target = '_blank';
      videoBtn.rel = 'noopener';
      actions.appendChild(videoBtn);
    }
    videoBtn.href = p.videoUrl;
    videoBtn.textContent = '完整介紹影片';
    videoBtn.style.display = '';
  } else if (videoBtn) {
    videoBtn.style.display = 'none';
  }
}

// 設定單品左側檢視區
function jtSetupViewer(obj) {
  jtStopFrames();
  if (jtAnimId) { cancelAnimationFrame(jtAnimId); jtAnimId = null; }
  const photo = $jt('jt-modal-photo'), frame = $jt('jt-frame-img'), canvas = $jt('jt-modal-canvas'),
        loading = $jt('jt-modal-loading'), nomodel = $jt('jt-no-model'), hint = $jt('jt-modal-hint'),
        thumbs = $jt('jt-modal-thumbs');
  const video = jtEnsureVideo();
  photo.style.display = 'none'; frame.style.display = 'none'; canvas.style.display = 'none';
  video.pause(); video.removeAttribute('src'); video.load(); video.style.display = 'none';
  nomodel.style.display = 'none'; loading.classList.add('hidden');
  thumbs.classList.remove('show'); thumbs.innerHTML = ''; hint.textContent = '';
  jtCurrentImgs = (obj.img || []).map(r => imgURL(obj.series, r));

  if (obj.video) {
    const videoSrc = imgURL(obj.series, obj.video);
    video.setAttribute('src', videoSrc);
    video.src = videoSrc;
    video.style.display = 'block';
    video.load();
    video.play().catch(() => {});
    hint.textContent = '產品介紹影片 · VIDEO';
  } else if (obj.frames) {
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
  const video = document.getElementById('jt-modal-video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  jtStopFrames();
};

// ── Frame Animation Viewer ──
const FRAMES_TOTAL = 241;
const FRAME_SENS = 3;
let jtFrameCache = [], jtFrameLoaded = 0, jtFrameAllReady = false;
let jtFrameOk = 0, jtFrameBad = new Set();
let jtFrameCurrent = 0;
let jtFrameDragging = false, jtFrameLastX = 0, jtFrameAccum = 0;

function jtLoadFrames(baseUrl) {
  jtFrameCache = []; jtFrameLoaded = 0; jtFrameAllReady = false;
  jtFrameOk = 0; jtFrameBad = new Set();
  jtFrameCurrent = 0; jtFrameAccum = 0;

  const img = document.getElementById('jt-frame-img');
  const overlay = document.getElementById('jt-modal-loading');
  img.style.display = 'block';
  overlay.classList.remove('hidden');
  document.querySelector('#jt-modal-loading span').textContent = window.T('loading') + ' 0%';
  img.src = `${baseUrl}frame_000.webp`;

  // 不論成功或失敗都要計數，否則任一張失敗就永遠湊不滿 FRAMES_TOTAL
  const settle = () => {
    jtFrameLoaded++;
    const pct = Math.round(jtFrameLoaded / FRAMES_TOTAL * 100);
    const sp = document.querySelector('#jt-modal-loading span');
    if (sp) sp.textContent = window.T('loading') + ` ${pct}%`;
    if (jtFrameLoaded < FRAMES_TOTAL) return;

    overlay.classList.add('hidden');

    if (jtFrameOk === 0) {
      // 全數失敗 → 退回靜態產品圖，沒有圖再顯示準備中佔位符
      img.style.display = 'none';
      const hint = document.getElementById('jt-modal-hint');
      if (hint) hint.textContent = '';
      const photo = document.getElementById('jt-modal-photo');
      if (photo && typeof jtCurrentImgs !== 'undefined' && jtCurrentImgs.length) {
        photo.onerror = window.jtPhotoErr;
        photo.src = jtCurrentImgs[0];
        photo.style.display = 'block';
        if (hint) hint.textContent = window.T('photo_hint');
      } else if (typeof window.jtPhotoErr === 'function') {
        window.jtPhotoErr();
      }
      return;
    }

    // 有成功的影格就照常啟用（缺的那幾張由 _jtFrameShow 就近略過）
    // 停在第一格不自動旋轉，等使用者拖曳才轉
    jtFrameAllReady = true;
    _jtFrameShow(0);
  };

  for (let i = 0; i < FRAMES_TOTAL; i++) {
    const fi = new Image();
    jtFrameCache[i] = fi;
    fi.onload = () => { jtFrameOk++; settle(); };
    fi.onerror = () => { jtFrameBad.add(i); settle(); };
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
  // 該張載入失敗時，就近找一張可用的，避免顯示破圖
  let t = jtFrameCurrent;
  if (jtFrameBad.has(t) && jtFrameBad.size < FRAMES_TOTAL) {
    for (let d = 1; d <= FRAMES_TOTAL; d++) {
      const b = (t - d + FRAMES_TOTAL) % FRAMES_TOTAL;
      const f = (t + d) % FRAMES_TOTAL;
      if (!jtFrameBad.has(b)) { t = b; break; }
      if (!jtFrameBad.has(f)) { t = f; break; }
    }
  }
  const c = jtFrameCache[t];
  if (c && c.complete && !jtFrameBad.has(t)) document.getElementById('jt-frame-img').src = c.src;
}
function _jtFMDown(e) { e.preventDefault(); jtFrameDragging = true; jtFrameLastX = e.clientX; }
function _jtFMMove(e) {
  if (!jtFrameDragging || !jtFrameAllReady) return;
  const dx = e.clientX - jtFrameLastX; jtFrameLastX = e.clientX;
  jtFrameAccum += dx;
  const sh = Math.round(jtFrameAccum / FRAME_SENS);
  if (sh) { _jtFrameShow(jtFrameCurrent - sh); jtFrameAccum -= sh * FRAME_SENS; }
}
function _jtFMUp() { jtFrameDragging = false; }
function _jtFTStart(e) { e.preventDefault(); jtFrameDragging = true; jtFrameLastX = e.touches[0].clientX; }
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
