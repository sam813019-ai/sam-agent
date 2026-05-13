// ==========================================
// HERA 服飾店管理系統 (含代購訂單模組 + LIFF Dual-Write)
// 版本：v3.0
// 更新日期：2026-04-21
// ==========================================
// 【試算表需要的分頁】
//   1. 庫存表       欄位：貨號 品名 規格 進價 售價 庫存 圖片URL
//   2. 銷售紀錄     欄位：日期 店員 貨號 規格 數量 金額 付款方式
//   3. 進貨紀錄     欄位：日期 貨號 規格 數量
//   4. 打卡紀錄     欄位：日期 姓名 類型 userId
//   5. 代購訂單     欄位：日期 姓名 商品編號 規格 進價 售價 數量 毛利 狀態 備註
//   6. 商品表 🆕    (LIFF) id | code | name | spec | price | stock | image | description | active
//   7. 訂單表 🆕    (LIFF) 訂單時間 | 訂單編號 | userId | 顧客名稱 | 商品明細 | 總金額 | 備註 | 狀態 | 連線代購
//   8. 訂單明細 🆕  (LIFF) 訂單編號 | 商品ID | 商品編號 | 商品名稱 | 規格 | 單價 | 數量 | 小計 | 連線代購
//   9. 設定 🆕      (LIFF) key | value（title = 當期連線名稱）
//  10. 統計 🆕      (LIFF) A1 放 QUERY 公式自動彙總
//  11. 客戶對照 🆕  (LIFF) 姓名 | userId | LINE暱稱 | 首次登記時間
// ==========================================

// --- 基本設定區 ---
var CHANNEL_ACCESS_TOKEN = 'jt2P+BXndbz4m7WzmTEus3NhesXvqzM+CTLBYruY4zIzH8pVSo7VucdboYwETnqrcYh7G6ZXeiWtEwB9rzPmjTbWLfXr8CCeAnznC2HKCOhHsBtA9vXW+5ItApzBS/D23zKuq3nTl23YRXsl6dQRMgdB04t89/1O/w1cDnyilFU=';
var RECIPIENTS = ["Ua2b29684b674dbf528710a842badb32a", "Uad977374c42a4c01399ac25ab6654c88"];
var DRIVE_FOLDER_ID = "1wVyU0ye7EudnKH8WckdhrZ9L6oIu8NFc";

// --- LIFF 分頁名稱（對應 line-order Next.js 專案）---
var LIFF_ORDERS_TAB      = "訂單表";
var LIFF_ORDER_ITEMS_TAB = "訂單明細";
var LIFF_CUSTOMERS_TAB   = "客戶對照";
var LIFF_SETTINGS_TAB    = "設定";
var LIFF_PRODUCTS_TAB    = "商品表";

