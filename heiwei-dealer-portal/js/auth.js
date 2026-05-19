// ── HEIWEI 經銷商平台 — LIFF 初始化 + Token 驗證 ──────────
const LIFF_ID = '2000280599-mBf2n4S6';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMX1cHsQHnYifmy_2SjJH7tzFy7WHtKmzUsFxcJP4DKs-1LphTDP8fOnen3x6071Ie/exec';

async function init() {
  showView('loading');

  // 1. LIFF 初始化（取得 LINE User ID）
  let lineProfile = null;
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return; // 重導中，不繼續執行
    }
    lineProfile = await liff.getProfile();
    window.LINE_PROFILE = lineProfile;
  } catch (err) {
    console.warn('LIFF init failed:', err);
    // LIFF 失敗不擋流程，lineProfile 保持 null
  }

  // 2. 判斷是否有 token
  const params  = new URLSearchParams(window.location.search);
  const token   = params.get('token');

  if (!token) {
    // 無 token → 公開申請頁
    renderPublicProfile(lineProfile);
    showView('public');
    return;
  }

  // 3. 驗證 token（附帶 lineUserId）
  try {
    const lineUserId = lineProfile ? lineProfile.userId : '';
    const res  = await fetch(
      `${GAS_URL}?action=verify&token=${encodeURIComponent(token)}&lineUserId=${encodeURIComponent(lineUserId)}`
    );
    const json = await res.json();

    if (json.ok) {
      window.DEALER = {
        token,
        name:        json.name,
        store:       json.store,
        phone:       json.phone,
        lineUserId:  lineProfile ? lineProfile.userId        : '',
        displayName: lineProfile ? lineProfile.displayName   : '',
        pictureUrl:  lineProfile ? lineProfile.pictureUrl    : ''
      };
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

// 公開層顯示 LINE 個人資料
function renderPublicProfile(profile) {
  const bar = document.getElementById('pub-profile-bar');
  if (!bar || !profile) return;
  bar.style.display = 'flex';
  document.getElementById('pub-display-name').textContent = profile.displayName;
  if (profile.pictureUrl) {
    const img = document.getElementById('pub-avatar');
    img.src = profile.pictureUrl;
    img.style.display = 'block';
    document.getElementById('pub-avatar-placeholder').style.display = 'none';
  }
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove('hidden');
}

init();
