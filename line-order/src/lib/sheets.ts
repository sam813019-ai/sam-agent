import { google } from "googleapis";
import { Readable } from "stream";
import type {
  OrderPayload,
  OrderRecord,
  PendingPayment,
  Product,
  ReadyToShip,
  Settings,
} from "@/types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const PRODUCTS_TAB = process.env.PRODUCTS_SHEET_NAME || "商品表";
const ORDERS_TAB = process.env.ORDERS_SHEET_NAME || "訂單表";
const SETTINGS_TAB = process.env.SETTINGS_SHEET_NAME || "設定";
const ORDER_ITEMS_TAB = process.env.ORDER_ITEMS_SHEET_NAME || "訂單明細";
const CUSTOMERS_TAB = process.env.CUSTOMERS_SHEET_NAME || "客戶對照";
const PROXY_ORDERS_TAB = process.env.PROXY_ORDERS_SHEET_NAME || "代購訂單";
const INVENTORY_TAB = process.env.INVENTORY_SHEET_NAME || "庫存表";
const SALES_TAB = process.env.SALES_SHEET_NAME || "銷售紀錄";
const PURCHASE_TAB = process.env.PURCHASE_SHEET_NAME || "進貨紀錄";

function getClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}


/**
 * 附加一列到指定分頁。
 *
 * ⚠️ 不用 values.append —— 它會在給定 range 內「偵測資料表」再對齊那個表的起始欄，
 * range 給 `A:R` 時偵測會不穩定，實測 2026-09-05 整批訂單被寫到 F 欄起（位移 5 欄）。
 * 這裡自己算出下一列，用 values.update 寫明確範圍，位置 100% 確定。
 */
async function appendRowStrict(
  tab: string,
  values: (string | number)[],
  lastCol: string
) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:A`,
  });
  const nextRow = (res.data.values?.length || 0) + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A${nextRow}:${lastCol}${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
  return nextRow;
}

function normalizeImageUrl(url: string): string {
  // 把 Google Drive 分享連結轉成可直接顯示的 lh3 格式
  const drivePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:export=view&)?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of drivePatterns) {
    const m = url.match(re);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  }
  return url;
}

function parseImages(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n|,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeImageUrl);
}

/**
 * 商品表欄位 (A~K)：
 * id | code | name | spec | price | stock | image | description | active | costPrice | category
 */
export async function getProducts(): Promise<Product[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PRODUCTS_TAB}!A2:K`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      code: r[1] ? String(r[1]) : undefined,
      name: String(r[2] || ""),
      spec: r[3] ? String(r[3]) : undefined,
      price: Number(r[4] || 0),
      costPrice: Number(r[9] || 0),
      stock: Number(r[5] || 0),
      images: parseImages(r[6] ? String(r[6]) : undefined),
      description: r[7] ? String(r[7]) : undefined,
      active: String(r[8] || "").toUpperCase() !== "FALSE",
      category: r[10] ? String(r[10]) : undefined,
    }))
    .filter((p) => p.active)
    .reverse();
}

/**
 * 設定表 (A~B)：key | value
 */