// --- 主要接收邏輯 ---
function doPost(e) {
  var msg = JSON.parse(e.postData.contents);
  var event = msg.events[0];
  var replyToken = event.replyToken;
  var userId = event.source.userId;

  if (event.message.type === 'text') {
    var userMsg = event.message.text.trim();
    var parts = userMsg.split(/\s+/);

    if (userMsg === "格式") {
      var helpMsg = "📋 【指令指南】\n" +
                    "--------------------------\n" +
                    "1️⃣ 查詢：查 [貨號] 或 查 [關鍵字]\n" +
                    "2️⃣ 銷售：賣 [貨號] [規格] [數量] [單價] [付款方式]\n" +
                    "3️⃣ 入庫(新)：入庫 [貨號] [品名] [規格] [進價] [售價] [數量]\n" +
                    "4️⃣ 入庫(舊)：入庫 [貨號] [品名] [規格] [數量]\n" +
                    "5️⃣ 📸 傳圖：入庫後直接傳照片即可關聯\n" +
                    "6️⃣ 打卡：上班 / 下班\n" +
                    "7️⃣ 報表：本月報表\n" +
                    "--------------------------\n" +
                    "🛍️ 【代購訂單】\n" +
                    "8️⃣ 下單：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]\n" +
                    "9️⃣ 出貨：代購出貨 [姓名]\n" +
                    "🔟 查客戶：代購客戶 [姓名]\n" +
                    "1️⃣1️⃣ 訂貨總表：代購總表\n" +
                    "1️⃣2️⃣ 單品明細：代購總表 [商品編號]";
      replyLine(replyToken, helpMsg);
    }
    else if (userMsg === "本月報表") { handleMonthlyQuery(replyToken); }
    else if (userMsg.startsWith("查")) { handleQuery(parts[1], replyToken); }
    else if (userMsg.startsWith("賣")) { handleSales(parts, replyToken, userId); }
    else if (userMsg.startsWith("入庫")) { handlePurchase(parts, replyToken, userId); }
    else if (userMsg === "上班" || userMsg === "下班") { handleClockIn(userMsg, replyToken, userId); }
    // 代購訂單模組（順序：長字串優先）
    else if (userMsg.startsWith("代購客戶")) { handleProxyCustomerQuery(parts, replyToken); }
    else if (userMsg.startsWith("代購總表")) { handleProxyAllSummary(parts, replyToken); }
    else if (userMsg.startsWith("代購出貨")) { handleProxyDeliver(parts, replyToken); }
    else if (userMsg.startsWith("代購"))    { handleProxyOrder(parts, replyToken, userId); }
  }
  else if (event.message.type === 'image') {
    handleImage(event.message.id, replyToken, userId);
  }
}

// ==========================================
// 報表系統 (兩套獨立邏輯)
// ==========================================

// --- 1. 即時查詢【本月】(LINE 指令觸發) ---
function handleMonthlyQuery(replyToken) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salesSheet = ss.getSheetByName("銷售紀錄"), invSheet = ss.getSheetByName("庫存表");
  var salesData = salesSheet.getDataRange().getValues(), invData = invSheet.getDataRange().getValues();

  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();

  var totalRev = 0, totalCost = 0, costMap = {};
  for (var j = 1; j < invData.length; j++) {
    costMap[String(invData[j][0]) + "_" + String(invData[j][2])] = parseFloat(invData[j][3]) || 0;
  }

  for (var i = 1; i < salesData.length; i++) {
    var d = new Date(salesData[i][0]);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      var qty = parseInt(salesData[i][4]) || 0, rev = parseFloat(salesData[i][5]) || 0;
      totalRev += rev;
      totalCost += ((costMap[String(salesData[i][2]) + "_" + String(salesData[i][3])] || 0) * qty);
    }
  }
  replyLine(replyToken, "📈 【本月即時戰報】(" + (currentMonth + 1) + "月)\n----------\n💰 累積營收：$" + totalRev.toLocaleString() + "\n✨ 估計淨利：$" + (totalRev - totalCost).toLocaleString());
}

// --- 2. 自動結算【上月】(每月1號自動發送) ---
function sendMonthlySummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salesSheet = ss.getSheetByName("銷售紀錄"), invSheet = ss.getSheetByName("庫存表");
  if (!salesSheet || !invSheet) return;
  var salesData = salesSheet.getDataRange().getValues(), invData = invSheet.getDataRange().getValues();

  var now = new Date();
  var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var reportYear = lastMonthDate.getFullYear();
  var reportMonth = lastMonthDate.getMonth();

  var totalRev = 0, totalCost = 0, totalQty = 0, costMap = {};
  for (var j = 1; j < invData.length; j++) {
    costMap[String(invData[j][0]) + "_" + String(invData[j][2])] = parseFloat(invData[j][3]) || 0;
  }
  for (var i = 1; i < salesData.length; i++) {
    var saleDate = new Date(salesData[i][0]);
    if (saleDate.getFullYear() === reportYear && saleDate.getMonth() === reportMonth) {
      var sku = String(salesData[i][2]), spec = String(salesData[i][3]);
      var qty = parseInt(salesData[i][4]) || 0, rev = parseFloat(salesData[i][5]) || 0;
      totalRev += rev;
      totalCost += ((costMap[sku + "_" + spec] || 0) * qty);
      totalQty += qty;
    }
  }
  var msg = "🗓️ " + reportYear + "年" + (reportMonth + 1) + "月 業績總結報表\n" +
            "------------------\n" +
            "💰 總月營收：$" + totalRev.toLocaleString() + "\n" +
            "🧧 估計淨利：$" + (totalRev - totalCost).toLocaleString() + "\n" +
            "📦 銷售總數：" + totalQty + " 件\n" +
            "------------------\n辛苦了，新的一月加油！💪";
  RECIPIENTS.forEach(function(id) { pushMessage(id, msg); });
}

