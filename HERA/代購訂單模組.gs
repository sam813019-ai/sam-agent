// ==========================================
// 代購訂單模組 (ProxyOrder Module)
// 版本：v1.0
// 建立日期：2026-04-18
// ==========================================
// 【安裝步驟】
//   1. 在 Google 試算表新增一個分頁，命名為「代購訂單」
//      並在第 1 列加入標題：
//      日期 | 姓名 | 商品編號 | 規格 | 進價 | 售價 | 數量 | 小計 | 毛利 | 狀態 | 備註
//   2. 在 Apps Script 新增一個檔案（命名如 proxyOrder.gs），把本檔內容整段貼入
//   3. 打開你原本的 doPost 函數，在 if/else if 判斷鏈裡面加入下面這三行：
//        else if (userMsg.startsWith("代購客戶")) { handleProxyCustomerQuery(parts, replyToken); }
//        else if (userMsg === "代購總表")        { handleProxyAllSummary(replyToken); }
//        else if (userMsg.startsWith("代購"))    { handleProxyOrder(parts, replyToken, userId); }
//      ⚠️ 順序很重要：「代購客戶」和「代購總表」要放在「代購」前面，否則會被吃掉
//   4. （選配）在「格式」的 helpMsg 字串中，加入下列說明：
//        "8️⃣ 代購下單：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]\n" +
//        "9️⃣ 代購查客戶：代購客戶 [姓名]\n" +
//        "🔟 代購訂貨表：代購總表\n"
// ==========================================

// --- 1. 新增代購訂單 ---
// 指令：代購 [姓名] [商品編號] [規格] [進價] [售價] [數量]
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

    var subTotal = price * qty;            // 客人要付的錢
    var profit   = (price - cost) * qty;   // 毛利

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("代購訂單");
    if (!sheet) {
      sheet = ss.insertSheet("代購訂單");
      sheet.appendRow(["日期", "姓名", "商品編號", "規格", "進價", "售價", "數量", "小計", "毛利", "狀態", "備註"]);
    }

    sheet.appendRow([
      new Date(),
      name,
      sku,
      spec,
      cost,
      price,
      qty,
      subTotal,
      profit,
      "未取貨",
      ""
    ]);

    replyLine(replyToken,
      "🛍️ 代購訂單已登記！\n" +
      "----------\n" +
      "👤 客人：" + name + "\n" +
      "📦 商品：" + sku + " (" + spec + ")\n" +
      "🔢 數量：" + qty + "\n" +
      "💵 進價：$" + cost.toLocaleString() + "\n" +
      "🏷️ 售價：$" + price.toLocaleString() + "\n" +
      "💰 小計：$" + subTotal.toLocaleString() + "\n" +
      "✨ 毛利：$" + profit.toLocaleString());
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
  var targetName = parts[1];

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("代購訂單");
  if (!sheet) { replyLine(replyToken, "⚠️ 尚未建立代購訂單分頁"); return; }

  var data = sheet.getDataRange().getValues();
  var lines = [];
  var totalQty = 0;
  var totalAmount = 0;
  var totalProfit = 0;
  var pendingCount = 0;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === targetName.trim()) {
      var sku    = data[i][2];
      var spec   = data[i][3];
      var qty    = parseInt(data[i][6]) || 0;
      var sub    = parseFloat(data[i][7]) || 0;
      var profit = parseFloat(data[i][8]) || 0;
      var status = data[i][9] || "未取貨";

      var mark = (status === "已取貨") ? "✅" : "⏳";
      lines.push(mark + " " + sku + " (" + spec + ") x" + qty + " = $" + sub.toLocaleString());

      totalQty    += qty;
      totalAmount += sub;
      totalProfit += profit;
      if (status !== "已取貨") pendingCount++;
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
    "✨ 毛利合計：$" + totalProfit.toLocaleString() + "\n" +
    "⏳ 未取貨：" + pendingCount + " 筆";

  replyLine(replyToken, msg);
}

// --- 3. 代購總表（依商品編號 + 規格彙整，方便跟廠商訂貨） ---
// 指令：代購總表
function handleProxyAllSummary(replyToken) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("代購訂單");
  if (!sheet) { replyLine(replyToken, "⚠️ 尚未建立代購訂單分頁"); return; }

  var data = sheet.getDataRange().getValues();
  // 以「商品編號_規格」為 key 彙整
  var stat = {};
  var orderKeys = []; // 保留加入順序

  for (var i = 1; i < data.length; i++) {
    var sku  = String(data[i][2]);
    var spec = String(data[i][3]);
    var qty  = parseInt(data[i][6]) || 0;
    var cost = parseFloat(data[i][4]) || 0;
    if (!sku || qty <= 0) continue;

    var key = sku + "_" + spec;
    if (!stat[key]) {
      stat[key] = { sku: sku, spec: spec, qty: 0, cost: cost, customers: {} };
      orderKeys.push(key);
    }
    stat[key].qty  += qty;
    stat[key].cost  = cost; // 以最新進價為準
    var customer = String(data[i][1]);
    stat[key].customers[customer] = (stat[key].customers[customer] || 0) + qty;
  }

  if (orderKeys.length === 0) {
    replyLine(replyToken, "🔍 目前無代購訂單");
    return;
  }

  var lines = [];
  var grandQty = 0;
  var grandCost = 0;
  for (var k = 0; k < orderKeys.length; k++) {
    var item = stat[orderKeys[k]];
    var custNames = Object.keys(item.customers).join("、");
    lines.push(
      "📦 " + item.sku + " (" + item.spec + ")\n" +
      "   └ 訂貨 " + item.qty + " 件 / 進價 $" + item.cost.toLocaleString() +
      " / 小計 $" + (item.qty * item.cost).toLocaleString() + "\n" +
      "   └ 客人：" + custNames);
    grandQty  += item.qty;
    grandCost += item.qty * item.cost;
  }

  var msg =
    "📑 代購訂貨總表\n" +
    "------------------\n" +
    lines.join("\n") + "\n" +
    "------------------\n" +
    "🧾 總件數：" + grandQty + " 件\n" +
    "💸 預估進貨成本：$" + grandCost.toLocaleString();

  // LINE 訊息上限 5000 字，過長就截斷提醒
  if (msg.length > 4800) {
    msg = msg.substring(0, 4700) + "\n\n⚠️ 內容過長已截斷，請開試算表查看完整表格";
  }

  replyLine(replyToken, msg);
}