export async function getSettings(): Promise<Settings> {
  const sheets = getClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SETTINGS_TAB}!A2:B`,
    });
    const rows = res.data.values || [];
    const map = Object.fromEntries(
      rows.filter((r) => r[0]).map((r) => [String(r[0]), String(r[1] || "")])
    );
    return {
      title: map.title || "快速下單",
      ...paymentSettingsFrom(map),
    };
  } catch {
    return { title: "快速下單", ...paymentSettingsFrom({}) };
  }
}

/** 匯款預設值。設定分頁讀不到時用這組，避免下單流程直接壞掉 */
const PAYMENT_FALLBACK = {
  bank: "國泰世華（013）",
  account: "014506140928",
  note: "匯款後填入匯款後五碼或是上傳截圖畫面或拍照核對 才算完成下單預購喔🫶",
  gift: "睫毛專用鑷子會隨貨附贈喔♥️",
};

function paymentSettingsFrom(map: Record<string, string>) {
  const fee = Number(map.shipping_fee);
  return {
    shippingFee: Number.isFinite(fee) && fee >= 0 ? fee : 60,
    giftNote: map.gift_note ?? PAYMENT_FALLBACK.gift,
    // 只有明確寫 FALSE 才關閉，沒設定時預設開啟
    paymentEnabled: String(map.payment_enabled || "").toUpperCase() !== "FALSE",
    paymentBank: map.payment_bank || PAYMENT_FALLBACK.bank,
    paymentAccount: map.payment_account || PAYMENT_FALLBACK.account,
    paymentNote: map.payment_note || PAYMENT_FALLBACK.note,
  };
}

/**
 * 訂單表 (A~I)：
 * 訂單時間 | 訂單編號 | LINE UserId | 顧客名稱 | 商品明細 | 總金額 | 備註 | 狀態 | 連線代購
 *
 * 訂單明細 (A~I)：
 * 訂單編號 | 商品ID | 商品編號 | 商品名稱 | 規格 | 單價 | 數量 | 小計 | 連線代購
 */
export async function appendOrder(
  payload: OrderPayload,
  orderId: string,
  total: number,
  campaign: string
) {
  const sheets = getClient();
  const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  const itemsText = payload.items
    .map((i) => {
      const label = i.spec ? `${i.productName} / ${i.spec}` : i.productName;
      return `${label} x${i.quantity} (NT$${i.unitPrice})`;
    })
    .join("\n");

  // 主訂單
  await appendRowStrict(
    ORDERS_TAB,
    [
      now,
      orderId,
      payload.userId,
      payload.displayName,
      itemsText,
      total,
      payload.note || "",
      "新訂單",
      campaign,
      // J~M：匯款核對。下單當下一律待匯款，回報後才填 K/L/M
      "待匯款",
      "",
      "",
      "",
      // N~R：7-11 取貨資訊，核對確認後客人才填
      "",
      "",
      "",
      "",
      "",
    ],
    "R"
  );

  // 訂單明細（一列一項商品，便於統計）
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${ORDER_ITEMS_TAB}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: payload.items.map((i) => [
          orderId,
          i.productId,
          i.code || "",
          i.productName,
          i.spec || "",
          i.unitPrice,
          i.quantity,
          i.unitPrice * i.quantity,
          campaign,
        ]),
      },
    });
  } catch (e) {
    console.warn("訂單明細分頁寫入失敗（可能尚未建立）:", e);
  }

  // 代購訂單（與 HERA 共用分頁；11 欄：日期 姓名 商品編號 品名 規格 進價 售價 數量 毛利 狀態 備註）
  try {
    // 從商品表查進價，建立 productId → costPrice 對照表
    const costMap = new Map<string, number>();
    try {
      const prodRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${PRODUCTS_TAB}!A2:J`,
      });
      for (const r of prodRes.data.values || []) {
        if (r[0]) costMap.set(String(r[0]), Number(r[9] || 0));
      }
    } catch {}

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${PROXY_ORDERS_TAB}!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: payload.items.map((i) => {
          const costPrice = costMap.get(i.productId) ?? 0;
          const profit = (i.unitPrice - costPrice) * i.quantity;
          return [
            now,
            payload.displayName,
            i.code || i.productId,
            i.productName,
            i.spec || "",
            costPrice,
            i.unitPrice,
            i.quantity,
            profit,
            "新訂單",
            orderId,
          ];
        }),
      },
    });
  } catch (e) {
    console.warn("代購訂單分頁寫入失敗（可能尚未建立）:", e);
  }
}

/**
 * 客戶對照 (A~D)：姓名 | userId | LINE暱稱 | 首次登記時間
 * 用途：HERA 代購 bot 可透過「姓名」反查 userId，LIFF 就能顯示直播訂單
 */
export async function upsertCustomer(
  userId: string,
  displayName: string,
  realName?: string
) {
  const sheets = getClient();
  const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${CUSTOMERS_TAB}!A2:D`,
    });
    const rows = res.data.values || [];
    const idx = rows.findIndex((r) => r[1] === userId);

    if (idx === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${CUSTOMERS_TAB}!A:D`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[realName || displayName, userId, displayName, now]],
        },
      });
      return { created: true };
    }

    if (realName && rows[idx][0] !== realName) {
      const rowNum = idx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${CUSTOMERS_TAB}!A${rowNum}:C${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[realName, userId, displayName]] },
      });
      return { updated: true };
    }
    return { unchanged: true };
  } catch (e) {
    console.warn("客戶對照寫入失敗（可能尚未建立分頁）:", e);
    return { error: true };
  }
}

/**
 * 自動補綁歷史訂單：掃描 訂單表 中「顧客名稱 = name 且 userId 空白」的列，填入 userId
 * 用於客人在 /register 頁輸入真實姓名後，補綁先前 HERA bot 代購 或 migration 留下的歷史訂單
 * 回傳補綁筆數
 */
export async function bindHistoricalOrders(
  userId: string,
  names: string[]
): Promise<number> {
  const sheets = getClient();
  const trimmedNames = Array.from(
    new Set(names.map((n) => (n || "").trim()).filter(Boolean))
  );
  if (trimmedNames.length === 0) return 0;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${ORDERS_TAB}!A2:I`,
    });
    const rows = res.data.values || [];

    const updates: { range: string; values: string[][] }[] = [];
    rows.forEach((r, i) => {
      const rowUserId = (r[2] || "").toString().trim();
      const rowName = (r[3] || "").toString().trim();
      if (rowUserId) return;
      if (!trimmedNames.includes(rowName)) return;
      const rowNum = i + 2;
      updates.push({
        range: `${ORDERS_TAB}!C${rowNum}`,
        values: [[userId]],
      });
    });

    if (updates.length === 0) return 0;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    });
    return updates.length;
  } catch (e) {
    console.warn("bindHistoricalOrders 失敗:", e);
    return 0;
  }
}

// ─── 後台管理 ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  code: string;
  name: string;
  spec: string;
  costPrice: number;
  price: number;
  stock: number;
  imageUrl: string;
}

/** 讀庫存表（後台選商品下拉用） */
export async function getInventoryRaw(): Promise<InventoryItem[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${INVENTORY_TAB}!A2:G`,
  });
  return (res.data.values || [])
    .filter((r) => r[0])
    .map((r) => ({
      code: String(r[0] || ""),
      name: String(r[1] || ""),
      spec: String(r[2] || ""),
      costPrice: Number(r[3] || 0),
      price: Number(r[4] || 0),
      stock: Number(r[5] || 0),
      imageUrl: String(r[6] || ""),
    }));
}