// --- 3. 每日業績回報 (包含詳細支付方式) ---
function sendDailySummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salesSheet = ss.getSheetByName("銷售紀錄");
  if (!salesSheet) return;
  var salesData = salesSheet.getDataRange().getValues();
  var today = new Date();
  var formattedDate = Utilities.formatDate(today, "GMT+8", "yyyy/MM/dd");

  var totalRev = 0;
  var payStats = { "現金": 0, "LINE Pay": 0, "刷卡": 0, "匯款": 0, "其他": 0 };
  var details = [];

  for (var i = 1; i < salesData.length; i++) {
    var saleDate = new Date(salesData[i][0]);
    if (isSameDay(saleDate, today)) {
      var sku = String(salesData[i][2]);
      var spec = String(salesData[i][3]);
      var qty = parseInt(salesData[i][4]);
      var rev = parseFloat(salesData[i][5]) || 0;
      var method = String(salesData[i][6] || "其他").trim().toUpperCase();

      totalRev += rev;

      if (method === "現金") payStats["現金"] += rev;
      else if (method.includes("LP") || method.includes("LINE")) payStats["LINE Pay"] += rev;
      else if (method.includes("刷卡") || method.includes("CARD")) payStats["刷卡"] += rev;
      else if (method.includes("匯款") || method.includes("轉帳") || method.includes("銀行")) payStats["匯款"] += rev;
      else payStats["其他"] += rev;

      details.push("▫️ " + sku + " (" + spec + ") x" + qty + " [" + method + "] $" + rev.toLocaleString());
    }
  }

  var msg = "📊 每日業績報表 (" + formattedDate + ")\n" +
            "------------------\n" +
            "💰 今日總營收：$" + totalRev.toLocaleString() + "\n\n" +
            "💳 支付方式統計：\n" +
            "▫️ 現金：$" + payStats["現金"].toLocaleString() + "\n" +
            "▫️ LINE Pay：$" + payStats["LINE Pay"].toLocaleString() + "\n" +
            "▫️ 刷卡：$" + payStats["刷卡"].toLocaleString() + "\n" +
            "▫️ 匯款：$" + payStats["匯款"].toLocaleString() + "\n" +
            (payStats["其他"] > 0 ? "▫️ 其他：$" + payStats["其他"].toLocaleString() + "\n" : "") +
            "------------------\n" +
            "📝 今日銷售明細：\n" +
            (details.length > 0 ? details.join("\n") : "今日暫無銷售紀錄。");
  RECIPIENTS.forEach(function(id) { pushMessage(id, msg); });
}

// ==========================================
// 核心處理模組 (含 Lock 機制)
// ==========================================

