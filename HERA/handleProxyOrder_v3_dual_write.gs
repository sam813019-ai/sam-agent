// ==========================================
// HERA 代購訂單 v3 — Dual-Write 版
// 更新日期：2026-04-21
// 功能：店員用「代購」bot 指令下單時，除了寫入 HERA 代購訂單，
//       同時寫入 LIFF 系統的 訂單表、訂單明細，讓客人能在 LIFF「我的訂單」看到。
// ==========================================
// 【使用說明】
// 1. 打開 HERA系統_完整版.gs
// 2. 找到現有的 function handleProxyOrder(parts, replyToken, userId) { ... }
// 3. 整段刪掉，貼上下面這整個檔案的內容
// 4. 儲存後，bot 指令「代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]」就會雙寫
// ==========================================

// --- LIFF 系統分頁名稱（對應 line-order 專案的 Google Sheet，就是同一本）---
var LIFF_ORDERS_TAB      = "訂單表";
var LIFF_ORDER_ITEMS_TAB = "訂單明細";
var LIFF_CUSTOMERS_TAB   = "客戶對照";
var LIFF_SETTINGS_TAB    = "設定";
var LIFF_PRODUCTS_TAB    = "商品表";

// --- 主指令：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量] ---
function handleProxyOrder(parts, replyToken, userId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (parts.length < 7) {
      replyLine(replyToken,
        "⚠️ 格式錯誤\n" +
        "請輸入：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]\n" +
        "範例：代購 陳小美 A101 黑色M 280 580 2");
      return;
    }

    var name  = parts[1];
    var sku   = parts[2];
    var spec  = parts[3];
    var cost  = parseFloat(parts[4]) || 0;
    var price = parseFloat(parts[5]) || 0;
    var qty   = parseInt(parts[6])   || 0;

    if (qty <= 0) {
      replyLine(replyToken, "⚠️ 數量必須大於 0");
      return;
    }

    var subTotal = price * qty;
    var profit   = (price - cost) * qty;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1️⃣ 寫入 HERA 代購訂單（原本就有的邏輯）
    var proxySheet = ss.getSheetByName("代購訂單");
    if (!proxySheet) {
      proxySheet = ss.insertSheet("代購訂單");
      proxySheet.appendRow(["日期", "姓名", "商品編號", "規格", "進價", "售價", "數量", "毛利", "狀態", "備註"]);
    }

    // 先產生 orderId，備註欄放進去（方便對帳）
    var orderId = generateLiveOrderId_();

    proxySheet.appendRow([
      new Date(), name, sku, spec, cost, price, qty, profit, "未取貨", orderId
    ]);

    // 2️⃣ Dual-Write 到 LIFF 系統
    var liffStatus = "";
    try {
      var customerUserId = lookupCustomerUserId_(ss, name) || "";
      var campaign       = getCurrentCampaign_(ss);
      var productName    = lookupProductName_(ss, sku, spec) || sku;
      var orderTime      = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");

      // 2a. 訂單表 (A~I)：訂單時間 | 訂單編號 | userId | 顧客名稱 | 商品明細 | 總金額 | 備註 | 狀態 | 連線代購
      var itemsText = productName +
        (spec ? " / " + spec : "") +
        " x" + qty + " (NT$" + price + ")";

      var ordersSheet = ss.getSheetByName(LIFF_ORDERS_TAB);
      if (ordersSheet) {
        ordersSheet.appendRow([
          orderTime,
          orderId,
          customerUserId,
          name,
          itemsText,
          subTotal,
          "",
          "直播訂單",
          campaign
        ]);
      }

      // 2b. 訂單明細 (A~I)：訂單編號 | 商品ID | 商品編號 | 商品名稱 | 規格 | 單價 | 數量 | 小計 | 連線代購
      var itemsSheet = ss.getSheetByName(LIFF_ORDER_ITEMS_TAB);
      if (itemsSheet) {
        itemsSheet.appendRow([
          orderId,
          "",
          sku,
          productName,
          spec,
          price,
          qty,
          subTotal,
          campaign
        ]);
      }

      if (customerUserId) {
        liffStatus = "\n✅ 客人 LIFF 可見";
      } else {
        liffStatus = "\n⚠️ 此客人尚未登記，請提醒加 LINE@ 後點登記按鈕";
      }
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

// ==========================================
// 輔助函式（dual-write 專用，不影響其他模組）
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