export interface AddProductPayload {
  code: string;
  name: string;
  spec: string;
  costPrice: number;
  price: number;
  stock: number;
  imageUrls?: string[];  // 多圖，逗號串接存 Sheet
  imageUrl?: string;     // 舊欄位相容保留
  description?: string;
  category?: string;
  writeToInventory: boolean;
  writeToProducts: boolean;
}

/** 後台上架：寫入庫存表 and/or 商品表 */
export async function addInventoryProduct(
  payload: AddProductPayload
): Promise<{ written: string[] }> {
  const sheets = getClient();
  const written: string[] = [];

  // 多圖合併（優先用 imageUrls，fallback 到舊的 imageUrl）
  const rawImages = payload.imageUrls?.filter(Boolean) ?? (payload.imageUrl ? [payload.imageUrl] : []);
  const imagesCell = rawImages.join(",");

  if (payload.writeToInventory) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${INVENTORY_TAB}!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          payload.code,
          payload.name,
          payload.spec,
          payload.costPrice,
          payload.price,
          payload.stock,
          imagesCell,
        ]],
      },
    });
    written.push("庫存表");
  }

  if (payload.writeToProducts) {
    const id = `P${Date.now()}`;
    const image = rawImages.length > 0
      ? rawImages.map(normalizeImageUrl).join(",")
      : "";
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${PRODUCTS_TAB}!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          id,
          payload.code,
          payload.name,
          payload.spec,
          payload.price,
          payload.stock,
          image,
          payload.description || "",
          "TRUE",
          payload.costPrice,   // J欄：進價
          payload.category || "",  // K欄：類別
        ]],
      },
    });
    written.push("商品表");
  }

  return { written };
}

export interface AddSalesPayload {
  date: string;
  clerk: string;
  productCode: string;
  spec: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
}

