// 一次性 migration：在代購訂單 C欄(商品編號)後插入 D欄(品名)，並回填舊資料
import { google } from 'googleapis';

const SHEET_ID = '12OI19OF5InVaCunbvRHTQCxwvjL5UNIR3xcZ4PuWsYU';
const PROXY_TAB = '代購訂單';
const PRODUCTS_TAB = '商品表';
const SERVICE_ACCOUNT_EMAIL = 'sheet-bot@line-order-493911.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCnVzuvoYrCd21u
q0dY11flYThF42qRJxdSau3LSOI2qbXloS3MfHO/GMvDoz8vlNsFlgWFZzLhH/pB
6i1pBvmsz5Ylh3lCyVTM1urPIWriaXlG3akfJRr/SX8VD/3xGhm1Q7MXn1UyC6o4
7zdDDEc+UguJxQFm3qxCAHU3uPXpw6F5+ulKNUFBmVo3qEfEeNe4/kJlrsFTMeZ7
yVliJnbvryLq27XOUBcbwK2mtpH/lOAomJxQ7e+PYGC/D9ujpiHUvclGvrKxKMx0
yV6T7Oy8/L7B/YOoXai6L97YhFCkSrMJ1EWXEdmuOInn9u9aoE/7diazWcasskKN
vKimNZGXAgMBAAECggEABOYwynJ+xZ5F9GLqZZdYZTH4SRZY6iGVy66gVQn7OEzU
JD5y9aI9t2PWkmwTGo8Lz6/SAryLUhaQ/mTMZl9cnOFNFkZPVBAsbs+IsByvaMK2
dxLn6Ex2oNIHU0UB4ieiDf0ZxNVHl7n3d17ImSqCvc7RWccbWwwAOh7sXqzqEIs7
U/Ez5oXlNZkG4aHLW+uQD6n00buA1G10+3VPUUSOadjQw6atMMHFRqKWH+NLxcHf
ck5ciN2DHLeeifFZKwIzLBT8M0kOhG8KHuWVUpPgXToGQYl4K1XZDhPNcx76z9aM
y8FEMEsdpYohaB4m53OtNn8Pv02o8npBTYqSLVYjcQKBgQDZrQJ2WDOjF8a5OLR6
GOOopYt5oOtzknNHFkTXUUL+yaZ2iHaj6t+iwy3BY4VkM0sQlUG4lStCS0V7jJOm
Zd9Y0142xlhQjw26NLzw5SgH3VW9z31gu2/jnzK/Z4EYWaMowmnOV+G12vszzAA1
EC4nBZxz4Mzofc3664YCVCyNjQKBgQDEzYsUIDa1emD/i1la+uLGo1rURNJoVkAT
KhDoOPa5jPeDfp0m/3CXY9jQVldSCvNNRI0Wqbv2KbseQDwoapzRrfR3Y22xaFRu
nnUg61ccMvtxfUwf9hftPI9O1SX3Sq1DbgWW807d3vqrz/SpH8xwJ2ZvdzX72Pq5
ZnTo2yb4swKBgQC5K0m67pEOnj04dxpf+yg+4IRjdRaV+/EAedsZ51C8eUGX98Ik
8rpHNQ2JQ2XHtTKX6sA7ivl/rZRv40f+9w4l+7hblCKwdODSk+ZebjG9bvVvQECB
tzEZSuXamOvikO4Q0EE9fNjO4Hdsuo86lIcOPuG2WXc2Fz7Pwub+uCgmSQKBgQCE
SboENEcyI+oRvIS68EwBxAqpBv38XoXBnBQzVR8byNMT08clUK1JRjeWi4M0xeGX
/c1s/3k2VgTOp9UIQenZ1DmxCufQSdX/aYpIL4mljeuQ9O13yn94261lC0fy+4KO
AeXF+xT3dQxA8499I7/TX9iuco6aFNcsSt+pKq7+mwKBgQCGLkZn/p9gGP75KiQN
XoSAtn+33OjCHlaBj58AVT6iLI/4eAVjGKXqgeGaSGL8RSXAyS24J7e2rQs7dYlO
YwVo3KHiCk9FoeIo8ePe06Kz3o6WpMGU/y9TgncRQNTG2SDGhvN7Bc4nef30W5D9
rnzYVc+ACNkA0Wo7vIgTEBxq9w==
-----END PRIVATE KEY-----
`;

const auth = new google.auth.JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  // ── Step 1: 確認 D1 是否已經是「品名」（避免重複執行） ─────────────────────
  console.log('📋 檢查代購訂單 D1 欄位...');
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_TAB}!D1`,
  });
  const d1 = checkRes.data.values?.[0]?.[0] || '';
  if (d1 === '品名') {
    console.log('✅ D1 已是「品名」，跳過插入欄位，直接進行回填');
  } else {
    // ── Step 2: 找 sheetId ─────────────────────────────────────────────────
    console.log('🔍 取得分頁 ID...');
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheet = meta.data.sheets?.find(s => s.properties?.title === PROXY_TAB);
    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      throw new Error(`找不到分頁：${PROXY_TAB}`);
    }
    const sheetId = sheet.properties.sheetId;

    // ── Step 3: 插入 D 欄 ──────────────────────────────────────────────────
    console.log('➕ 在 D 欄插入新欄位...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          insertDimension: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
            inheritFromBefore: false,
          },
        }],
      },
    });

    // ── Step 4: 寫入表頭 ───────────────────────────────────────────────────
    console.log('📝 寫入表頭「品名」...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${PROXY_TAB}!D1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['品名']] },
    });
    console.log('✅ D 欄已建立');
  }

  // ── Step 5: 讀商品表建立 code→name 和 id→name 對照表 ───────────────────────
  console.log('📦 讀取商品表建立品名對照...');
  const prodRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PRODUCTS_TAB}!A2:K`,
  });
  const nameMap = new Map(); // code → name 或 id → name
  for (const r of prodRes.data.values || []) {
    const id   = String(r[0] || '').trim();
    const code = String(r[1] || '').trim();
    const name = String(r[2] || '').trim();
    if (id && name)   nameMap.set(id, name);
    if (code && name) nameMap.set(code, name);
  }
  console.log(`   找到 ${nameMap.size} 筆商品對照`);

  // ── Step 6: 讀取代購訂單所有列 ─────────────────────────────────────────────
  console.log('📋 讀取代購訂單所有資料...');
  const ordersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_TAB}!A2:K`,
  });
  const rows = ordersRes.data.values || [];
  console.log(`   共 ${rows.length} 列`);

  // ── Step 7: 找出 D 欄空白但 C 欄有值的列 ──────────────────────────────────
  const updates = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const productCode = String(r[2] || '').trim();
    const existingName = String(r[3] || '').trim();
    if (!productCode || existingName) continue; // 沒有貨號，或已有品名，跳過

    const name = nameMap.get(productCode);
    if (!name) {
      console.log(`   ⚠️  第 ${i + 2} 列貨號「${productCode}」找不到品名，略過`);
      continue;
    }
    updates.push({
      range: `${PROXY_TAB}!D${i + 2}`,
      values: [[name]],
    });
  }

  if (updates.length === 0) {
    console.log('✅ 沒有需要回填的列');
    return;
  }

  // ── Step 8: 批次寫入 ─────────────────────────────────────────────────────
  console.log(`✏️  回填 ${updates.length} 列品名...`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });

  console.log(`🎉 完成！共回填 ${updates.length} 列`);
  // 顯示前 10 筆更新預覽
  updates.slice(0, 10).forEach(u => {
    console.log(`   ${u.range} → ${u.values[0][0]}`);
  });
  if (updates.length > 10) console.log(`   ...（共 ${updates.length} 筆）`);
}

main().catch(err => {
  console.error('❌ 執行失敗:', err.message || err);
  process.exit(1);
});