function handlePurchase(parts, replyToken, userId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet(),
        invSheet = ss.getSheetByName("庫存表"),
        purchaseSheet = ss.getSheetByName("進貨紀錄");
    var scriptProperties = PropertiesService.getScriptProperties();

    if (parts.length === 4 || parts.length === 5) {
      var sku = parts[1],
          spec = (parts.length === 5) ? parts[3] : parts[2],
          qty = parseInt(parts[parts.length - 1]);
      var data = invSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === sku && String(data[i][2]) === spec) {
          var newStock = (parseInt(data[i][5]) || 0) + qty;
          invSheet.getRange(i + 1, 6).setValue(newStock);
          purchaseSheet.appendRow([new Date(), sku, spec, qty]);
          scriptProperties.setProperties({ [userId + "_lastSku"]: sku, [userId + "_lastSpec"]: spec });
          replyLine(replyToken, "📦 補貨成功！\n" + data[i][1] + " (" + spec + ")\n新庫存：" + newStock);
          return;
        }
      }
      replyLine(replyToken, "⚠️ 找不到商品規格");
    } else if (parts.length === 7) {
      var sku = parts[1], name = parts[2], spec = parts[3],
          cost = parts[4], price = parts[5], qty = parts[6];
      invSheet.appendRow([sku, name, spec, cost, price, qty]);
      purchaseSheet.appendRow([new Date(), sku, spec, qty]);
      scriptProperties.setProperties({ [userId + "_lastSku"]: sku, [userId + "_lastSpec"]: spec });
      replyLine(replyToken, "✨ 新品「" + name + "」入庫成功！請傳照片。");
    }
  } catch(e) {
    replyLine(replyToken, "❌ 系統忙碌，請重試");
  } finally {
    lock.releaseLock();
  }
}

function handleSales(parts, replyToken, userId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet(),
        invSheet = ss.getSheetByName("庫存表"),
        salesSheet = ss.getSheetByName("銷售紀錄");

    if (!invSheet || !salesSheet) throw new Error("找不到庫存表或銷售紀錄工作表");

    var sku = parts[1], spec = parts[2],
        qty = parseInt(parts[3]), price = parseInt(parts[4]),
        pay = parts[5];
    if (!pay) pay = "未註明";
    if (pay.toUpperCase() === "LP") pay = "LINE Pay";

    var data = invSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === sku && String(data[i][2]) === spec) {
        var stock = parseInt(data[i][5]) || 0;
        if (stock >= qty) {
          invSheet.getRange(i + 1, 6).setValue(stock - qty);
          salesSheet.appendRow([new Date(), getUserName(userId), sku, spec, qty, price * qty, pay]);
          replyLine(replyToken, "✅ 出貨成功！剩餘：" + (stock - qty));
        } else {
          replyLine(replyToken, "❌ 庫存不足");
        }
        return;
      }
    }
    replyLine(replyToken, "⚠️ 找不到貨號：" + sku + " 或規格：" + spec);
  } catch(e) {
    replyLine(replyToken, "❌ 銷售失敗\n錯誤原因：" + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function handleImage(messageId, replyToken, userId) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sku  = scriptProperties.getProperty(userId + "_lastSku");
  var spec = scriptProperties.getProperty(userId + "_lastSpec");

  if (!sku) {
    replyLine(replyToken, "⚠️ 找不到上次入庫紀錄，請重新執行入庫指令後再傳圖片。");
    return;
  }

  try {
    var response = UrlFetchApp.fetch(
      'https://api-data.line.me/v2/bot/message/' + messageId + '/content',
      { 'headers': { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN }, 'method': 'get' }
    );
    var safeName = sku + (spec ? "_" + spec : "") + ".jpg";
    var blob = response.getBlob().setName(safeName);
    var file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(shareErr) {}
    var url = "https://drive.google.com/file/d/" + file.getId() + "/view";

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var invSheet = ss.getSheetByName("庫存表");
    var data = invSheet.getDataRange().getValues();

    var found = false;
    for (var i = 1; i < data.length; i++) {
      var rowSku  = String(data[i][0]).trim();
      var rowSpec = String(data[i][2]).trim();
      var skuMatch  = rowSku === String(sku).trim();
      var specMatch = (spec !== null && spec !== undefined && spec !== "")
                        ? rowSpec === String(spec).trim()
                        : true;
      if (skuMatch && specMatch) {
        invSheet.getRange(i + 1, 7).setValue(url);
        replyLine(replyToken, "📸 圖片關聯成功！\n貨號：" + sku + (spec ? " / 規格：" + spec : ""));
        found = true;
        break;
      }
    }

    if (!found) {
      replyLine(replyToken,
        "⚠️ 圖片已上傳但找不到對應商品列\n" +
        "貨號：" + sku + (spec ? " / 規格：" + spec : "") + "\n" +
        "請手動將以下連結貼到庫存表G欄：\n" + url);
    }
  } catch(e) {
    replyLine(replyToken, "❌ 圖片關聯失敗：" + e.toString());
  }
}

// --- 基礎查詢 & 打卡 ---
function handleQuery(keyword, replyToken) {
  var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("庫存表").getDataRange().getValues(),
      res = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === keyword || String(data[i][1]).indexOf(keyword) !== -1) {
      res.push("📦 [" + data[i][0] + "] " + data[i][1] + " - " + data[i][2] + " (剩:" + data[i][5] + ")");
    }
  }
  replyLine(replyToken, res.length > 0 ? res.slice(0, 5).join("\n") : "🔍 查無商品");
}