/** 後台新增銷售紀錄，並自動扣庫存表數量 */
export async function addSalesRecord(
  payload: AddSalesPayload
): Promise<{ newStock: number | null }> {
  const sheets = getClient();

  // 1. 寫入銷售紀錄
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SALES_TAB}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        payload.date,
        payload.clerk,
        payload.productCode,
        payload.spec,
        payload.quantity,
        payload.amount,
        payload.paymentMethod,
      ]],
    },
  });

  // 2. 找庫存表對應列（貨號 + 規格 都符合）並扣庫存
  let newStock: number | null = null;
  try {
    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${INVENTORY_TAB}!A2:G`,
    });
    const rows = invRes.data.values || [];
    const rowIndex = rows.findIndex((r) => {
      const code = String(r[0] || "").trim();
      const spec = String(r[2] || "").trim();
      return (
        code === payload.productCode.trim() &&
        spec === (payload.spec || "").trim()
      );
    });

    if (rowIndex !== -1) {
      const current = Number(rows[rowIndex][5] || 0);
      newStock = Math.max(0, current - payload.quantity);
      const rowNum = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${INVENTORY_TAB}!F${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[newStock]] },
      });
    }
  } catch (e) {
    console.warn("扣庫存失敗（銷售紀錄仍已寫入）:", e);
  }

  return { newStock };
}

export interface AddAdminProxyPayload {
  customerName: string;
  productCode: string;
  productName: string;
  spec: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  campaignName: string;
}

/** 後台代購下單：dual-write 代購訂單 + 訂單表 + 訂單明細（同 HERA bot 邏輯） */
export async function addAdminProxyOrder(
  payload: AddAdminProxyPayload
): Promise<{ orderId: string; profit: number; total: number }> {
  const sheets = getClient();
  const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  const dateStr = new Date()
    .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
    .replace(/\//g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const orderId = `ADMIN-${dateStr}-${rand}`;
  const profit = (payload.salePrice - payload.costPrice) * payload.quantity;
  const total = payload.salePrice * payload.quantity;

  // 查客戶 userId（找不到留空，客人下次登記會自動補綁）
  let userId = "";
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${CUSTOMERS_TAB}!A2:D`,
    });
    const found = (res.data.values || []).find(
      (r) => String(r[0] || "").trim() === payload.customerName.trim()
    );
    if (found) userId = String(found[1] || "");
  } catch {}

  // 代購訂單（HERA 原生分頁）
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!A:K`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        now, payload.customerName, payload.productCode, payload.productName, payload.spec,
        payload.costPrice, payload.salePrice, payload.quantity,
        profit, "手動加單", orderId,
      ]],
    },
  });

  const itemDesc = `${payload.productCode} / ${payload.spec} x${payload.quantity} (NT$${payload.salePrice})`;

  // 訂單表（LIFF 共用）
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        now, orderId, userId, payload.customerName, itemDesc,
        total, "", "手動加單", payload.campaignName,
      ]],
    },
  });

  // 訂單明細（LIFF 共用）
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${ORDER_ITEMS_TAB}!A:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        orderId, "", payload.productCode, payload.productName || payload.productCode,
        payload.spec, payload.salePrice, payload.quantity,
        total, payload.campaignName,
      ]],
    },
  });

  return { orderId, profit, total };
}

// ─── 圖片上傳（Google Drive，OAuth2 使用者身份）──────────────────────────────────

export async function uploadImageToDrive(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const folderId = process.env.DRIVE_UPLOAD_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "未設定 GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN"
    );
  }

  // 用真實使用者的 OAuth 上傳，檔案歸屬與配額均算在使用者帳號
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType,
      ...(folderId ? { parents: [folderId] } : {}),
    },
    media: { mimeType, body: Readable.from(fileBuffer) },
    fields: "id",
  });

  const fileId = res.data.id!;
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

// ─── 進貨紀錄 ─────────────────────────────────────────────────────────────────

export interface AddPurchasePayload {
  date: string;
  productCode: string;
  spec: string;
  quantity: number;
}

export async function addPurchaseRecord(
  payload: AddPurchasePayload
): Promise<{ newStock: number | null }> {
  const sheets = getClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PURCHASE_TAB}!A:D`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[payload.date, payload.productCode, payload.spec, payload.quantity]],
    },
  });

  let newStock: number | null = null;
  try {
    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${INVENTORY_TAB}!A2:G`,
    });
    const rows = invRes.data.values || [];
    const idx = rows.findIndex(
      (r) =>
        String(r[0] || "").trim() === payload.productCode.trim() &&
        String(r[2] || "").trim() === payload.spec.trim()
    );
    if (idx !== -1) {
      newStock = Number(rows[idx][5] || 0) + payload.quantity;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${INVENTORY_TAB}!F${idx + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[newStock]] },
      });
    }
  } catch (e) {
    console.warn("進貨補庫存失敗:", e);
  }

  return { newStock };
}

// ─── 代購訂單管理 ─────────────────────────────────────────────────────────────

export interface ProxyOrderRow {
  rowNum: number;
  date: string;
  customerName: string;
  productCode: string;
  productName: string;
  spec: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  profit: number;
  status: string;
  note: string;
}

export async function getProxyOrders(): Promise<ProxyOrderRow[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!A2:K`,
  });
  return (res.data.values || [])
    .map((r, i) => ({
      rowNum: i + 2,
      date: String(r[0] || ""),
      customerName: String(r[1] || ""),
      productCode: String(r[2] || ""),
      productName: String(r[3] || ""),
      spec: String(r[4] || ""),
      costPrice: Number(r[5] || 0),
      salePrice: Number(r[6] || 0),
      quantity: Number(r[7] || 0),
      profit: Number(r[8] || 0),
      status: String(r[9] || "未取貨"),
      note: String(r[10] || ""),
    }))
    .filter((o) => o.date)
    .reverse();
}

export async function updateProxyOrderStatus(
  rowNum: number,
  status: string
): Promise<void> {
  const sheets = getClient();

  // 1. 更新代購訂單!J欄（狀態欄，品名欄插入後往後移一欄）
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!J${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status]] },
  });

  // 2. 讀取同列 K欄取得 orderId，同步更新訂單表!H欄
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!K${rowNum}`,
  });
  const orderId = idRes.data.values?.[0]?.[0];
  if (!orderId) return;

  const ordersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A2:B`,
  });
  const rows = ordersRes.data.values || [];
  const targetRow = rows.findIndex((r) => r[1] === orderId);
  if (targetRow === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!H${targetRow + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status]] },
  });
}

// ─── 銷售報表 ─────────────────────────────────────────────────────────────────

export interface SalesReportData {
  totalAmount: number;
  totalCount: number;
  byProduct: { key: string; quantity: number; amount: number }[];
  byClerk: { clerk: string; count: number; amount: number }[];
}

