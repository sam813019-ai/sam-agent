import { google } from 'googleapis'
import type { Prize } from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const REVIEWS_TAB = '評價紀錄'
const PRIZES_TAB = '中獎紀錄'
const CONFIG_TAB = '獎品設定'

function getClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function checkAlreadyPlayed(
  lineUid: string,
  orderNumber: string
): Promise<boolean> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!B2:F`,
  })
  const rows = res.data.values || []
  // B=lineUid, C=orderNumber, F=已抽獎（offset: 0,1,4）
  return rows.some(r => r[0] === lineUid && r[1] === orderNumber && r[4] === 'TRUE')
}

export async function appendReview(
  lineUid: string,
  orderNumber: string,
  stars: number,
  comment: string
): Promise<void> {
  const sheets = getClient()
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, lineUid, orderNumber, stars, comment, 'FALSE']],
    },
  })
}

export async function markAsPlayed(
  lineUid: string,
  orderNumber: string
): Promise<void> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!B2:F`,
  })
  const rows = res.data.values || []
  const idx = rows.findIndex(r => r[0] === lineUid && r[1] === orderNumber)
  if (idx === -1) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!F${idx + 2}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['TRUE']] },
  })
}

export async function appendPrizeRecord(
  lineUid: string,
  orderNumber: string,
  prizeName: string
): Promise<void> {
  const sheets = getClient()
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PRIZES_TAB}!A:E`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, lineUid, orderNumber, prizeName, '待處理']],
    },
  })
}

export async function getPrizes(): Promise<Prize[]> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CONFIG_TAB}!A2:D9`,
  })
  const rows = res.data.values || []
  return rows
    .filter(r => r[0])
    .map((r, i) => ({
      index: i,
      name: String(r[1] || ''),
      probability: Number(r[2] || 0),
      color: String(r[3] || '#FFB6C1'),
    }))
}
