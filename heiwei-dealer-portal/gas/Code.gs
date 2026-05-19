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

// ── 自訂選單（開啟 Sheet 時自動出現）────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('✅ HEIWEI 核准')
    .addItem('核准選取的申請', 'approveSelected')
    .addToUi();
}

// ── 一鍵核准（從申請名單選取列執行）─────────────────────

function approveSelected() {
  const ss      = SpreadsheetApp.openById(SHEET_ID);
  const applySheet = ss.getSheetByName('申請名單');
  const ui      = SpreadsheetApp.getUi();

  // 取得目前選取的列
  const row = applySheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert('請先點選一筆申請資料（不是標題列）');
    return;
  }

  const data    = applySheet.getRange(row, 1, 1, 9).getValues()[0];
  const name    = data[1]; // B：姓名
  const store   = data[2]; // C：店名
  const phone   = data[3]; // D：電話
  const lineId  = data[4]; // E：LINE ID
  const status  = data[7]; // H：狀態

  if (!name) {
    ui.alert('此列沒有資料，請確認選取正確');
    return;
  }
  if (status === '核准') {
    ui.alert('此申請已核准過了');
    return;
  }

  // 產生 token
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token   = 'hw-';
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
  const link  = 'https://heiwei-dealer-portal.vercel.app/?token=' + token;

  // 寫入 Token 白名單
  const tokenSheet = ss.getSheetByName('Token 白名單');
  tokenSheet.appendRow([token, name, store, phone, lineId, new Date(), '啟用']);

  // 更新申請名單狀態為「核准」
  applySheet.getRange(row, 8).setValue('核准');

  // LINE 推播連結給你
  const msg = [
    '✅ 已核准經銷商申請',
    '',
    `姓名：${name}`,
    `店名：${store || '無'}`,
    `電話：${phone}`,
    `LINE ID：${lineId}`,
    '',
    `專屬入口連結：`,
    link
  ].join('\n');
  pushLineMessage(msg);

  ui.alert(`核准成功！\n\n連結已推播到你的 LINE：\n${link}`);
}

// ── 工具 ──────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