export async function getSalesReport(
  startDate?: string,
  endDate?: string
): Promise<SalesReportData> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SALES_TAB}!A2:G`,
  });

  const dateOnly = (s: string) => String(s).split(" ")[0];
  let rows = (res.data.values || []).filter((r) => r[0]);
  if (startDate) rows = rows.filter((r) => dateOnly(String(r[0])) >= startDate);
  if (endDate) rows = rows.filter((r) => dateOnly(String(r[0])) <= endDate);

  const productMap = new Map<string, { quantity: number; amount: number }>();
  const clerkMap = new Map<string, { count: number; amount: number }>();

  rows.forEach((r) => {
    const pKey = [r[2], r[3]].filter(Boolean).join(" ");
    const pPrev = productMap.get(pKey) || { quantity: 0, amount: 0 };
    productMap.set(pKey, {
      quantity: pPrev.quantity + Number(r[4] || 0),
      amount: pPrev.amount + Number(r[5] || 0),
    });

    const clerk = String(r[1] || "（未記名）");
    const cPrev = clerkMap.get(clerk) || { count: 0, amount: 0 };
    clerkMap.set(clerk, {
      count: cPrev.count + 1,
      amount: cPrev.amount + Number(r[5] || 0),
    });
  });

  return {
    totalAmount: rows.reduce((s, r) => s + Number(r[5] || 0), 0),
    totalCount: rows.length,
    byProduct: Array.from(productMap.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    byClerk: Array.from(clerkMap.entries())
      .map(([clerk, v]) => ({ clerk, ...v }))
      .sort((a, b) => b.amount - a.amount),
  };
}

// ─── 取得所有連線名稱清單 ─────────────────────────────────────────────────────

export async function getAvailableCampaigns(): Promise<string[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!I2:I`,
  });
  const rows = res.data.values || [];
  const seen = new Set<string>();
  rows.forEach((r) => {
    const c = String(r[0] || "").trim();
    if (c && c !== "（無連線）") seen.add(c);
  });
  return Array.from(seen).reverse(); // 最新連線排前面
}

// ─── 月結毛利報表（門市銷售 + 連線訂單 分開） ────────────────────────────────

export interface CampaignStat {
  campaign: string;
  itemCount: number;
  revenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  profit: number;
}

export interface MonthlyProfitReport {
  sales: SalesReportData;
  campaigns: CampaignStat[];
  orderRevenue: number;
  orderProfit: number;
}

export async function getMonthlyProfitReport(
  startDate?: string,
  endDate?: string,
  campaignFilter?: string  // 傳入時忽略日期，只統計指定連線
): Promise<MonthlyProfitReport> {
  const sheets = getClient();

  const [salesRes, proxyRes, ordersRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SALES_TAB}!A2:G` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${PROXY_ORDERS_TAB}!A2:K` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${ORDERS_TAB}!A2:I` }),
  ]);

  // --- 門市銷售紀錄 ---
  // HERA bot 寫入 new Date()，Sheets 回傳含時間字串（"2026/5/13 下午3:45"），
  // 需切掉空格後的時間部分才能正確比對日期
  const dateOnly = (s: string) => String(s).split(" ")[0];
  let salesRows = (salesRes.data.values || []).filter((r) => r[0]);
  if (startDate) salesRows = salesRows.filter((r) => dateOnly(String(r[0])) >= startDate);
  if (endDate) salesRows = salesRows.filter((r) => dateOnly(String(r[0])) <= endDate);

  const productMap = new Map<string, { quantity: number; amount: number }>();
  const clerkMap = new Map<string, { count: number; amount: number }>();
  salesRows.forEach((r) => {
    const pKey = [r[2], r[3]].filter(Boolean).join(" ");
    const pPrev = productMap.get(pKey) || { quantity: 0, amount: 0 };
    productMap.set(pKey, { quantity: pPrev.quantity + Number(r[4] || 0), amount: pPrev.amount + Number(r[5] || 0) });
    const clerk = String(r[1] || "（未記名）");
    const cPrev = clerkMap.get(clerk) || { count: 0, amount: 0 };
    clerkMap.set(clerk, { count: cPrev.count + 1, amount: cPrev.amount + Number(r[5] || 0) });
  });
  const sales: SalesReportData = {
    totalAmount: salesRows.reduce((s, r) => s + Number(r[5] || 0), 0),
    totalCount: salesRows.length,
    byProduct: Array.from(productMap.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.amount - a.amount).slice(0, 10),
    byClerk: Array.from(clerkMap.entries()).map(([clerk, v]) => ({ clerk, ...v })).sort((a, b) => b.amount - a.amount),
  };

  // --- orderId → campaign 對照表 ---
  const campaignMap = new Map<string, string>();
  (ordersRes.data.values || []).forEach((r) => {
    const orderId = String(r[1] || "");
    if (orderId) campaignMap.set(orderId, String(r[8] || "（無連線）"));
  });

  // --- 代購訂單 → 依連線分組 ---
  let proxyRows = (proxyRes.data.values || []).filter((r) => r[0]);
  // 連線訂單不套日期，一檔期就是一檔期；僅在有指定連線時篩選
  if (campaignFilter) {
    const campaignOrderIds = new Set(
      Array.from(campaignMap.entries())
        .filter(([, c]) => c === campaignFilter)
        .map(([id]) => id)
    );
    proxyRows = proxyRows.filter((r) => campaignOrderIds.has(String(r[10] || "")));
  }

  const campaignStats = new Map<string, CampaignStat>();
  proxyRows.forEach((r) => {
    const status = String(r[9] || "未取貨");
    if (status === "已取消") return;
    const orderId = String(r[10] || "");
    const campaign = campaignMap.get(orderId) || "（無連線）";
    const costPrice = Number(r[5] || 0);
    const salePrice = Number(r[6] || 0);
    const quantity  = Number(r[7] || 0);
    const revenue = salePrice * quantity;
    const profit  = (salePrice - costPrice) * quantity;  // 實時計算，不信任 H 欄
    const confirmed = status === "已完成" || status === "已取貨" || status === "已付款";
    // 已到貨 = 待確認（到貨但尚未完成交易）
    const prev = campaignStats.get(campaign) || { campaign, itemCount: 0, revenue: 0, confirmedRevenue: 0, pendingRevenue: 0, profit: 0 };
    campaignStats.set(campaign, {
      ...prev,
      itemCount: prev.itemCount + 1,
      revenue: prev.revenue + revenue,
      confirmedRevenue: prev.confirmedRevenue + (confirmed ? revenue : 0),
      pendingRevenue: prev.pendingRevenue + (!confirmed ? revenue : 0),
      profit: prev.profit + profit,
    });
  });

  const campaigns = Array.from(campaignStats.values()).sort((a, b) => b.revenue - a.revenue);
  return {
    sales,
    campaigns,
    orderRevenue: campaigns.reduce((s, c) => s + c.revenue, 0),
    orderProfit: campaigns.reduce((s, c) => s + c.profit, 0),
  };
}

// ─── 商品管理（批次上下架）────────────────────────────────────────────────────

export interface ManagedProduct {
  rowNum: number;
  id: string;
  code: string;
  name: string;
  spec: string;
  price: number;
  stock: number;
  active: boolean;
}

export async function getManagedProducts(): Promise<ManagedProduct[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PRODUCTS_TAB}!A2:I`,
  });
  return (res.data.values || [])
    .filter((r) => r[0])
    .map((r, i) => ({
      rowNum: i + 2,
      id: String(r[0] || ""),
      code: String(r[1] || ""),
      name: String(r[2] || ""),
      spec: String(r[3] || ""),
      price: Number(r[4] || 0),
      stock: Number(r[5] || 0),
      active: String(r[8] || "").toUpperCase() !== "FALSE",
    }));
}

