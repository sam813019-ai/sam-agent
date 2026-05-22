// ==========================================
// 代購訂單歷史資料遷移工具（一次性使用）
// 用途：把代購訂單分頁裡沒有 orderId 的舊資料，補寫到 LIFF 訂單表/訂單明細，
//      讓客人登記後能在 LIFF「我的訂單」看到歷史訂單，並讓統計分頁包含舊資料。
// 使用日期：2026-04-21
// ==========================================
// 【使用流程】
//   1. 整個檔案內容複製，新增到 HERA Apps Script 編輯器（可以放在獨立 .gs 檔案）
//   2. 先執行 dryRunLegacyMigration() → 看執行記錄報告
//   3. 確認報告沒問題，再執行 executeLegacyMigration() → 正式遷移
//   4. 遷移後本檔案就可以刪除
// ==========================================

// 常數：跟 HERA 主程式一致
var MIG_LIFF_ORDERS_TAB      = "訂單表";
var MIG_LIFF_ORDER_ITEMS_TAB = "訂單明細";
var MIG_LIFF_CUSTOMERS_TAB   = "客戶對照";
var MIG_LIFF_SETTINGS_TAB    = "設定";

// --- 拆解商品編號 (F01細肩浪漫短洋 → {code:"F01", name:"細肩浪漫短洋"}) ---
function parseProductCode_(raw) {
  if (!raw) return { code: "", name: "" };
  var s = String(raw).trim();
  var m = s.match(/^([A-Za-z]+\d+)[\s\-_]*(.*)$/);
  if (m) {
    return { code: m[1], name: m[2].trim() };
  }
  // 解析失敗：整串當 code，name 空白
  return { code: s, name: "" };
}

// --- 產 orderId（LEGACY 版）---
function generateLegacyOrderId_(seq) {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, "0"); };
  var date = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  return "LEGACY-" + date + "-" + pad(seq);
}

