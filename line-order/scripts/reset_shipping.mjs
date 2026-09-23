// 清掉訂單的 7-11 收件資訊 (N~R)，讓客人在「我的訂單」重新填寫；舊資料備份到 G 備註
// 用法：node scripts/reset_shipping.mjs <訂單編號> [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const ORDER_ID = process.argv[2]; const DO = process.argv.includes('--do');
const o = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:'訂單表!A:R'})).data.values||[];
const i = o.findIndex(r=>String(r[1]||'')===ORDER_ID); if (i<0){ console.log('找不到訂單'); process.exit(1); }
const r = o[i]; const n = i+1;
console.log(`列${n} 客戶=${r[3]} userId=${r[2]||'(空)'} 總額=${r[5]} H=${r[7]} J=${r[9]||''} 收件=${r[13]||''}/${r[14]||''}/${r[15]||''}(${r[16]||''}) 填寫於 ${r[17]||''}`);
if (!r[13]) { console.log('本來就沒有收件資訊'); process.exit(0); }
const note = `${r[6]||''}${r[6]?'；':''}原門市 ${r[15]}(${r[16]}) 無法配送，${new Date().toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})} 清除請客人重填`;
console.log('備註將改為：', note);
if (!DO){ console.log('(預覽，未寫入)'); process.exit(0); }
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SID, requestBody:{valueInputOption:'RAW', data:[
  {range:`訂單表!G${n}`, values:[[note]]},
  {range:`訂單表!N${n}:R${n}`, values:[['','','','','']]},
]}});
const v = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:`訂單表!J${n}:R${n}`})).data.values;
console.log('讀回 J~R:', JSON.stringify(v));
