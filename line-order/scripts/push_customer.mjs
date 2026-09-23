// 依訂單編號找客人 userId 並 push 一則 LINE 文字訊息
// 用法：node scripts/push_customer.mjs <訂單編號> "<訊息>" [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth});
const [ORDER_ID, TEXT] = process.argv.slice(2); const DO = process.argv.includes('--do');
const o = (await sheets.spreadsheets.values.get({spreadsheetId:env.GOOGLE_SHEET_ID, range:'訂單表!A:M'})).data.values||[];
const row = o.find(r=>String(r[1]||'')===ORDER_ID);
if (!row) { console.log('找不到訂單'); process.exit(1); }
console.log(`客戶=${row[3]} userId=${row[2]||'(空)'} 總額=${row[5]} H=${row[7]} J=${row[9]||''} 後五碼=${row[10]||''} 截圖=${row[11]||''} 回報時間=${row[12]||''}`);
if (!row[2]) { console.log('沒有 userId，無法推播'); process.exit(1); }
console.log('--- 訊息 ---\n'+TEXT+'\n---');
if (!DO) { console.log('(預覽，未送出)'); process.exit(0); }
const res = await fetch('https://api.line.me/v2/bot/message/push', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:row[2], messages:[{type:'text', text:TEXT}]}) });
console.log('LINE push', res.status, await res.text());
