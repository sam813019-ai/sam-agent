import { google } from 'googleapis';

const SHEET_ID = '1waf_Gml_L6YK_9qBQCT3yKZUkkJDhnNwgvIC52NanSg';

const auth = new google.auth.JWT({
  email: 'sheet-bot@line-order-493911.iam.gserviceaccount.com',
  key: `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCnVzuvoYrCd21u\nq0dY11flYThF42qRJxdSau3LSOI2qbXloS3MfHO/GMvDoz8vlNsFlgWFZzLhH/pB\n6i1pBvmsz5Ylh3lCyVTM1urPIWriaXlG3akfJRr/SX8VD/3xGhm1Q7MXn1UyC6o4\n7zdDDEc+UguJxQFm3qxCAHU3uPXpw6F5+ulKNUFBmVo3qEfEeNe4/kJlrsFTMeZ7\nyVliJnbvryLq27XOUBcbwK2mtpH/lOAomJxQ7e+PYGC/D9ujpiHUvclGvrKxKMx0\nyV6T7Oy8/L7B/YOoXai6L97YhFCkSrMJ1EWXEdmuOInn9u9aoE/7diazWcasskKN\nvKimNZGXAgMBAAECggEABOYwynJ+xZ5F9GLqZZdYZTH4SRZY6iGVy66gVQn7OEzU\nJD5y9aI9t2PWkmwTGo8Lz6/SAryLUhaQ/mTMZl9cnOFNFkZPVBAsbs+IsByvaMK2\ndxLn6Ex2oNIHU0UB4ieiDf0ZxNVHl7n3d17ImSqCvc7RWccbWwwAOh7sXqzqEIs7\nU/Ez5oXlNZkG4aHLW+uQD6n00buA1G10+3VPUUSOadjQw6atMMHFRqKWH+NLxcHf\nck5ciN2DHLeeifFZKwIzLBT8M0kOhG8KHuWVUpPgXToGQYl4K1XZDhPNcx76z9aM\ny8FEMEsdpYohaB4m53OtNn8Pv02o8npBTYqSLVYjcQKBgQDZrQJ2WDOjF8a5OLR6\nGOOopYt5oOtzknNHFkTXUUL+yaZ2iHaj6t+iwy3BY4VkM0sQlUG4lStCS0V7jJOm\nZd9Y0142xlhQjw26NLzw5SgH3VW9z31gu2/jnzK/Z4EYWaMowmnOV+G12vszzAA1\nEC4nBZxz4Mzofc3664YCVCyNjQKBgQDEzYsUIDa1emD/i1la+uLGo1rURNJoVkAT\nKhDoOPa5jPeDfp0m/3CXY9jQVldSCvNNRI0Wqbv2KbseQDwoapzRrfR3Y22xaFRu\nnnUg61ccMvtxfUwf9hftPI9O1SX3Sq1DbgWW807d3vqrz/SpH8xwJ2ZvdzX72Pq5\nZnTo2yb4swKBgQC5K0m67pEOnj04dxpf+yg+4IRjdRaV+/EAedsZ51C8eUGX98Ik\n8rpHNQ2JQ2XHtTKX6sA7ivl/rZRv40f+9w4l+7hblCKwdODSk+ZebjG9bvVvQECB\ntzEZSuXamOvikO4Q0EE9fNjO4Hdsuo86lIcOPuG2WXc2Fz7Pwub+uCgmSQKBgQCE\nSboENEcyI+oRvIS68EwBxAqpBv38XoXBnBQzVR8byNMT08clUK1JRjeWi4M0xeGX\n/c1s/3k2VgTOp9UIQenZ1DmxCufQSdX/aYpIL4mljeuQ9O13yn94261lC0fy+4KO\nAeXF+xT3dQxA8499I7/TX9iuco6aFNcsSt+pKq7+mwKBgQCGLkZn/p9gGP75KiQN\nXoSAtn+33OjCHlaBj58AVT6iLI/4eAVjGKXqgeGaSGL8RSXAyS24J7e2rQs7dYlO\nYwVo3KHiCk9FoeIo8ePe06Kz3o6WpMGU/y9TgncRQNTG2SDGhvN7Bc4nef30W5D9\nrnzYVc+ACNkA0Wo7vIgTEBxq9w==\n-----END PRIVATE KEY-----\n`,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 推薦品牌資料
const recData = [
  // 標題列
  ['等級', '品牌名稱', '類別', '推薦原因', '連線代購優先順序'],
  // S 級
  ['⭐ S級 必掃', 'BITEME', '玩具/零食/服飾', '韓國最紅寵物品牌，出口26國，IG質感高，台灣知名度強', '1'],
  ['⭐ S級 必掃', 'PUPPIA', '服飾配件', '韓國老牌胸背帶/寵物衣，亞洲知名度最高的韓系寵物服裝', '2'],
  ['⭐ S級 必掃', 'JEJUKANG (제주강)', '零食', '濟州島天然食材零食，無添加訴求強，台灣健康派主人很愛', '3'],
  ['⭐ S級 必掃', 'meongmeonghanu (멍멍한우)', '零食', '韓牛等級手工零食，高端定位，好拍照好直播', '4'],
  // A 級
  ['✅ A級 強推', 'medimilk (liquid goat milk)', '流食零食', '液態山羊奶，台灣貓狗主近年超流行流食零食', '5'],
  ['✅ A級 強推', 'PAINDEMIE', '零食烘焙', '法式風格寵物烘焙，外型好拍，直播展示效果佳', '6'],
  ['✅ A級 強推', 'Wild Kangaroo', '零食', '袋鼠肉零食，稀有食材高蛋白，台灣買不到', '7'],
  ['✅ A級 強推', 'Tunalala', '零食（貓）', '鮪魚主題貓零食，對貓主人很有吸引力', '8'],
  ['✅ A級 強推', 'THANKSMELL', '美容清潔', '香氛寵物清潔系列，韓系設計感強', '9'],
  ['✅ A級 強推', 'Goldmmune', '保健品', '免疫力相關保健品，命名直白好理解', '10'],
  ['✅ A級 強推', 'dr.mune', '保健品', '醫療級定位保健品', '11'],
  // B 級
  ['🔵 B級 詢價', "Steve's Real Food", '主食', '美國生食主食品牌，健康飲食族群喜愛', '12'],
  ['🔵 B級 詢價', 'BIXBI', '主食/零食', '美國凍乾品牌，在韓有通路', '13'],
  ['🔵 B級 詢價', 'Special Forces of Dog', '零食', '軍事主題包裝，台灣男性飼主/獸粉族群很買單', '14'],
  ['🔵 B級 詢價', 'DEARSCO', '美容', '韓國沙龍感美容品牌', '15'],
  ['🔵 B級 詢價', 'ainsoap', '美容', '寵物手工皂，質感包裝', '16'],
  // 空行
  [],
  // 直播建議
  ['📢 直播策略', '', '', '', ''],
  ['開場熱場', 'BITEME + PUPPIA', '', '台灣人一看就知道，帶動氣氛', ''],
  ['主力販售', 'JEJUKANG + meongmeonghanu + medimilk + PAINDEMIE', '', '零食回購率高，好賣', ''],
  ['話題商品', 'Wild Kangaroo + Special Forces of Dog', '', '稀有/新奇，製造話題', ''],
  ['貓主人專區', 'Tunalala + ainsoap', '', '吸引貓奴族群', ''],
  ['保健衝客單', 'Goldmmune + dr.mune', '', '可搭配凍乾組合銷售', ''],
];

async function run() {
  try {
    // 先取得現有分頁列表
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existingSheets = meta.data.sheets.map(s => s.properties.title);
    console.log('現有分頁:', existingSheets);

    const newSheetTitle = '⭐ 推薦代購品牌';

    // 若分頁已存在，先刪除
    if (existingSheets.includes(newSheetTitle)) {
      const sheetId = meta.data.sheets.find(s => s.properties.title === newSheetTitle).properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: [{ deleteSheet: { sheetId } }] },
      });
      console.log('已刪除舊分頁');
    }

    // 新增分頁
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: newSheetTitle,
              index: 0,
              tabColor: { red: 1, green: 0.84, blue: 0 },
            },
          },
        }],
      },
    });
    const newSheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    console.log('新增分頁成功，sheetId:', newSheetId);

    // 寫入資料
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${newSheetTitle}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: recData },
    });
    console.log('資料寫入成功');

    // 格式化：標題列加粗 + 底色
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          // 標題列格式
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // S級列：黃色底
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 5 },
              cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 0.95, blue: 0.6 } } },
              fields: 'userEnteredFormat.backgroundColor',
            },
          },
          // A級列：綠色底
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 5, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 5 },
              cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } } },
              fields: 'userEnteredFormat.backgroundColor',
            },
          },
          // B級列：藍色底
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 12, endRowIndex: 17, startColumnIndex: 0, endColumnIndex: 5 },
              cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.92, blue: 1 } } },
              fields: 'userEnteredFormat.backgroundColor',
            },
          },
          // 自動調整欄寬
          { autoResizeDimensions: { dimensions: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 } } },
          // 凍結第一列
          { updateSheetProperties: { properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        ],
      },
    });
    console.log('格式化完成');
    console.log(`✅ 完成！開啟連結查看：https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
  } catch (err) {
    console.error('錯誤:', err.message);
    process.exit(1);
  }
}

run();