function handleClockIn(type, replyToken, userId) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("打卡紀錄").appendRow([new Date(), getUserName(userId), type, userId]);
  replyLine(replyToken, "⏰ " + type + " 成功！");
}

// ==========================================
// 代購訂單模組 (ProxyOrder Module) v3.0 — Dual-Write
// 代購訂單欄位：日期 姓名 商品編號 規格 進價 售價 數量 毛利 狀態 備註
// 索引：          0    1     2      3   4    5   6    7    8    9
// v3 新增：同步寫入 LIFF 訂單表 + 訂單明細，讓客人在 LIFF「我的訂單」看得到
// ==========================================

// --- 1. 新增代購訂單（Dual-Write 版，支援姓名含空格）---
// 指令：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]
// 姓名可含空格（例如 Sam Chen），規則：最後 5 個 token = 商品編號/規格/進價/售價/數量
function handleProxyOrder(parts, replyToken, userId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (parts.length < 7) {
      replyLine(replyToken,
        "⚠️ 格式錯誤\n" +
        "請輸入：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]\n" +
        "範例 1：代購 陳小美 A101 黑色M 280 580 2\n" +
        "範例 2：代購 Sam Chen A101 黑色M 280 580 2\n" +
        "※ 規格請勿含空格（寫 黑色M、不要寫 黑色 M）");
      return;
    }

    var last5Start = parts.length - 5;
    var name  = parts.slice(1, last5Start).join(" ");
    var sku   = parts[last5Start];
    var spec  = parts[last5Start + 1];
    var cost  = parseFloat(parts[last5Start + 2]) || 0;
    var price = parseFloat(parts[last5Start + 3]) || 0;
    var qty   = parseInt(parts[last5Start + 4])   || 0;

    if (qty <= 0) {
      replyLine(replyToken, "⚠️ 數量必須大於 0");
      return;
    }

    var subTotal = price * qty;
    var profit   = (price - cost) * qty;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1️⃣ 寫入代購訂單（HERA 原本邏輯）
    var proxySheet = ss.getSheetByName("代購訂單");
    if (!proxySheet) {
      proxySheet = ss.insertSheet("代購訂單");
      proxySheet.appendRow(["日期", "姓名", "商品編號", "規格", "進價", "售價", "數量", "毛利", "狀態", "備註"]);
    }

    var orderId = generateLiveOrderId_();
    proxySheet.appendRow([
      new Date(), name, sku, spec, cost, price, qty, profit, "手動加單", orderId
    ]);

    // 2️⃣ Dual-Write 到 LIFF 訂單表 + 訂單明細
    var liffStatus = "";
    try {
      var customerUserId = lookupCustomerUserId_(ss, name) || "";
      var campaign       = getCurrentCampaign_(ss);

      // 拆解商品編號（F01細肩浪漫短洋 → code=F01, name=細肩浪漫短洋）
      // 讓 LIFF 訂單明細的商品編號/商品名稱跟 migration 格式一致，統計才不會拆成兩組
      var parsed         = parseProxyProductCode_(sku);
      var cleanCode      = parsed.code;
      var productName    = parsed.name
        ? (parsed.code + " " + parsed.name)
        : (lookupProductName_(ss, parsed.code, spec) || parsed.code);

      var orderTime      = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
      var itemsText      = productName + (spec ? " / " + spec : "") + " x" + qty + " (NT$" + price + ")";

      var ordersSheet = ss.getSheetByName(LIFF_ORDERS_TAB);
      if (ordersSheet) {
        ordersSheet.appendRow([
          orderTime, orderId, customerUserId, name, itemsText,
          subTotal, "", "手動加單", campaign
        ]);
      }

      var itemsSheet = ss.getSheetByName(LIFF_ORDER_ITEMS_TAB);
      if (itemsSheet) {
        itemsSheet.appendRow([
          orderId, "", cleanCode, productName, spec, price, qty, subTotal, campaign
        ]);
      }

      liffStatus = customerUserId
        ? "\n✅ 客人 LIFF 可見"
        : "\n⚠️ 此客人尚未登記，請提醒加 LINE@ 後點登記按鈕";
    } catch (liffErr) {
      liffStatus = "\n⚠️ LIFF 同步失敗：" + liffErr.toString().substring(0, 50);
    }

    replyLine(replyToken,
      "🛍️ 代購訂單已登記！\n" +
      "----------\n" +
      "👤 客人：" + name + "\n" +
      "📦 商品：" + sku + " (" + spec + ")\n" +
      "🔢 數量：" + qty + "\n" +
      "💵 進價：$" + cost.toLocaleString() + "\n" +
      "🏷️ 售價：$" + price.toLocaleString() + "\n" +
      "💰 應付金額：$" + subTotal.toLocaleString() +
      "\n📋 訂單：" + orderId +
      liffStatus);
  } catch (e) {
    replyLine(replyToken, "❌ 代購登記失敗\n錯誤原因：" + e.toString());
  } finally {
    lock.releaseLock();
  }
}