// ==========================================
// 1. Dry-Run：只統計不寫入
// ==========================================
function dryRunLegacyMigration() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var proxySheet = ss.getSheetByName("代購訂單");
  if (!proxySheet) { Logger.log("❌ 找不到代購訂單分頁"); return; }

  var data = proxySheet.getDataRange().getValues();
  var rowsTotal = data.length - 1;

  var rowsToMigrate = 0;
  var rowsAlreadyMigrated = 0;
  var rowsEmptyOrInvalid = 0;

  var uniqueNames = {};
  var uniqueCodes = {};
  var parseFailList = [];
  var samplePreview = [];

  // 客戶對照
  var customersSheet = ss.getSheetByName(MIG_LIFF_CUSTOMERS_TAB);
  var customerMap = {};
  if (customersSheet) {
    var cdata = customersSheet.getDataRange().getValues();
    for (var c = 1; c < cdata.length; c++) {
      if (cdata[c][0]) customerMap[String(cdata[c][0]).trim()] = String(cdata[c][1] || "");
    }
  }

  // 連線標題
  var campaign = "快速下單";
  var settingsSheet = ss.getSheetByName(MIG_LIFF_SETTINGS_TAB);
  if (settingsSheet) {
    var sdata = settingsSheet.getDataRange().getValues();
    for (var si = 1; si < sdata.length; si++) {
      if (String(sdata[si][0]).trim() === "title") {
        campaign = String(sdata[si][1] || "快速下單");
        break;
      }
    }
  }

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var name = String(r[1] || "").trim();
    var rawCode = String(r[2] || "").trim();
    var spec = String(r[3] || "").trim();
    var price = parseFloat(r[5]) || 0;
    var qty = parseInt(r[6]) || 0;
    var note = String(r[9] || "").trim();

    if (!name || !rawCode || qty <= 0) {
      rowsEmptyOrInvalid++;
      continue;
    }
    if (note) {
      rowsAlreadyMigrated++;
      continue;
    }

    rowsToMigrate++;

    uniqueNames[name] = (uniqueNames[name] || 0) + 1;
    uniqueCodes[rawCode] = (uniqueCodes[rawCode] || 0) + 1;

    var parsed = parseProductCode_(rawCode);
    if (!parsed.name) parseFailList.push(rawCode);

    if (samplePreview.length < 5) {
      samplePreview.push({
        row: i + 1,
        name: name,
        rawCode: rawCode,
        code: parsed.code,
        productName: parsed.name ? (parsed.code + " " + parsed.name) : parsed.code,
        spec: spec,
        price: price,
        qty: qty,
        userId: customerMap[name] || "（尚未登記）"
      });
    }
  }

  var uniqueNameCount = Object.keys(uniqueNames).length;
  var uniqueCodeCount = Object.keys(uniqueCodes).length;

  var registeredNames = 0;
  var unregisteredNames = [];
  for (var n in uniqueNames) {
    if (customerMap[n]) registeredNames++;
    else unregisteredNames.push(n);
  }

  var uniqueParseFail = Array.from(new Set(parseFailList));

  // 印報告
  Logger.log("===========================================");
  Logger.log("📊 代購訂單歷史資料遷移 - Dry Run 報告");
  Logger.log("===========================================");
  Logger.log("代購訂單分頁總列數：" + rowsTotal);
  Logger.log("✅ 已遷移（備註有 orderId）：" + rowsAlreadyMigrated);
  Logger.log("⚠️ 空白/無效跳過：" + rowsEmptyOrInvalid);
  Logger.log("🔄 本次將遷移：" + rowsToMigrate);
  Logger.log("-------------------------------------------");
  Logger.log("不重複客戶姓名：" + uniqueNameCount);
  Logger.log("  ↳ 已登記客戶對照（會馬上有 userId）：" + registeredNames);
  Logger.log("  ↳ 尚未登記（userId 先留空，等補綁）：" + (uniqueNameCount - registeredNames));
  Logger.log("-------------------------------------------");
  Logger.log("不重複商品編號（原始含名稱）：" + uniqueCodeCount);
  Logger.log("  ↳ 解析失敗（不符合「字母+數字」開頭）：" + uniqueParseFail.length);
  if (uniqueParseFail.length > 0) {
    Logger.log("    範例：" + uniqueParseFail.slice(0, 10).join(" / "));
    Logger.log("    （解析失敗的列會整串當 code，商品名稱留空）");
  }
  Logger.log("-------------------------------------------");
  Logger.log("連線代購欄將寫入：「" + campaign + "」");
  Logger.log("訂單狀態將寫入：「新訂單」");
  Logger.log("orderId 格式：LEGACY-YYYYMMDD-NN");
  Logger.log("===========================================");
  Logger.log("📋 前 5 筆預覽（實際寫入前的樣子）：");
  Logger.log("===========================================");
  for (var k = 0; k < samplePreview.length; k++) {
    var p = samplePreview[k];
    Logger.log("第 " + p.row + " 列：");
    Logger.log("  姓名: " + p.name + "（userId: " + p.userId + "）");
    Logger.log("  原商品編號: " + p.rawCode);
    Logger.log("  → 訂單明細商品編號: " + p.code);
    Logger.log("  → 訂單明細商品名稱: " + p.productName);
    Logger.log("  規格: " + p.spec + " / 單價: " + p.price + " / 數量: " + p.qty);
  }
  Logger.log("===========================================");
  Logger.log("✅ Dry Run 結束。如果以上看起來沒問題，");
  Logger.log("   請執行 executeLegacyMigration() 進行正式遷移");
  Logger.log("===========================================");

  if (unregisteredNames.length > 0 && unregisteredNames.length <= 30) {
    Logger.log("（尚未登記的客戶姓名清單，事後可用來邀請他們登記）:");
    Logger.log(unregisteredNames.join("、"));
  }
}

