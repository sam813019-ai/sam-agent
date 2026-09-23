// 直接幫客人填/改 7-11 收件資訊 (N~R)
// 用法：node scripts/set_shipping.mjs <訂單編號> <收件人> <電話> <門市名稱> <店號> [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const [ORDER_ID, NAME, PHONE, STORE, CODE] = process.argv.slice(2); const DO = process.argv.includes('--do');
const o = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:'訂單表!A:R'})).data.values||[];
const i = o.findIndex(r=>String(r[1]||'')===ORDER_ID); if (i<0){ console.log('找不到訂單'); process.exit(1); }
const r = o[i]; const n = i+1;
console.log(`列${n} 客戶=${r[3]} H=${r[7]} J=${r[9]||''} 目前收件=${r[13]||''}/${r[14]||''}/${r[15]||''}(${r[16]||''})`);
const vals = [NAME, PHONE, STORE, CODE, new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})];
console.log('將寫入 N~R:', vals.join(' / '));
if (!DO){ console.log('(預覽，未寫入)'); process.exit(0); }
await sheets.spreadsheets.values.update({spreadsheetId:SID, range:`訂單表!N${n}:R${n}`, valueInputOption:'RAW', requestBody:{values:[vals]}});
const v = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:`訂單表!N${n}:R${n}`})).data.values;
console.log('讀回 N~R:', JSON.stringify(v));
