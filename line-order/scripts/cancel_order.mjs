import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth});
const SID = env.GOOGLE_SHEET_ID;
const ORDER_ID = process.argv[2]; const DO = process.argv[3]==='--do';
const tab = env.ORDERS_SHEET_NAME || '訂單表';
const r = await sheets.spreadsheets.values.get({spreadsheetId:SID, range:`${tab}!A:R`});
const rows = r.data.values||[];
const idx = rows.findIndex(x=>String(x[1]||'')===ORDER_ID);
if (idx<0){ console.log('找不到訂單', ORDER_ID); process.exit(1); }
const row = rows[idx]; const n = idx+1;
console.log(`列 ${n}: 時間=${row[0]} 客戶=${row[3]} 明細=${row[4]} 總額=${row[5]} 狀態(H)=${row[7]} 付款(J)=${row[9]} 收件人(N)=${row[13]||''}`);
// 代購訂單分頁（備註欄放 orderId）
const p = await sheets.spreadsheets.values.get({spreadsheetId:SID, range:`代購訂單!A:J`});
const prows = p.data.values||[];
// 代購訂單沒有訂單編號欄，用 時間+姓名 對回去（同一張訂單多項商品＝多列）
const pIdx = prows.map((x,i)=>i).filter(i=>String(prows[i][0]||'')===String(row[0]) && String(prows[i][1]||'')===String(row[3]));
pIdx.forEach(i=>console.log(`代購訂單 列 ${i+1}: ${prows[i].join(' | ')}`));
if (!DO){ console.log('(預覽，未寫入)'); process.exit(0); }
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SID, requestBody:{valueInputOption:'RAW', data:[
  {range:`${tab}!H${n}`, values:[['已取消']]},
  {range:`${tab}!J${n}`, values:[['']]},
  ...pIdx.map(i=>({range:`代購訂單!J${i+1}`, values:[['已取消']]})),
]}});
const v = await sheets.spreadsheets.values.get({spreadsheetId:SID, range:`${tab}!H${n}:J${n}`});
console.log('寫回驗證 H~J:', JSON.stringify(v.data.values));
