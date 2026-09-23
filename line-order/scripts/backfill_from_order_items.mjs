// 從訂單明細讀取 code→name，補填代購訂單 D 欄空白的 H 開頭貨號
import { google } from 'googleapis';

const SHEET_ID = '12OI19OF5InVaCunbvRHTQCxwvjL5UNIR3xcZ4PuWsYU';
const PROXY_TAB   = '代購訂單';
const ITEMS_TAB   = '訂單明細';

const auth = new google.auth.JWT({
  email: 'sheet-bot@line-order-493911.iam.gserviceaccount.com',
  key: `-----BEGIN PRIVATE KEY-----
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
-----END PRIVATE KEY-----`,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  // ── Step 1: 從訂單明細建立 code → name 對照（C欄=商品編號, D欄=商品名稱）──
  console.log('📋 讀取訂單明細...');
  const itemsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ITEMS_TAB}!A2:I`,
  });
  const itemRows = itemsRes.data.values || [];
  console.log(`   共 ${itemRows.length} 列`);

  const nameMap = new Map();
  for (const r of itemRows) {
    const code = String(r[2] || '').trim();
    const name = String(r[3] || '').trim();
    if (code && name && !nameMap.has(code)) {
      nameMap.set(code, name);
    }
  }
  console.log(`   建立 ${nameMap.size} 筆 code→name 對照`);

  // ── Step 2: 讀取代購訂單，找 D 欄空白 且 C 欄是 H/G/Z 開頭的列 ────────────
  console.log('📋 讀取代購訂單...');
  const proxyRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${PROXY_TAB}!A2:K`,
  });
  const proxyRows = proxyRes.data.values || [];

  const updates = [];
  const missing = new Set();

  for (let i = 0; i < proxyRows.length; i++) {
    const r = proxyRows[i];
    const code = String(r[2] || '').trim();
    const existingName = String(r[3] || '').trim();
    if (existingName) continue;      // 已有品名，跳過
    if (!code.match(/^[HGZ]/i)) continue; // 只處理 H/G/Z 開頭

    const name = nameMap.get(code);
    if (!name) {
      missing.add(code);
      continue;
    }
    updates.push({
      range: `${PROXY_TAB}!D${i + 2}`,
      values: [[name]],
    });
  }

  if (missing.size > 0) {
    console.log(`\n⚠️  以下貨號在訂單明細也找不到品名（共 ${missing.size} 個）：`);
    for (const code of [...missing].sort()) console.log(`   ${code}`);
  }

  if (updates.length === 0) {
    console.log('\n✅ 沒有需要補填的列');
    return;
  }

  // ── Step 3: 批次寫入 ─────────────────────────────────────────────────────
  console.log(`\n✏️  補填 ${updates.length} 列品名...`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });

  console.log(`🎉 完成！補填 ${updates.length} 列`);
  updates.slice(0, 15).forEach(u => console.log(`   ${u.range} → ${u.values[0][0]}`));
  if (updates.length > 15) console.log(`   ...（共 ${updates.length} 筆）`);
}

main().catch(err => {
  console.error('❌ 執行失敗:', err.message || err);
  process.exit(1);
});
