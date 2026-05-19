// ── HEIWEI 經銷商平台 — 入口互動邏輯 ────────────────────────
// GAS_URL 已在 auth.js 定義
const LINE_AT_URL         = 'https://line.me/R/ti/p/@000hmeaj';
const DRIVE_FOLDER_URL    = 'YOUR_GOOGLE_DRIVE_FOLDER_URL'; // ← 填入素材庫 Drive 連結
const CONTRACT_PDF_URL    = 'YOUR_CONTRACT_PDF_URL';        // ← 填入合約書 PDF 連結
const AUTH_TEMPLATE_URL   = 'YOUR_AUTH_TEMPLATE_PDF_URL';   // ← 填入授權書範本 PDF 連結

// ══════════════════════════════════════════
//  初始化入口
// ══════════════════════════════════════════

function initPortal() {
  // 顯示店名（優先）或姓名
  const displayName = window.DEALER.store || window.DEALER.name || '夥伴';
  document.getElementById('portal-name').textContent = displayName;

  // 載入公告摘要（2 則）
  loadAnnouncements(2, 'ann-summary');
}

// ══════════════════════════════════════════
//  申請表送出（公開層）
// ══════════════════════════════════════════

document.getElementById('apply-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('apply-btn');
  const alert = document.getElementById('apply-alert');
  const form  = e.target;

  btn.textContent = '送出中...';
  btn.disabled    = true;

  const data = {
    action:  'apply',
    name:    form.name.value.trim(),
    store:   form.store.value.trim(),
    phone:   form.phone.value.trim(),
    lineId:  form.lineId.value.trim(),
    city:    form.city.value,
    source:  form.source.value
  };

  try {
    const res  = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) {
      alert.innerHTML = '<div class="alert alert-success">✓ 申請已送出！我們將在 3 個工作天內透過 LINE 與您聯繫。</div>';
      form.reset();
    } else {
      throw new Error('server error');
    }
  } catch {
    alert.innerHTML = '<div class="alert alert-error">送出失敗，請稍後再試或直接聯絡 LINE@。</div>';
  } finally {
    btn.textContent = '送出申請';
    btn.disabled    = false;
  }
});

// ══════════════════════════════════════════
//  頁面導覽
// ══════════════════════════════════════════

function showSection(name) {
  // 隱藏首頁元素
  document.getElementById('portal-hero').classList.add('hidden');
  document.getElementById('portal-ann-section').classList.add('hidden');
  document.getElementById('portal-cards-section').classList.add('hidden');
  // 隱藏所有子頁
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
  // 顯示目標子頁
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.remove('hidden');
    // 按需渲染（每次進入重新渲染，確保最新資料）
    if (name === 'announcements') renderAnnouncements();
    if (name === 'contracts')     renderContracts();
    if (name === 'auth-form')     renderAuthForm();
    if (name === 'materials')     renderMaterials();
    if (name === 'order')         renderOrder();
  }
}

function showPortalHome() {
  document.getElementById('portal-hero').classList.remove('hidden');
  document.getElementById('portal-ann-section').classList.remove('hidden');
  document.getElementById('portal-cards-section').classList.remove('hidden');
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
  // 重新載入公告摘要
  loadAnnouncements(2, 'ann-summary');
}

function openLine() {
  window.open(LINE_AT_URL, '_blank');
}

// ══════════════════════════════════════════
//  公告
// ══════════════════════════════════════════

