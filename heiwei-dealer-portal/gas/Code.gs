// ══════════════════════════════════════════════════════════
//  HEIWEI 何謂美 — 經銷商平台 Google Apps Script 後端
//  部署為 Web App：執行身份「我」、存取「任何人」
// ══════════════════════════════════════════════════════════

const SHEET_ID = '1QM2YLU0uRGzxmKva9JD_L0ZkFfoSr5TkC_xBUE2Z8C0';
const LINE_TOKEN = '07NJGWmyAXf+mYMQORdi6HlHRP45PKCPoTu18ihcXnwUI8TzLxOzoUIkAExqGHFMahLfGeNstCvAySBe9qQezi5iJBe8/aAJD64pJGWNchVus3bykOpoiu1zOetf9r3lAmck5S9nlAEgCs4BGtRzsgdB04t89/1O/w1cDnyilFU=';
const OWNER_LINE_USER_ID = 'U6d6118a4671462ee6e19344a04699ce8';

// ── 路由 ──────────────────────────────────────────────────

function doGet(e) {
  const action     = e.parameter.action;
  const token      = e.parameter.token;
  const lineUserId = e.parameter.lineUserId || '';

  if (action === 'verify')        return verifyToken(token, lineUserId);
  if (action === 'announcements') return getAnnouncements();
  if (action === 'myOrders')      return getMyOrders(lineUserId);

  return jsonResponse({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  const body = e.postData.contents;
  const data = JSON.parse(body);

  // LINE Webhook event
  if (data.events) return handleLineWebhook(data.events);

  const action = data.action;
  if (action === 'apply')     return handleApply(data);
  if (action === 'auth-form') return handleAuthForm(data);
  if (action === 'order')     return handleOrder(data);

  return jsonResponse({ ok: false, error: 'unknown action' });
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

// ── Token 驗證（含 LINE User ID 比對）────────────────────
// Token 白名單欄位：A=token, B=name, C=store, D=phone, E=lineId, F=date, G=status, H=lineUserId

function verifyToken(token, lineUserId) {
  if (!token) return jsonResponse({ ok: false, error: 'no token' });

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Token 白名單');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][6] === '啟用') {
      const stored = data[i][7] || '';
      // 若 Token 有記錄 lineUserId，且前端也有提供，則比對
      if (stored && lineUserId && stored !== lineUserId) {
        return jsonResponse({ ok: false, error: 'user mismatch' });
      }
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
  list.reverse();
  return jsonResponse({ ok: true, data: list });
}

// ── 申請表處理（新欄位）──────────────────────────────────
// 申請名單欄位：A=時間, B=代理姓名/公司, C=身份證/統編, D=負責人姓名,
//              E=電話, F=Email, G=地址, H=平台, I=平台連結,
//              J=上級代理LINE ID, K=申請人LINE ID, L=LINE User ID, M=狀態

function handleApply(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('申請名單');
  sheet.appendRow([
    new Date(),
    data.company_name      || '',
    data.id_number         || '',
    data.owner_name        || '',
    data.phone             || '',
    data.email             || '',
    data.address           || '',
    data.platforms         || '',
    data.platform_links    || '',
    data.upstream_line_id  || '',
    data.applicant_line_id || '',
    data.line_uid          || '',
    '待審'
  ]);

  const msg = [
    '📋 新經銷商申請',
    '',
    `代理：${data.company_name || '未填'}`,
    `負責人：${data.owner_name || '未填'}`,
    `電話：${data.phone || '未填'}`,
    `Email：${data.email || '未填'}`,
    `平台：${data.platforms || '未填'}`,
    `LINE UID：${data.line_uid || '未填'}`
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

// ── 訂購單處理 ────────────────────────────────────────────
// 訂購單欄位：A=時間, B=LINE UID, C=姓名, D=電話, E=Email, F=地址,
//            G=方案, H=單價, I=數量, J=總金額, K=匯款後五碼,
//            L=發票類型, M=發票抬頭, N=統編, O=狀態

function handleOrder(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('訂購單');
  if (!sheet) {
    sheet = ss.insertSheet('訂購單');
    sheet.appendRow(['時間','LINE UID','姓名','電話','Email','地址','方案','單價','數量','總金額','匯款後五碼','發票類型','發票抬頭','統編','狀態']);
  }

  sheet.appendRow([
    new Date(),
    data.line_uid       || '',
    data.buyer_name     || '',
    data.phone          || '',
    data.email          || '',
    data.address        || '',
    data.plan_label     || '',
    data.unit_price     || '',
    data.quantity       || '',
    data.total_amount   || '',
    data.transfer_code  || '',
    data.invoice_type   || '',
    data.invoice_title  || '',
    data.invoice_tax_id || '',
    '待確認'
  ]);

  const msg = [
    '📦 新訂購單',
    '',
    `姓名：${data.buyer_name}`,
    `電話：${data.phone}`,
    `方案：${data.plan_label}（$${data.unit_price}/件）`,
    `數量：${data.quantity} 件`,
    `總金額：$${data.total_amount}`,
    `匯款後五碼：${data.transfer_code}`
  ].join('\n');

  pushLineMessage(msg);
  return jsonResponse({ ok: true });
}

// ── 我的訂單查詢 ──────────────────────────────────────────
// 訂購單欄位：A=時間, B=LINE UID, C=姓名, D=電話, E=Email, F=地址,
//            G=方案, H=單價, I=數量, J=總金額, K=匯款後五碼,
//            L=發票類型, M=發票抬頭, N=統編, O=狀態, P=貨運方式, Q=貨運編號

function getMyOrders(lineUserId) {
  if (!lineUserId) return jsonResponse({ ok: true, data: [] });

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('訂購單');
  if (!sheet)  return jsonResponse({ ok: true, data: [] });

  const data   = sheet.getDataRange().getValues();
  const orders = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) !== lineUserId) continue;
    orders.push({
      date:           Utilities.formatDate(new Date(data[i][0]), 'Asia/Taipei', 'yyyy.MM.dd HH:mm'),
      plan:           data[i][6]  || '',
      quantity:       data[i][8]  || '',
      total:          data[i][9]  || '',
      status:         data[i][14] || '待確認',
      shippingMethod: data[i][15] || '',
      trackingNumber: data[i][16] || ''
    });
  }

  orders.reverse();
  return jsonResponse({ ok: true, data: orders });
}

// ── LINE Webhook 接收 → 記錄 userId ─────────────────────

function handleLineWebhook(events) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Webhook Log');
  if (!sheet) {
    sheet = ss.insertSheet('Webhook Log');
    sheet.appendRow(['時間', 'userId', 'type', 'text']);
  }

  events.forEach(function(ev) {
    const userId = ev.source && ev.source.userId ? ev.source.userId : '(unknown)';
    const type   = ev.type || '';
    const text   = (ev.message && ev.message.text) ? ev.message.text : '';
    sheet.appendRow([new Date(), userId, type, text]);
  });

  return ContentService.createTextOutput('OK');
}

// ── LINE Messaging API 推播 ───────────────────────────────

function pushLineMessage(text) {
  if (!OWNER_LINE_USER_ID) return;
  const url     = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to:       OWNER_LINE_USER_ID,
    messages: [{ type: 'text', text: text }]
  };
  UrlFetchApp.fetch(url, {
    method:             'post',
    headers: {
      'Authorization':  'Bearer ' + LINE_TOKEN,
      'Content-Type':   'application/json'
    },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ── 工具 ──────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
