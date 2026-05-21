// ══════════════════════════════════════════════════════════
//  HEIWEI 何謂美 — Sheet-bound 腳本（貼到 Google Sheet 的 Apps Script）
//  Extensions → Apps Script → 貼入 → 存檔（不需要部署）
// ══════════════════════════════════════════════════════════

var LINE_TOKEN_SHEET = '07NJGWmyAXf+mYMQORdi6HlHRP45PKCPoTu18ihcXnwUI8TzLxOzoUIkAExqGHFMahLfGeNstCvAySBe9qQezi5iJBe8/aAJD64pJGWNchVus3bykOpoiu1zOetf9r3lAmck5S9nlAEgCs4BGtRzsgdB04t89/1O/w1cDnyilFU=';
var OWNER_UID_SHEET = 'U6d6118a4671462ee6e19344a04699ce8';

// ── 自訂選單 ──────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('✅ HEIWEI 核准')
    .addItem('核准選取的申請（經銷商）', 'approveSelected')
    .addItem('核准授權書申請', 'approveAuthForm')
    .addToUi();
}

// ── 一鍵核准 ──────────────────────────────────────────────
// 申請名單欄位（新結構）：
// A=時間, B=代理姓名/公司, C=身份證/統編, D=負責人姓名,
// E=電話, F=Email, G=地址, H=平台, I=平台連結,
// J=上級代理LINE ID, K=申請人LINE ID, L=LINE User ID, M=狀態
//
// Token 白名單欄位：
// A=token, B=name, C=store, D=phone, E=lineId, F=date, G=status, H=lineUserId

function approveSelected() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var ui    = SpreadsheetApp.getUi();
  var row   = sheet.getActiveCell().getRow();

  if (sheet.getName() !== '申請名單') {
    ui.alert('請先切換到「申請名單」分頁');
    return;
  }
  if (row <= 1) {
    ui.alert('請點選資料列，不要點標題列');
    return;
  }

  var data        = sheet.getRange(row, 1, 1, 13).getValues()[0];
  var companyName = data[1];  // B: 代理姓名/公司
  var ownerName   = data[3];  // D: 負責人姓名
  var phone       = data[4];  // E: 電話
  var lineUserId  = data[11]; // L: LINE User ID（申請時自動取得）
  var status      = data[12]; // M: 狀態

  if (!companyName) {
    ui.alert('此列沒有資料，請確認選取正確');
    return;
  }
  if (status === '核准') {
    ui.alert('此申請已核准過了');
    return;
  }

  // 產生 token
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var token = 'hw-';
  for (var i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
  var link = 'https://heiwei-dealer-portal.vercel.app/?token=' + token;

  // 產生合約字號：HW + 年份 + 3位流水號（依現有資料列數）
  var tokenSheet = ss.getSheetByName('Token 白名單');
  var seq        = String(tokenSheet.getLastRow()).padStart(3, '0'); // 未 appendRow 前的 lastRow = 流水號
  var contractNo = 'HW' + new Date().getFullYear() + seq;

  // 寫入 Token 白名單（A~I 欄，I = contract_no）
  tokenSheet.appendRow([token, ownerName, companyName, phone, lineUserId, new Date(), '啟用', lineUserId, contractNo]);

  // 更新申請名單狀態
  sheet.getRange(row, 13).setValue('核准');

  // LINE 推播連結給你
  var msg = [
    '✅ 已核准經銷商申請',
    '',
    '代理：' + companyName,
    '負責人：' + ownerName,
    '電話：' + phone,
    'LINE UID：' + (lineUserId || '未記錄'),
    '',
    '專屬入口連結：',
    link
  ].join('\n');

  // 推播給 Owner（你）
  pushToUser(OWNER_UID_SHEET, msg);

  // 推播給申請者（使用他申請時的 LINE User ID）
  if (lineUserId) {
    var applicantMsg = [
      '🎉 恭喜！您已獲得 HEIWEI 何謂美授權',
      '',
      '您的申請已通過審核，以下是您的專屬經銷商入口連結：',
      '',
      link,
      '',
      '⚠️ 此連結與您的 LINE 帳號綁定，請勿轉發他人。',
      '如有疑問請聯絡 HEIWEI 官方 LINE@'
    ].join('\n');
    pushToUser(lineUserId, applicantMsg);
  }

  ui.alert('核准成功！\n\n連結已推播給你與申請者。\n' + link);
}

// ── 核准授權書申請 ─────────────────────────────────────────
// 授權書申請欄位：
// A=時間(0), B=token(1), C=store(2), D=owner(3), E=taxId(4),
// F=address(5), G=phone(6), H=LINE_UID(7), I=狀態(8), J=contract_no(9), K=核准日期(10)

function approveAuthForm() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var ui    = SpreadsheetApp.getUi();
  var row   = sheet.getActiveCell().getRow();

  if (sheet.getName() !== '授權書申請') {
    ui.alert('請先切換到「授權書申請」分頁');
    return;
  }
  if (row <= 1) {
    ui.alert('請點選資料列，不要點標題列');
    return;
  }

  var data      = sheet.getRange(row, 1, 1, 11).getValues()[0];
  var store     = data[2];  // C
  var owner     = data[3];  // D
  var lineUid   = data[7];  // H
  var status    = data[8];  // I

  if (!store && !owner) {
    ui.alert('此列沒有資料，請確認選取正確');
    return;
  }
  if (status === '核准') {
    ui.alert('此申請已核准過了');
    return;
  }

  // 合約字號：HW + 年份 + 3位（依授權書申請列數）
  var seq        = String(row - 1).padStart(3, '0');
  var contractNo = 'HW' + new Date().getFullYear() + seq;
  var today      = new Date();

  // 寫入 I=核准, J=contract_no, K=核准日期
  sheet.getRange(row, 9).setValue('核准');
  sheet.getRange(row, 10).setValue(contractNo);
  sheet.getRange(row, 11).setValue(today);

  // 推播給經銷商
  if (lineUid) {
    var msg = [
      '📑 您的授權書申請已核准！',
      '',
      '合約字號：' + contractNo,
      '授權對象：' + (store || owner),
      '',
      '請至 HEIWEI 經銷商後台「授權書下載」，即可下載您的授權書。'
    ].join('\n');
    pushToUser(lineUid, msg);
  }

  ui.alert('核准成功！\n合約字號：' + contractNo + '\n已推播通知給經銷商。');
}

function pushToUser(userId, text) {
  if (!userId) return;
  var url     = 'https://api.line.me/v2/bot/message/push';
  var payload = JSON.stringify({
    to:       userId,
    messages: [{ type: 'text', text: text }]
  });
  UrlFetchApp.fetch(url, {
    method:             'post',
    headers: {
      'Authorization':  'Bearer ' + LINE_TOKEN_SHEET,
      'Content-Type':   'application/json'
    },
    payload:            payload,
    muteHttpExceptions: true
  });
}

function pushFromSheet(text) {
  pushToUser(OWNER_UID_SHEET, text);
}