export async function setProductsActive(
  rowNums: number[],
  active: boolean
): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: rowNums.map((n) => ({
        range: `${PRODUCTS_TAB}!I${n}`,
        values: [[active ? "TRUE" : "FALSE"]],
      })),
    },
  });
}

// ─── 訂單商品統計 ─────────────────────────────────────────────────────────────

export interface OrderStatItem {
  code: string;
  name: string;
  spec: string;
  quantity: number;
  total: number;
}

/**
 * 叫貨統計。
 * paidOnly=true 時只算「已確認收款」的訂單——訂單明細那張表沒有付款狀態，
 * 所以要先從訂單表撈出已確認的訂單編號，再拿來篩明細。
 */
export async function getOrderStats(
  campaign?: string,
  paidOnly = false
): Promise<{
  items: OrderStatItem[];
  campaigns: string[];
  orderCount: number;
}> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDER_ITEMS_TAB}!A2:I`,
  });

  // 一律要讀訂單表：訂單明細沒有狀態欄，已取消的訂單得靠訂單編號排除，
  // 否則取消後那些商品還是會被算進叫貨量。
  const ordRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A2:J`, // B=訂單編號、H=狀態、J=付款狀態
  });
  const ordRows = ordRes.data.values || [];
  const cancelledIds = new Set(
    ordRows
      .filter((r) => String(r[7] || "") === "已取消")
      .map((r) => String(r[1] || ""))
  );
  const paidOrderIds: Set<string> | null = paidOnly
    ? new Set(
        ordRows
          .filter((r) => String(r[9] || "") === "已確認")
          .map((r) => String(r[1] || ""))
      )
    : null;

  const allRows = (res.data.values || []).filter((r) => r[0]);
  const campaigns = Array.from(
    new Set(allRows.map((r) => String(r[8] || "")).filter(Boolean))
  ).sort();

  let rows = campaign
    ? allRows.filter((r) => String(r[8] || "") === campaign)
    : allRows;
  rows = rows.filter((r) => !cancelledIds.has(String(r[0] || "")));
  if (paidOrderIds) {
    rows = rows.filter((r) => paidOrderIds.has(String(r[0] || "")));
  }

  const map = new Map<string, OrderStatItem>();
  rows.forEach((r) => {
    const code = String(r[2] || "");
    const name = String(r[3] || code);
    const spec = String(r[4] || "");
    const key = `${code}||${spec}`;
    const prev = map.get(key) || { code, name, spec, quantity: 0, total: 0 };
    map.set(key, {
      ...prev,
      quantity: prev.quantity + Number(r[6] || 0),
      total: prev.total + Number(r[7] || 0),
    });
  });

  return {
    items: Array.from(map.values()).sort((a, b) => b.quantity - a.quantity),
    campaigns,
    orderCount: new Set(rows.map((r) => String(r[0] || ""))).size,
  };
}

