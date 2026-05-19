// ── HEIWEI 經銷商平台 — Token 驗證 ──────────────────────────
// 填入 GAS Web App URL（部署後取得）
const GAS_URL = 'YOUR_GAS_WEB_APP_URL';

async function init() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');

  showView('loading');

  if (!token) {
    showView('public');
    return;
  }

  try {
    const res  = await fetch(`${GAS_URL}?action=verify&token=${encodeURIComponent(token)}`);
    const json = await res.json();

    if (json.ok) {
      window.DEALER = { token, name: json.name, store: json.store, phone: json.phone };
      initPortal();
      showView('portal');
    } else {
      showView('error');
    }
  } catch (err) {
    console.error('Auth error:', err);
    showView('error');
  }
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove('hidden');
}

init();