// --- 2. 查客戶訂單明細 ---
// 指令：代購客戶 [姓名]
function handleProxyCustomerQuery(parts, replyToken) {
  if (parts.length < 2) {
    replyLine(replyToken, "⚠️ 請輸入：代購客戶 [姓名]");
    return;
  }
  var targetName = parts.slice(1).join(" ");

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("代購訂單");
  if (!sheet) { replyLine(replyToken, "⚠️ 尚未建立代購訂單分頁"); return; }

  var data = sheet.getDataRange().getValues();
  var lines = [];
  var totalQty = 0, totalAmount = 0, pendingCount = 0;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === targetName.trim()) {
      var sku   = data[i][2];
      var spec  = data[i][3];
      var price = parseFloat(data[i][5]) || 0;
      var qty   = parseInt(data[i][6]) || 0;
      var sub   = price * qty;
      var status = data[i][8] || "手動加單";
      if (status === "已取消") continue;

      var markMap = { "已完成": "✅", "已取貨": "✅", "已付款": "💰", "已到貨": "📦" };
      var mark = markMap[status] || "⏳";
      lines.push(mark + " " + sku + " (" + spec + ") x" + qty + " = $" + sub.toLocaleString());

      totalQty    += qty;
      totalAmount += sub;
      if (status === "手動加單" || status === "已到貨" || status === "未取貨") pendingCount++;
    }
  }

  if (lines.length === 0) {
    replyLine(replyToken, "🔍 查無客戶「" + targetName + "」的代購紀錄");
    return;
  }

  var msg =
    "📋 代購明細：" + targetName + "\n" +
    "------------------\n" +
    lines.join("\n") + "\n" +
    "------------------\n" +
    "📦 件數合計：" + totalQty + " 件\n" +
    "💰 應付總額：$" + totalAmount.toLocaleString() + "\n" +
    "⏳ 未取貨：" + pendingCount + " 筆";

  replyLine(replyToken, msg);
}

