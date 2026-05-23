import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 讀取 .env.local
const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx), l.slice(idx + 1)]
    })
)

const SHEET_ID = env.GOOGLE_SHEET_ID
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function run() {
  // 1. 取得現有分頁清單
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existing = meta.data.sheets.map(s => ({
    id: s.properties.sheetId,
    title: s.properties.title,
  }))
  console.log('現有分頁：', existing.map(s => s.title))

  const TABS = ['評價紀錄', '中獎紀錄', '獎品設定']
  const requests = []

  // 2. 新增缺少的分頁
  for (const tab of TABS) {
    if (!existing.find(s => s.title === tab)) {
      requests.push({ addSheet: { properties: { title: tab } } })
      console.log(`新增分頁：${tab}`)
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    })
  }

  // 3. 寫入標題列
  const headerData = [
    {
      range: '評價紀錄!A1:F1',
      values: [['時間戳記', 'LINE UID', '訂單編號', '星評', '評價內容', '已抽獎']],
    },
    {
      range: '中獎紀錄!A1:E1',
      values: [['時間戳記', 'LINE UID', '訂單編號', '獎品名稱', '兌獎狀態']],
    },
    {
      range: '獎品設定!A1:D1',
      values: [['格號', '獎品名稱', '機率', '顏色']],
    },
    {
      range: '獎品設定!A2:D9',
      values: [
        ['1', '正裝產品乙件', '3',  '#FF6B9D'],
        ['2', '精華液體驗組', '7',  '#FFB347'],
        ['3', '面膜×3片',    '10', '#87CEEB'],
        ['4', '小樣組合包',  '15', '#98FB98'],
        ['5', '85折優惠券',  '15', '#DDA0DD'],
        ['6', '9折優惠券',   '20', '#F0E68C'],
        ['7', '生日加碼禮',  '10', '#20B2AA'],
        ['8', '積分×200點',  '20', '#FF8C69'],
      ],
    },
  ]

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: headerData,
    },
  })

  console.log('✅ Google Sheets 設定完成！')
  console.log('  - 評價紀錄：標題列已建立')
  console.log('  - 中獎紀錄：標題列已建立')
  console.log('  - 獎品設定：標題列 + 8 格獎品已建立')
}

run().catch(err => {
  console.error('❌ 錯誤：', err.message)
  process.exit(1)
})