// ==========================================
// 2. Execute：正式遷移（會寫入三個分頁）
// ==========================================
function executeLegacyMigration() {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var proxySheet = ss.getSheetByName("代購訂單");
    var ordersSheet = ss.getSheetByName(MIG_LIFF_ORDERS_TAB);
    var itemsSheet = ss.getSheetByName(MIG_LIFF_ORDER_ITEMS_TAB);

    if (!proxySheet || !ordersSheet || !itemsSheet) {
      Logger.log("❌ 缺少必要分頁（代購訂單 / 訂單表 / 訂單明細）");
      return;
    }

    // 客戶對照
    var customerMap = {};
    var customersSheet = ss.getSheetByName(MIG_LIFF_CUSTOMERS_TAB);
    if (customersSheet) {
      var cdata = customersSheet.getDataRange().getValues();
      for (var c = 1; c < cdata.length; c++) {
        if (cdata[c][0]) customerMap[String(cdata[c][0]).trim()] = String(cdata[c][1] || "");
      }
    }

    // 連線
    var campaign = "快速下單";
    var settingsSheet = ss.getSheetByName(MIG_LIFF_SETTINGS_TAB);
    if (settingsSheet) {
      var sdata = settingsSheet.getDataRange().getValues();
      for (var si = 1; si < sdata.length; si++) {
        if (String(sdata[si][0]).trim() === "title") {
          campaign = String(sdata[si][1] || "快速下單");
          break;
        }
      }
    }

    var data = proxySheet.getDataRange().getValues();
    var ordersToAppend = [];
    var itemsToAppend = [];
    var orderIdUpdates = []; // {row: number, orderId: string}
    var seqCounter = 0;
    var migrated = 0;
    var skipped = 0;

    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var rowNum = i + 1;
      var name = String(r[1] || "").trim();
      var rawCode = String(r[2] || "").trim();
      var spec = String(r[3] || "").trim();
      var price = parseFloat(r[5]) || 0;
      var qty = parseInt(r[6]) || 0;
      var note = String(r[9] || "").trim();
      var dateCell = r[0];

      if (!name || !rawCode || qty <= 0 || note) {
        skipped++;
        continue;
      }

      seqCounter++;
      var orderId = generateLegacyOrderId_(seqCounter);
      var parsed = parseProductCode_(rawCode);
      var userId = customerMap[name] || "";
      var subTotal = price * qty;

      var productName = parsed.name ? (parsed.code + " " + parsed.name) : parsed.code;
      var itemsText = productName + (spec ? " / " + spec : "") + " x" + qty + " (NT$" + price + ")";

      // 日期處理：代購訂單 A 欄如果是 Date 物件用它，否則用今日
      var orderTime;
      if (dateCell instanceof Date) {
        orderTime = Utilities.formatDate(dateCell, "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
      } else {
        orderTime = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
      }

      ordersToAppend.push([
        orderTime, orderId, userId, name, itemsText,
        subTotal, "", "新訂單", campaign
      ]);
      itemsToAppend.push([
        orderId, "", parsed.code, productName, spec,
        price, qty, subTotal, campaign
      ]);
      orderIdUpdates.push({ row: rowNum, orderId: orderId });

      migrated++;
    }

    // 批次寫入訂單表、訂單明細
    if (ordersToAppend.length > 0) {
      ordersSheet.getRange(
        ordersSheet.getLastRow() + 1, 1,
        ordersToAppend.length, 9
      ).setValues(ordersToAppend);
    }
    if (itemsToAppend.length > 0) {
      itemsSheet.getRange(
        itemsSheet.getLastRow() + 1, 1,
        itemsToAppend.length, 9
      ).setValues(itemsToAppend);
    }

    // 回寫 orderId 到代購訂單備註欄（第 10 欄）
    for (var u = 0; u < orderIdUpdates.length; u++) {
      proxySheet.getRange(orderIdUpdates[u].row, 10).setValue(orderIdUpdates[u].orderId);
    }

    Logger.log("===========================================");
    Logger.log("✅ 遷移完成");
    Logger.log("===========================================");
    Logger.log("成功遷移：" + migrated + " 筆");
    Logger.log("跳過（已遷移/無效）：" + skipped + " 筆");
    Logger.log("訂單表新增：" + ordersToAppend.length + " 列");
    Logger.log("訂單明細新增：" + itemsToAppend.length + " 列");
    Logger.log("代購訂單備註欄回寫：" + orderIdUpdates.length + " 列");
    Logger.log("===========================================");
    Logger.log("💡 下一步：");
    Logger.log("1. 檢查訂單明細、統計分頁是否正確彙整");
    Logger.log("2. 邀請尚未登記的客戶點 LIFF 登記連結");
    Logger.log("3. 客戶登記後會自動綁訂單（若有加 LIFF 補綁邏輯）");
  } finally {
    lock.releaseLock();
  }
}