// --- 3. 代購總表（彙整訂貨資訊） ---
// 指令 A：代購總表                 → 全品項彙整
// 指令 B：代購總表 [商品編號]      → 單一商品所有規格
function handleProxyAllSummary(parts, replyToken) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("代購訂單");
  if (!sheet) { replyLine(replyToken, "⚠️ 尚未建立代購訂單分頁"); return; }

  var filterSku = (parts.length >= 2) ? String(parts[1]).trim() : null;

  var data = sheet.getDataRange().getValues();
  var stat = {};
  var orderKeys = [];

  for (var i = 1; i < data.length; i++) {
    var sku  = String(data[i][2]);
    var spec = String(data[i][3]);
    var qty  = parseInt(data[i][6]) || 0;
    var cost = parseFloat(data[i][4]) || 0;
    if (!sku || qty <= 0) continue;
    if (filterSku && sku !== filterSku) continue;

    var key = sku + "_" + spec;
    if (!stat[key]) {
      stat[key] = { sku: sku, spec: spec, qty: 0, cost: cost, customers: {} };
      orderKeys.push(key);
    }
    stat[key].qty += qty;
    stat[key].cost = cost;
    var customer = String(data[i][1]);
    stat[key].customers[customer] = (stat[key].customers[customer] || 0) + qty;
  }

  if (orderKeys.length === 0) {
    replyLine(replyToken, filterSku
      ? "🔍 查無商品編號「" + filterSku + "」的代購訂單"
      : "🔍 目前無代購訂單");
    return;
  }

  var lines = [];
  var grandQty = 0;
  for (var k = 0; k < orderKeys.length; k++) {
    var item = stat[orderKeys[k]];
    var custNames = Object.keys(item.customers).join("、");
    if (filterSku) {
      lines.push(
        "📐 " + item.spec + " x " + item.qty + " 件\n" +
        "   └ 進價：$" + item.cost.toLocaleString() + "\n" +
        "   └ 客人：" + custNames);
    } else {
      lines.push(
        "📦 " + item.sku + " (" + item.spec + ") x " + item.qty + " 件\n" +
        "   └ 進價：$" + item.cost.toLocaleString() + "\n" +
        "   └ 客人：" + custNames);
    }
    grandQty += item.qty;
  }

  var header = filterSku
    ? "📑 代購單品明細：" + filterSku
    : "📑 代購訂貨總表";

  var msg =
    header + "\n" +
    "------------------\n" +
    lines.join("\n") + "\n" +
    "------------------\n" +
    "🧾 總件數：" + grandQty + " 件";

  if (msg.length > 4800) {
    msg = msg.substring(0, 4700) + "\n\n⚠️ 內容過長已截斷，請開試算表查看完整表格";
  }

  replyLine(replyToken, msg);
}