// ─── 顧客訂單查詢 ─────────────────────────────────────────────────────────────

export async function getMyOrders(
  userId: string,
  campaign?: string
): Promise<OrderRecord[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A2:R`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r[2] === userId)
    .filter((r) => !campaign || (r[8] || "") === campaign)
    .map((r) => ({
      time: String(r[0] || ""),
      orderId: String(r[1] || ""),
      userId: String(r[2] || ""),
      displayName: String(r[3] || ""),
      items: String(r[4] || ""),
      total: Number(r[5] || 0),
      note: String(r[6] || ""),
      status: String(r[7] || ""),
      campaign: String(r[8] || ""),
      paymentStatus: String(r[9] || "") as OrderRecord["paymentStatus"],
      paymentLast5: String(r[10] || ""),
      paymentProof: String(r[11] || ""),
      paymentReportedAt: String(r[12] || ""),
      shipName: String(r[13] || ""),
      shipPhone: String(r[14] || ""),
      shipStoreName: String(r[15] || ""),
      shipStoreCode: String(r[16] || ""),
      shipFilledAt: String(r[17] || ""),
    }))
    .reverse();
}

/* ══════════════════════════════════════════════════════════════
   匯款核對（2026-09-05）
   訂單表 J~M：付款狀態 | 匯款後五碼 | 匯款截圖 | 回報時間
   H 欄的既有狀態不動，避免影響 HERA bot／叫貨統計／歷史訂單
   ══════════════════════════════════════════════════════════════ */

/** 後五碼必須是 5 位數字 */
export function isValidLast5(v: string): boolean {
  return /^\d{5}$/.test(v.trim());
}

/** 至少要有後五碼或截圖其中一項 */
export function hasPaymentEvidence(last5: string, proofUrl: string): boolean {
  return isValidLast5(last5) || Boolean(proofUrl.trim());
}

type OrderRow = { rowNumber: number; values: string[] };

/**
 * 依訂單編號找出該列（rowNumber 是 Sheet 上的實際列號，含標題列偏移）。
 *
 * ⚠️ 會重試：客人在「下單完成頁」馬上回報匯款時，訂單才剛 append 進去，
 * 緊接著的 values.get 有時讀不到那一列，會誤判成「找不到訂單」。
 * 實測 2026-09-05 就踩到這個。找不到才重試，找到了就直接回。
 */
async function findOrderRow(
  orderId: string,
  retries = 2
): Promise<OrderRow | null> {
  const sheets = getClient();
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${ORDERS_TAB}!A2:R`,
    });
    const rows = res.data.values || [];
    const idx = rows.findIndex((r) => String(r[1] || "") === orderId);
    if (idx !== -1) {
      return {
        rowNumber: idx + 2, // A2 起算
        values: (rows[idx] || []).map((v) => String(v ?? "")),
      };
    }
  }
  return null;
}

/**
 * 客人回報匯款。
 * 這是公開端點會呼叫的函式，所以驗證都在這裡做：
 * 訂單要存在、必須是本人、且狀態必須還在「待匯款」。
 */
export async function reportPayment(params: {
  orderId: string;
  userId: string;
  last5: string;
  proofUrl: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { orderId, userId, last5, proofUrl } = params;

  if (!hasPaymentEvidence(last5, proofUrl)) {
    return { ok: false, reason: "請填寫匯款後五碼或上傳截圖" };
  }
  if (last5.trim() && !isValidLast5(last5)) {
    return { ok: false, reason: "匯款後五碼需為 5 位數字" };
  }

  const row = await findOrderRow(orderId);
  // 找不到訂單、或不是本人，都回同一句話，不透露訂單是否存在
  if (!row || row.values[2] !== userId) {
    return { ok: false, reason: "找不到這筆訂單" };
  }
  if (row.values[9] === "已確認") {
    return { ok: false, reason: "這筆訂單已完成核對，不需重複回報" };
  }

  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!J${row.rowNumber}:M${row.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "已回報",
          last5.trim(),
          proofUrl.trim(),
          new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
        ],
      ],
    },
  });
  return { ok: true };
}

// 訂單編號前 14 碼是下單時間戳，照它排才是真正的下單順序。
// 不能靠 Sheet 列序：訂單表曾被手動排序過，列序已不等於時間序（2026-09-17 蔡天天那筆跑到最底就是這樣）。
function byOrderIdDesc(a: { orderId: string }, b: { orderId: string }) {
  return b.orderId.localeCompare(a.orderId);
}