async function loadAnnouncements(limit, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">載入中...</p>';
  try {
    const res  = await fetch(`${GAS_URL}?action=announcements`);
    const json = await res.json();
    const items = (json.data || []).slice(0, limit);
    if (items.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">目前無公告</p>';
      return;
    }
    container.innerHTML = items.map(a => `
      <div class="ann-item">
        <div class="ann-date">${a.date}</div>
        <div class="ann-title">${a.title}</div>
        <div class="ann-body">${a.body}</div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">公告載入失敗，請稍後再試</p>';
  }
}

function renderAnnouncements() {
  const el = document.getElementById('section-announcements');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">所有公告</div>
      </div>
      <div id="ann-full"></div>
    </div>
  `;
  loadAnnouncements(999, 'ann-full');
}

// ══════════════════════════════════════════
//  制度 & 合約
// ══════════════════════════════════════════

function renderContracts() {
  const el = document.getElementById('section-contracts');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">制度 &amp; 合約</div>
      </div>

      <div class="section-label">折扣結構</div>
      <div class="card" style="margin-bottom:20px;">
        <p style="font-size:13px;color:var(--text-body);line-height:2;">
          ▸ 基本經銷：進貨折 <strong>7 折</strong><br>
          ▸ 優質夥伴（月進貨 $30,000+）：<strong>65 折</strong><br>
          ▸ 金牌夥伴（月進貨 $60,000+）：<strong>6 折</strong><br>
          <span style="font-size:11px;color:var(--text-muted);">※ 折扣依實際合約為準，如有疑問請聯絡窗口</span>
        </p>
      </div>

      <div class="section-label">合作規範</div>
      <div class="card" style="margin-bottom:20px;">
        <p style="font-size:13px;color:var(--text-body);line-height:2;">
          ▸ 禁止低於官方建議售價銷售<br>
          ▸ 素材使用需保留 HEIWEI 品牌標示<br>
          ▸ 不得私自代工或仿製產品<br>
          ▸ 每季至少達最低進貨量（依合約）
        </p>
      </div>

      <div class="section-label">文件下載</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="${CONTRACT_PDF_URL}" target="_blank" class="card" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
          <div style="font-size:28px;">📄</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;">合作合約書</div>
            <div style="font-size:11px;color:var(--text-muted);">PDF 下載</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted);">↓</div>
        </a>
        <a href="${AUTH_TEMPLATE_URL}" target="_blank" class="card" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
          <div style="font-size:28px;">🖊️</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;">授權書範本</div>
            <div style="font-size:11px;color:var(--text-muted);">PDF 下載（供參考）</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted);">↓</div>
        </a>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════
//  授權書申請
// ══════════════════════════════════════════

function renderAuthForm() {
  const el = document.getElementById('section-auth-form');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">授權書申請</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:20px;">
        填寫以下資料，送出後我們將在確認後核發授權書。
      </p>
      <div id="auth-alert"></div>
      <form id="auth-form">
        <div class="form-group">
          <label>店名 / 品牌名稱 <span style="color:var(--error)">*</span></label>
          <input type="text" name="store" placeholder="美麗日記店" required>
        </div>
        <div class="form-group">
          <label>負責人姓名 <span style="color:var(--error)">*</span></label>
          <input type="text" name="owner" placeholder="陳小美" required>
        </div>
        <div class="form-group">
          <label>統一編號（無則留空）</label>
          <input type="text" name="taxId" placeholder="12345678" maxlength="8">
        </div>
        <div class="form-group">
          <label>店面 / 通訊地址 <span style="color:var(--error)">*</span></label>
          <input type="text" name="address" placeholder="高雄市仁武區○○路○○號" required>
        </div>
        <div class="form-group">
          <label>聯絡電話 <span style="color:var(--error)">*</span></label>
          <input type="tel" name="phone" placeholder="0912-345-678" required>
        </div>
        <button type="submit" class="btn btn-dark" id="auth-btn">送出授權書申請</button>
      </form>
    </div>
  `;

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('auth-btn');
    const alert = document.getElementById('auth-alert');
    const form  = e.target;

    btn.textContent = '送出中...';
    btn.disabled    = true;

    const data = {
      action:  'auth-form',
      token:   window.DEALER.token,
      store:   form.store.value.trim(),
      owner:   form.owner.value.trim(),
      taxId:   form.taxId.value.trim(),
      address: form.address.value.trim(),
      phone:   form.phone.value.trim()
    };

    try {
      const res  = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
      const json = await res.json();
      if (json.ok) {
        alert.innerHTML = '<div class="alert alert-success">✓ 申請已送出！確認後我們將透過 LINE 通知您。</div>';
        form.reset();
      } else {
        throw new Error();
      }
    } catch {
      alert.innerHTML = '<div class="alert alert-error">送出失敗，請稍後再試。</div>';
    } finally {
      btn.textContent = '送出授權書申請';
      btn.disabled    = false;
    }
  });
}

// ══════════════════════════════════════════
//  素材庫
// ══════════════════════════════════════════

function renderMaterials() {
  const el = document.getElementById('section-materials');
  el.innerHTML = `
    <div class="section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">素材庫</div>
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:16px;">
        以下為最新品牌素材，點擊連結在 Google Drive 中預覽或下載。
      </p>
      <a href="${DRIVE_FOLDER_URL}" target="_blank" class="btn btn-gold" style="margin-bottom:16px;">
        開啟 Google Drive 素材資料夾 ↗
      </a>
      <div class="card">
        <div style="font-size:12px;color:var(--text-muted);line-height:2;">
          <strong style="color:var(--dark);">資料夾包含：</strong><br>
          📸 商品圖（去背版、情境版）<br>
          🏷️ 品牌 Logo（各尺寸、各底色）<br>
          🎨 活動 Banner<br>
          🎬 品牌影片素材
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════
//  訂購出貨
// ══════════════════════════════════════════

function renderOrder() {
  const el = document.getElementById('section-order');
  el.innerHTML = `
    <div class="section" style="padding-bottom:8px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">訂購出貨</div>
      </div>
    </div>
    <iframe
      src="https://tally.so/r/xXPxOd"
      style="width:100%;height:82vh;border:none;display:block;"
      title="HEIWEI 訂購表單"
    ></iframe>
  `;
}