// --- 4. 代購出貨（將客戶所有未取貨訂單標記為已取貨）---
// 指令：代購出貨 [姓名]
function handleProxyDeliver(parts, replyToken) {
  if (parts.length < 2) {
    replyLine(replyToken, "⚠️ 請輸入：代購出貨 [姓名]");
    return;
  }
  var targetName = parts.slice(1).join(" ");

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("代購訂單");
    if (!sheet) { replyLine(replyToken, "⚠️ 尚未建立代購訂單分頁"); return; }

    var data = sheet.getDataRange().getValues();
    var updatedCount = 0;
    var totalAmount = 0;
    var itemLines = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === targetName.trim() &&
          String(data[i][8]) !== "已完成" && String(data[i][8]) !== "已取貨") {
        sheet.getRange(i + 1, 9).setValue("已完成");

        var sku   = data[i][2];
        var spec  = data[i][3];
        var price = parseFloat(data[i][5]) || 0;
        var qty   = parseInt(data[i][6]) || 0;
        var sub   = price * qty;
        totalAmount += sub;
        updatedCount++;
        itemLines.push("✅ " + sku + " (" + spec + ") x" + qty + " = $" + sub.toLocaleString());
      }
    }

    if (updatedCount === 0) {
      replyLine(replyToken, "🔍 查無客戶「" + targetName + "」的待完成訂單");
      return;
    }

    replyLine(replyToken,
      "🎉 出貨完成！\n" +
      "👤 客人：" + targetName + "\n" +
      "------------------\n" +
      itemLines.join("\n") + "\n" +
      "------------------\n" +
      "📦 出貨筆數：" + updatedCount + " 筆\n" +
      "💰 收款金額：$" + totalAmount.toLocaleString());
  } catch (e) {
    replyLine(replyToken, "❌ 出貨失敗\n錯誤原因：" + e.toString());
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// LIFF Dual-Write 輔助函式
// ==========================================

function generateLiveOrderId_() {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, "0"); };
  var date =
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  var rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return date + "-" + rand + "L"; // L = Live 直播訂單
}

function lookupCustomerUserId_(ss, name) {
  var sheet = ss.getSheetByName(LIFF_CUSTOMERS_TAB);
  if (!sheet) return "";
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(name).trim()) {
      return String(data[i][1] || "");
    }
  }
  return "";
}

function getCurrentCampaign_(ss) {
  var sheet = ss.getSheetByName(LIFF_SETTINGS_TAB);
  if (!sheet) return "快速下單";
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === "title") {
      return String(data[i][1] || "快速下單");
    }
  }
  return "快速下單";
}

function lookupProductName_(ss, code, spec) {
  var sheet = ss.getSheetByName(LIFF_PRODUCTS_TAB);
  if (!sheet) return "";
  var data = sheet.getDataRange().getValues();
  // 商品表欄位：id | code | name | spec | price | stock | image | description | active
  var fallback = "";
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(code).trim()) {
      if (!fallback) fallback = String(data[i][2] || "");
      if (String(data[i][3] || "").trim() === String(spec || "").trim()) {
        return String(data[i][2] || "");
      }
    }
  }
  return fallback;
}

// 拆解商品編號：F01細肩浪漫短洋 → {code:"F01", name:"細肩浪漫短洋"}
// 跟 migration_legacy_proxy_orders.gs 的 parseProductCode_ 一致，確保新/舊訂單在統計分頁能正確合併
function parseProxyProductCode_(raw) {
  if (!raw) return { code: "", name: "" };
  var s = String(raw).trim();
  var m = s.match(/^([A-Za-z]+\d+)[\s\-_]*(.*)$/);
  if (m) {
    return { code: m[1], name: m[2].trim() };
  }
  return { code: s, name: "" };
}

// ==========================================
// 底層工具 (User Profile / LINE API / 日期)
// ==========================================

function getUserName(uid) {
  try {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + uid, {
      'headers': { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
      'method': 'get',
      'muteHttpExceptions': true
    });
    if (res.getResponseCode() == 200) {
      return JSON.parse(res.getContentText()).displayName;
    }
  } catch(e) {
    console.log("無法獲取使用者名稱: " + e.message);
  }
  return "店員";
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear()
      && d1.getMonth() === d2.getMonth()
      && d1.getDate() === d2.getDate();
}

function replyLine(token, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    'headers': { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    'method': 'post',
    'payload': JSON.stringify({ 'replyToken': token, 'messages': [{ 'type': 'text', 'text': text }] })
  });
}

function pushMessage(to, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    'headers': { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    'method': 'post',
    'payload': JSON.stringify({ 'to': to, 'messages': [{ 'type': 'text', 'text': text }] })
  });
}
