import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const PROXY_ORDERS_TAB = process.env.PROXY_ORDERS_SHEET_NAME || '代購訂單';

function getClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// POST /api/admin/migrate-proxy-column
// 在代購訂單 C欄（商品編號）與 D欄（規格）之間插入「品名」欄，只需執行一次
export async function POST() {
  try {
    const sheets = getClient();

    // 找代購訂單 sheet 的 sheetId（gid）
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === PROXY_ORDERS_TAB
    );
    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      return NextResponse.json({ error: `找不到分頁：${PROXY_ORDERS_TAB}` }, { status: 404 });
    }
    const sheetId = sheet.properties.sheetId!;

    // 在 index 3（D欄）插入一欄
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 3,  // D欄（0-based）
                endIndex: 4,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });

    // 寫入表頭「品名」到 D1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${PROXY_ORDERS_TAB}!D1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['品名']] },
    });

    return NextResponse.json({ ok: true, message: '已在代購訂單 D欄插入「品名」欄' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('migrate-proxy-column 失敗:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
