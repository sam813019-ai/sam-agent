// ══════════════════════════════════════════════════════════
//  HEIWEI 何謂美 — 經銷商平台 Google Apps Script 後端
//  部署為 Web App：執行身份「我」、存取「任何人」
// ══════════════════════════════════════════════════════════

const SHEET_ID = '1QM2YLU0uRGzxmKva9JD_L0ZkFfoSr5TkC_xBUE2Z8C0';
const LINE_TOKEN = '07NJGWmyAXf+mYMQORdi6HlHRP45PKCPoTu18ihcXnwUI8TzLxOzoUIkAExqGHFMahLfGeNstCvAySBe9qQezi5iJBe8/aAJD64pJGWNchVus3bykOpoiu1zOetf9r3lAmck5S9nlAEgCs4BGtRzsgdB04t89/1O/w1cDnyilFU=';
const OWNER_LINE_USER_ID = 'Ua2b29684b674dbf528710a842badb32a';

// ── 路由 ──────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action;
  const token  = e.parameter.token;

  if (action === 'verify')        return verifyToken(token);
  if (action === 'announcements') return getAnnouncements();

  return jsonResponse({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  const data   = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'apply')     return handleApply(data);
  if (action === 'auth-form') return handleAuthForm(data);

  return jsonResponse({ ok: false, error: 'unknown action' });
}

// CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

// ── Token 驗證 ────────────────────────────────────────────

function verifyToken(token) {
  if (!token) return jsonResponse({ ok: false, error: 'no token' });

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Token 白名單');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][6] === '啟用') {
      return jsonResponse({
        ok:    true,
        name:  data[i][1],
        store: data[i][2],
        phone: data[i][3]
      });
    }
  }
  return jsonResponse({ ok: false, error: 'invalid token' });
}

// ── 公告讀取 ──────────────────────────────────────────────

function getAnnouncements() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('公告');
  const data  = sheet.getDataRange().getValues();
  const list  = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === true || data[i][3] === 'TRUE') {
      list.push({
        date:  Utilities.formatDate(new Date(data[i][0]), 'Asia/Taipei', 'yyyy.MM.dd'),
        title: data[i][1],
        body:  data[i][2]
      });
    }
  }
  list.reverse(); // 最新在前
  return jsonResponse({ ok: true, data: list });
}

// ── 申請表處理 ────────────────────────────────────────────

function handleApply(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('申請名單');
  sheet.appendRow([
    new Date(),
    data.name,
    data.store   || '',
    data.phone,
    data.lineId,
    data.city,
    data.source  || '',
    '待審',
    ''
  ]);

  const msg = [
    '📋 新經銷商申請',
    '',
    `姓名：${data.name}`,
    `店名：${data.store || '未填'}`,
    `電話：${data.phone}`,
    `LINE ID：${data.lineId}`,
    `縣市：${data.city}`,
    `來源：${data.source || '未填'}`
  ].join('\n');

  pushLineMessage(msg);
  return jsonResponse({ ok: true });
}

// ── 授權書申請處理 ────────────────────────────────────────

function handleAuthForm(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('授權書申請');
  sheet.appendRow([
    new Date(),
    data.token,
    data.store,
    data.owner,
    data.taxId   || '',
    data.address,
    data.phone,
    '待確認'
  ]);

  const msg = [
    '🖊️ 授權書申請',
    '',
    `店名：${data.store}`,
    `負責人：${data.owner}`,
    `統編：${data.taxId || '無'}`,
    `地址：${data.address}`,
    `電話：${data.phone}`
  ].join('\n');

  pushLineMessage(msg);
  return jsonResponse({ ok: true });
}

// ── LINE Messaging API 推播 ───────────────────────────────

function pushLineMessage(text) {
  const url     = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to:       OWNER_LINE_USER_ID,
    messages: [{ type: 'text', text: text }]
  };
  UrlFetchApp.fetch(url, {
    method:           'post',
    headers: {
      'Authorization': 'Bearer ' + LINE_TOKEN,
      'Content-Type':  'application/json'
    },
    payload:          JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ── Token 產生工具（手動在 GAS 執行，不是 API）──────────

function generateToken(name, store, phone, lineId) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token   = 'hw-';
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Token 白名單');
  sheet.appendRow([token, name, store, phone, lineId, new Date(), '啟用']);

  Logger.log('Token：' + token);
  Logger.log('連結：https://heiwei-dealer-portal.vercel.app/?token=' + token);
  return token;
}

// ── 工具 ──────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