/** 後台待核對清單：只列「已回報」的訂單 */
export async function getPendingPayments(
  campaign?: string
): Promise<PendingPayment[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A2:R`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => String(r[9] || "") === "已回報")
    .filter((r) => String(r[7] || "") !== "已取消")
    .filter((r) => !campaign || String(r[8] || "") === campaign)
    .map((r) => ({
      orderId: String(r[1] || ""),
      time: String(r[0] || ""),
      userId: String(r[2] || ""),
      displayName: String(r[3] || ""),
      total: Number(r[5] || 0),
      campaign: String(r[8] || ""),
      paymentLast5: String(r[10] || ""),
      paymentProof: normalizeImageUrl(String(r[11] || "")),
      paymentReportedAt: String(r[12] || ""),
      shipName: String(r[13] || ""),
      shipPhone: String(r[14] || ""),
      shipStoreName: String(r[15] || ""),
      shipStoreCode: String(r[16] || ""),
      shipFilledAt: String(r[17] || ""),
    }))
    .sort(byOrderIdDesc);
}

/**
 * 老闆核對。
 * confirm → 已確認；reject → 退回待匯款並清空回報內容，讓客人重填
 */
export async function verifyPayment(
  orderId: string,
  action: "confirm" | "reject"
): Promise<
  { ok: true; userId: string; displayName: string } | { ok: false; reason: string }
> {
  const row = await findOrderRow(orderId);
  if (!row) return { ok: false, reason: "找不到這筆訂單" };

  const sheets = getClient();
  const values =
    action === "confirm"
      ? [["已確認", row.values[10] || "", row.values[11] || "", row.values[12] || ""]]
      : [["待匯款", "", "", ""]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!J${row.rowNumber}:M${row.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return {
    ok: true,
    userId: row.values[2] || "",
    displayName: row.values[3] || "",
  };
}

/** 一次性：把 J~R 標題寫進訂單表第 1 列 */
export async function migratePaymentColumns(): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!J1:R1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "付款狀態",
          "匯款後五碼",
          "匯款截圖",
          "回報時間",
          "收件人",
          "電話",
          "門市名稱",
          "門市店號",
          "取貨資訊填寫時間",
        ],
      ],
    },
  });
}

/* ── 7-11 取貨資訊（2026-09-05）訂單表 N~R ── */

/** 台灣手機或市話，去掉分隔符後 8~10 碼數字 */
export function isValidPhone(v: string): boolean {
  return /^\d{8,10}$/.test(v.replace(/[\s-]/g, ""));
}

/**
 * 客人填 7-11 取貨資訊。
 * 與匯款回報同樣的所有權驗證；且必須已確認收款才能填。
 */
export async function saveShippingInfo(params: {
  orderId: string;
  userId: string;
  name: string;
  phone: string;
  storeName: string;
  storeCode: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { orderId, userId, name, phone, storeName, storeCode } = params;

  if (!name.trim() || !phone.trim() || !storeName.trim() || !storeCode.trim()) {
    return { ok: false, reason: "四個欄位都要填寫" };
  }
  if (!isValidPhone(phone)) {
    return { ok: false, reason: "電話格式不正確" };
  }

  const row = await findOrderRow(orderId);
  if (!row || row.values[2] !== userId) {
    return { ok: false, reason: "找不到這筆訂單" };
  }
  if (row.values[9] !== "已確認") {
    return { ok: false, reason: "這筆訂單尚未完成匯款核對" };
  }

  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!N${row.rowNumber}:R${row.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          name.trim(),
          phone.replace(/[\s-]/g, ""),
          storeName.trim(),
          storeCode.trim(),
          new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
        ],
      ],
    },
  });
  return { ok: true };
}

/** 待出貨：已確認收款且已填取貨資訊 */
export async function getReadyToShip(campaign?: string): Promise<ReadyToShip[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A2:R`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => String(r[9] || "") === "已確認")
    .filter((r) => String(r[7] || "") !== "已取消")
    .filter((r) => String(r[7] || "") !== "已出貨")
    .filter((r) => String(r[13] || "").trim() !== "") // 已填收件人
    .filter((r) => !campaign || String(r[8] || "") === campaign)
    .map((r) => ({
      orderId: String(r[1] || ""),
      displayName: String(r[3] || ""),
      items: String(r[4] || ""),
      total: Number(r[5] || 0),
      campaign: String(r[8] || ""),
      shipName: String(r[13] || ""),
      shipPhone: String(r[14] || ""),
      shipStoreName: String(r[15] || ""),
      shipStoreCode: String(r[16] || ""),
      shipFilledAt: String(r[17] || ""),
    }))
    .sort(byOrderIdDesc);
}

/** 標記出貨：把訂單表 H 欄改成「已出貨」，該筆就會從待出貨清單消失 */
export async function markShipped(orderId: string): Promise<
  | {
      ok: true;
      userId: string;
      storeName: string;
      storeCode: string;
    }
  | { ok: false; reason: string }
> {
  const row = await findOrderRow(orderId);
  if (!row) return { ok: false, reason: "找不到這筆訂單" };
  if (row.values[7] === "已取消") {
    return { ok: false, reason: "這筆訂單已取消，不能出貨" };
  }

  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!H${row.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["已出貨"]] },
  });
  return {
    ok: true,
    userId: row.values[2] || "",
    storeName: row.values[15] || "",
    storeCode: row.values[16] || "",
  };
}
