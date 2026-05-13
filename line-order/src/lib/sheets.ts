import { google } from "googleapis";
import { Readable } from "stream";
import type { OrderPayload, OrderRecord, Product, Settings } from "@/types";

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
 * 商品表欄位 (A~I)：
 * id | code | name | spec | price | stock | image | description | active
 */
export async function getProducts(): Promise<Product[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PRODUCTS_TAB}!A2:I`,
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
      stock: Number(r[5] || 0),
      images: parseImages(r[6] ? String(r[6]) : undefined),
      description: r[7] ? String(r[7]) : undefined,
      active: String(r[8] || "").toUpperCase() !== "FALSE",
    }))
    .filter((p) => p.active);
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
    return { title: map.title || "快速下單" };
  } catch {
    return { title: "快速下單" };
  }
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
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${ORDERS_TAB}!A:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
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
        ],
      ],
    },
  });

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

  // 代購訂單（與 HERA 共用分頁；10 欄：日期 姓名 商品編號 規格 進價 售價 數量 毛利 狀態 備註）
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${PROXY_ORDERS_TAB}!A:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: payload.items.map((i) => [
          now,
          payload.displayName,
          i.code || i.productId,
          i.spec || "",
          "",
          i.unitPrice,
          i.quantity,
          "",
          "手動加單",
          orderId,
        ]),
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
  imageUrl?: string;
  description?: string;
  writeToInventory: boolean;
  writeToProducts: boolean;
}

/** 後台上架：寫入庫存表 and/or 商品表 */
export async function addInventoryProduct(
  payload: AddProductPayload
): Promise<{ written: string[] }> {
  const sheets = getClient();
  const written: string[] = [];

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
          payload.imageUrl || "",
        ]],
      },
    });
    written.push("庫存表");
  }

  if (payload.writeToProducts) {
    const id = `P${Date.now()}`;
    const image = payload.imageUrl ? normalizeImageUrl(payload.imageUrl) : "";
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${PRODUCTS_TAB}!A:I`,
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
    range: `${PROXY_ORDERS_TAB}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        now, payload.customerName, payload.productCode, payload.spec,
        payload.costPrice, payload.salePrice, payload.quantity,
        profit, "未取貨", orderId,
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
        orderId, "", payload.productCode, payload.productCode,
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
    range: `${PROXY_ORDERS_TAB}!A2:J`,
  });
  return (res.data.values || [])
    .map((r, i) => ({
      rowNum: i + 2,
      date: String(r[0] || ""),
      customerName: String(r[1] || ""),
      productCode: String(r[2] || ""),
      spec: String(r[3] || ""),
      costPrice: Number(r[4] || 0),
      salePrice: Number(r[5] || 0),
      quantity: Number(r[6] || 0),
      profit: Number(r[7] || 0),
      status: String(r[8] || "未取貨"),
      note: String(r[9] || ""),
    }))
    .filter((o) => o.date)
    .reverse();
}

export async function updateProxyOrderStatus(
  rowNum: number,
  status: string
): Promise<void> {
  const sheets = getClient();

  // 1. 更新代購訂單!I欄
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!I${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status]] },
  });

  // 2. 讀取同列 J欄取得 orderId，同步更新訂單表!H欄
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_ORDERS_TAB}!J${rowNum}`,
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
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${PROXY_ORDERS_TAB}!A2:J` }),
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
    byProduct: Array.from(productMap.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.amount - a.amount).slice(0, 20),
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
    proxyRows = proxyRows.filter((r) => campaignOrderIds.has(String(r[9] || "")));
  }

  const campaignStats = new Map<string, CampaignStat>();
  proxyRows.forEach((r) => {
    const status = String(r[8] || "未取貨");
    if (status === "已取消") return;
    const orderId = String(r[9] || "");
    const campaign = campaignMap.get(orderId) || "（無連線）";
    const costPrice = Number(r[4] || 0);
    const salePrice = Number(r[5] || 0);
    const quantity  = Number(r[6] || 0);
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

export async function getOrderStats(campaign?: string): Promise<{
  items: OrderStatItem[];
  campaigns: string[];
}> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ORDER_ITEMS_TAB}!A2:I`,
  });

  const allRows = (res.data.values || []).filter((r) => r[0]);
  const campaigns = Array.from(
    new Set(allRows.map((r) => String(r[8] || "")).filter(Boolean))
  ).sort();

  const rows = campaign
    ? allRows.filter((r) => String(r[8] || "") === campaign)
    : allRows;

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
    range: `${ORDERS_TAB}!A2:I`,
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
    }))
    .reverse();
}
