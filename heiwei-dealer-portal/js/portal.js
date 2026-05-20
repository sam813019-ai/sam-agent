// ── HEIWEI 經銷商平台 — 入口互動邏輯 ────────────────────────
// GAS_URL 已在 auth.js 定義
const LINE_AT_URL      = 'https://line.me/R/ti/p/@000hmeaj';
const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1W-6LSn9Re1ETIF9W5kGh4ObcnGTNasgD?usp=drive_link';
const CONTRACT_PDF_URL = './爆白售價契約書2026.docx.pdf';
const AUTH_TEMPLATE_URL= './爆白售價契約書2026.docx.pdf';

// ══════════════════════════════════════════
//  申請表（公開層）
// ══════════════════════════════════════════

// 平台「其他」選項切換
document.getElementById('platform-other-check')?.addEventListener('change', function() {
  const inp = document.getElementById('platform-other-input');
  inp.style.display = this.checked ? 'block' : 'none';
  if (!this.checked) inp.value = '';
});

document.getElementById('apply-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('apply-btn');
  const alert = document.getElementById('apply-alert');
  const form  = e.target;

  // 收集平台 checkboxes
  const platformsArr = Array.from(form.querySelectorAll('input[name="platforms"]:checked'))
    .map(el => el.value);
  const otherPlatform = form.platform_other?.value?.trim();
  if (otherPlatform) platformsArr.push('其他：' + otherPlatform);

  if (platformsArr.length === 0) {
    alert.innerHTML = '<div class="alert alert-error">請至少選擇一個經營平台</div>';
    return;
  }

  btn.textContent = '送出中...';
  btn.disabled    = true;

  const data = {
    action:            'apply',
    company_name:      form.company_name.value.trim(),
    id_number:         form.id_number.value.trim(),
    owner_name:        form.owner_name.value.trim(),
    phone:             form.phone.value.trim(),
    email:             form.email.value.trim(),
    address:           form.address.value.trim(),
    platforms:         platformsArr.join('、'),
    platform_links:    form.platform_links.value.trim(),
    upstream_line_id:  form.upstream_line_id.value.trim(),
    applicant_line_id: form.applicant_line_id.value.trim(),
    line_uid:          window.LINE_PROFILE?.userId || ''
  };

  try {
    const res  = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) {
      // 整個公開層換成成功畫面
      document.getElementById('view-public').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;min-height:80vh;padding:40px 24px;text-align:center;gap:0;">
          <div style="width:72px;height:72px;background:var(--success);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-size:36px;color:#fff;margin-bottom:20px;">✓</div>
          <div style="font-size:22px;font-weight:700;color:var(--dark);margin-bottom:12px;">申請已送出！</div>
          <div style="font-size:14px;color:var(--text-body);line-height:1.8;margin-bottom:32px;">
            感謝您申請 HEIWEI 何謂美 經銷授權。<br>
            我們將於 3–5 個工作天內，<br>
            透過 LINE 或電子郵件與您聯繫。<br><br>
            <strong>請勿重複送出表單。</strong>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">請加入官方帳號後，回傳您的<strong style="color:var(--dark);">姓名</strong>給官方帳號</p>
          <a href="${LINE_AT_URL}" target="_blank"
             style="display:inline-block;background:#06C755;color:#fff;
                    font-size:15px;font-weight:700;padding:14px 36px;
                    border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
            聯繫 LINE 官方帳號
          </a>
        </div>
      `;
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
//  初始化入口（私密層）
// ══════════════════════════════════════════

function initPortal() {
  const displayName = window.DEALER.displayName || window.DEALER.name || '夥伴';
  document.getElementById('portal-name').textContent = displayName;
  loadAnnouncements(2, 'ann-summary');
}

// ══════════════════════════════════════════
//  頁面導覽
// ══════════════════════════════════════════

function showSection(name) {
  document.getElementById('portal-hero').classList.add('hidden');
  document.getElementById('portal-ann-section').classList.add('hidden');
  document.getElementById('portal-cards-section').classList.add('hidden');
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));

  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.remove('hidden');
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
  loadAnnouncements(2, 'ann-summary');
}

function openLine() { window.open(LINE_AT_URL, '_blank'); }

// ══════════════════════════════════════════
//  公告
// ══════════════════════════════════════════

async function loadAnnouncements(limit, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">載入中...</p>';
  try {
    const res   = await fetch(`${GAS_URL}?action=announcements`);
    const json  = await res.json();
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
      } else { throw new Error(); }
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
//  訂購出貨 — 完整訂購表單
// ══════════════════════════════════════════

// 金額自動計算
function orderRecalc() {
  const planInput  = document.querySelector('#order-plan-grid input:checked');
  const qty        = parseInt(document.getElementById('order-qty')?.value || '0', 10);
  const calcEmpty  = document.getElementById('order-calc-empty');
  const calcDetail = document.getElementById('order-calc-detail');
  if (!calcEmpty || !calcDetail) return;

  if (!planInput || !qty || qty <= 0) {
    calcEmpty.style.display  = 'block';
    calcDetail.style.display = 'none';
    return;
  }

  const unitPrice = parseInt(planInput.value, 10);
  const planLabel = planInput.dataset.label;
  const total     = unitPrice * qty;

  document.getElementById('order-calc-plan').textContent  = planLabel;
  document.getElementById('order-calc-unit').textContent  = '$' + unitPrice.toLocaleString();
  document.getElementById('order-calc-qty').textContent   = qty.toLocaleString() + ' 件';
  document.getElementById('order-calc-total').textContent = '$' + total.toLocaleString();
  document.getElementById('order-total-hidden').value     = total;
  document.getElementById('order-unit-hidden').value      = unitPrice;
  document.getElementById('order-label-hidden').value     = planLabel;

  calcEmpty.style.display  = 'none';
  calcDetail.style.display = 'block';
}

// 初始化訂購表單的事件監聽
function initOrderForm() {
  // 方案選擇
  document.querySelectorAll('#order-plan-grid input').forEach(radio => {
    radio.addEventListener('change', function() {
      const min = parseInt(this.dataset.min, 10);
      document.getElementById('order-qty-hint').textContent = '最低訂購 ' + min + ' 件';
      document.getElementById('order-qty').min = min;
      orderRecalc();
    });
  });

  // 數量輸入
  document.getElementById('order-qty')?.addEventListener('input', orderRecalc);

  // 發票類型切換
  document.querySelectorAll('input[name="order_invoice_type"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const f = document.getElementById('order-company-invoice');
      f.style.display = this.value === '三聯式統一發票' ? 'block' : 'none';
    });
  });

  // 送出
  document.getElementById('order-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 違約協議必勾
    if (!document.getElementById('order-agreement').checked) {
      alert('請先勾選同意價格控管協議');
      return;
    }

    const btn = document.getElementById('order-submit-btn');
    btn.textContent = '送出中...';
    btn.disabled    = true;

    const form = e.target;
    const fd   = new FormData(form);

    const data = {
      action:         'order',
      line_uid:       window.DEALER?.lineUserId   || '',
      line_display_name: window.DEALER?.displayName || window.DEALER?.name || '',
      buyer_name:     fd.get('order_buyer_name'),
      phone:          fd.get('order_phone'),
      email:          fd.get('order_email'),
      address:        fd.get('order_address'),
      plan_label:     document.getElementById('order-label-hidden')?.value || '',
      unit_price:     document.getElementById('order-unit-hidden')?.value  || '',
      quantity:       fd.get('order_qty'),
      total_amount:   document.getElementById('order-total-hidden')?.value || '',
      transfer_code:  fd.get('order_transfer_code'),
      invoice_type:   fd.get('order_invoice_type')   || '',
      invoice_title:  fd.get('order_invoice_title')  || '',
      invoice_tax_id: fd.get('order_invoice_tax_id') || ''
    };

    try {
      const res  = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(data) });
      const json = await res.json();
      if (json.ok) {
        document.getElementById('section-order').innerHTML = `
          <div class="section" style="text-align:center;padding-top:60px;">
            <div style="width:72px;height:72px;background:var(--success);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto 20px;font-size:36px;">✓</div>
            <div style="font-size:20px;font-weight:700;margin-bottom:10px;">訂單已送出！</div>
            <p style="font-size:13px;color:var(--text-muted);line-height:1.8;margin-bottom:28px;">
              確認收款後將盡快安排出貨，<br>並透過 LINE 通知出貨進度。<br><br>
              <strong>請勿重複送出表單。</strong>
            </p>
            <button class="btn btn-outline" onclick="showPortalHome()" style="width:auto;padding:12px 32px;">
              回到首頁
            </button>
          </div>
        `;
      } else { throw new Error(); }
    } catch {
      alert('送出失敗，請稍後再試或透過 LINE 聯絡。');
      btn.textContent = '送出訂單';
      btn.disabled    = false;
    }
  });
}

function renderOrder() {
  const el    = document.getElementById('section-order');
  const name  = window.DEALER?.name  || '';
  const phone = window.DEALER?.phone || '';

  el.innerHTML = `
    <div class="section" style="padding-bottom:8px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="back-btn" onclick="showPortalHome()">←</button>
        <div class="section-label" style="margin:0;">訂購出貨</div>
      </div>
    </div>

    <div style="padding:0 16px 40px;">
      <div class="form-notice">
        <strong>填寫須知：</strong>請確認訂購資訊無誤後再送出，匯款完成請填寫後五碼，
        我們確認收款後安排出貨。
      </div>

      <form id="order-form">

        <!-- 訂購人資料 -->
        <div class="form-card">
          <div class="card-title">訂購人資料</div>
          <div class="form-group">
            <label>姓名 <span style="color:var(--error)">*</span></label>
            <input type="text" name="order_buyer_name" value="${name}" placeholder="請填寫真實姓名" required>
          </div>
          <div class="form-group">
            <label>聯繫電話 <span style="color:var(--error)">*</span></label>
            <input type="tel" name="order_phone" value="${phone}" placeholder="例：0912-345-678" required>
          </div>
          <div class="form-group">
            <label>電子郵件 <span style="color:var(--error)">*</span></label>
            <input type="email" name="order_email" placeholder="example@gmail.com" required>
          </div>
          <div class="form-group">
            <label>出貨地址 <span style="color:var(--error)">*</span></label>
            <input type="text" name="order_address" placeholder="請填寫完整收貨地址" required>
          </div>
        </div>

        <!-- 方案選擇 -->
        <div class="form-card">
          <div class="card-title">方案選擇</div>
          <div class="plan-grid" id="order-plan-grid">
            <label class="plan-item">
              <input type="radio" name="order_plan" value="350" data-min="30" data-label="入門方案（30件以上）" required>
              <div class="plan-info">
                <div class="plan-name">入門方案</div>
                <div class="plan-desc">最低訂購 30 件</div>
              </div>
              <div class="plan-price">$350 <span>/ 件</span></div>
            </label>
            <label class="plan-item">
              <input type="radio" name="order_plan" value="300" data-min="100" data-label="進階方案（100件以上）">
              <div class="plan-info">
                <div class="plan-name">進階方案</div>
                <div class="plan-desc">最低訂購 100 件</div>
              </div>
              <div class="plan-price">$300 <span>/ 件</span></div>
            </label>
            <label class="plan-item">
              <input type="radio" name="order_plan" value="270" data-min="500" data-label="批量方案（500件以上）">
              <div class="plan-info">
                <div class="plan-name">批量方案</div>
                <div class="plan-desc">最低訂購 500 件</div>
              </div>
              <div class="plan-price">$270 <span>/ 件</span></div>
            </label>
          </div>
        </div>

        <!-- 訂購數量 + 計算 -->
        <div class="form-card">
          <div class="card-title">訂購數量</div>
          <div class="form-group">
            <label>數量（件）<span style="color:var(--error)">*</span>
              <span class="form-hint" id="order-qty-hint">請先選擇上方方案</span>
            </label>
            <input type="number" name="order_qty" id="order-qty" placeholder="請輸入訂購數量" min="1" required>
          </div>
          <div class="calc-card">
            <div id="order-calc-empty" style="text-align:center;font-size:12px;color:var(--text-muted);padding:6px 0;">
              選擇方案並填寫數量後，自動顯示匯款金額
            </div>
            <div id="order-calc-detail" style="display:none;">
              <div class="calc-row"><span>選擇方案</span><span id="order-calc-plan">—</span></div>
              <div class="calc-row"><span>每件單價</span><span id="order-calc-unit">—</span></div>
              <div class="calc-row"><span>訂購數量</span><span id="order-calc-qty">—</span></div>
              <div class="calc-row total">
                <span>匯款總金額</span>
                <span id="order-calc-total" style="color:var(--error);font-size:20px;font-weight:700;">—</span>
              </div>
            </div>
          </div>
          <input type="hidden" id="order-total-hidden">
          <input type="hidden" id="order-unit-hidden">
          <input type="hidden" id="order-label-hidden">
        </div>

        <!-- 匯款資訊 -->
        <div class="form-card">
          <div class="card-title">匯款資訊</div>
          <div class="bank-info">
            <div class="bank-row"><span class="bank-label">戶名</span><span class="bank-value">何謂美國際有限公司</span></div>
            <div class="bank-row"><span class="bank-label">銀行</span><span class="bank-value">台新國際商業銀行（812）</span></div>
            <div style="margin-top:6px;">
              <div style="font-size:11px;color:#888;margin-bottom:2px;">帳號</div>
              <div class="bank-account">2046 0166 8899 92</div>
            </div>
          </div>
          <div class="form-group">
            <label>匯款後五碼 <span style="color:var(--error)">*</span>
              <span class="form-hint">請填寫匯款帳號末五碼，供對帳使用</span>
            </label>
            <input type="text" name="order_transfer_code" placeholder="例：89992" maxlength="5" required>
          </div>
        </div>

        <!-- 發票資訊 -->
        <div class="form-card">
          <div class="card-title">發票資訊</div>
          <div class="invoice-grid">
            <label class="invoice-item">
              <input type="radio" name="order_invoice_type" value="二聯式個人發票" required>
              <span>二聯式<br><small style="font-weight:400;">個人發票</small></span>
            </label>
            <label class="invoice-item">
              <input type="radio" name="order_invoice_type" value="三聯式統一發票">
              <span>三聯式<br><small style="font-weight:400;">公司發票</small></span>
            </label>
          </div>
          <div id="order-company-invoice" style="display:none;">
            <div class="form-group">
              <label>發票抬頭（公司名稱）<span style="color:var(--error)">*</span></label>
              <input type="text" name="order_invoice_title" placeholder="請填寫公司全名">
            </div>
            <div class="form-group">
              <label>統一編號 <span style="color:var(--error)">*</span></label>
              <input type="text" name="order_invoice_tax_id" placeholder="請填寫 8 位統一編號" maxlength="8">
            </div>
          </div>
        </div>

        <!-- 違約協議 -->
        <div class="form-card">
          <div class="card-title">價格控管與違約協議</div>
          <div class="agreement-box">
            本人同意嚴格遵守品牌之<strong>最低控管價格</strong>，若違反定價規範，
            須支付<strong>總進貨貨款五倍之違約金</strong>作為賠償，並承擔一切法律訴追責任。
            本人同意授權方得<strong>立即終止代理權並斷貨</strong>，不得異議。
          </div>
          <label class="agreement-check">
            <input type="checkbox" id="order-agreement" name="order_agreement">
            <span>我已閱讀並同意以上定價規範</span>
          </label>
        </div>

        <!-- 送出 -->
        <div style="padding:16px 0 8px;">
          <button type="submit" class="btn btn-gold" id="order-submit-btn">送出訂單</button>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:12px;line-height:1.6;">
            送出即表示您確認訂購資訊無誤，<br>並已完成匯款及同意品牌違約協議。
          </p>
        </div>

      </form>
    </div>
  `;

  initOrderForm();
}
