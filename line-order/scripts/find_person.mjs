// 用姓名關鍵字或電話，跨 訂單表 / 客戶對照 / 代購訂單 找人
// 用法：node scripts/find_person.mjs <關鍵字> [電話]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const [KW, PHONE] = process.argv.slice(2);
const tail = PHONE ? PHONE.replace(/\D/g,'').slice(-9) : null;
const get = async (r) => (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:r})).data.values||[];
const has = (v) => KW && String(v||'').includes(KW);
const o = await get('訂單表!A:R');
console.log('=== 訂單表 ===');
let n=0;
o.forEach((r,i)=>{
  const phoneHit = tail && String(r[14]||'').replace(/\D/g,'').endsWith(tail);
  if (has(r[3])||has(r[13])||phoneHit) { n++; console.log(`列${i+1} ${r[0]} ${r[1]} 下單名=${r[3]} 收件=${r[13]||''}/${r[14]||''} ${r[15]||''}(${r[16]||''}) 金額=${r[5]} H=${r[7]} J=${r[9]||''}`); }
});
if (!n) console.log('(無)');
const c = await get('客戶對照!A:D');
console.log('=== 客戶對照 ==='); let m=0;
c.forEach((r,i)=>{ if (has(r[0])||has(r[2])) { m++; console.log(`列${i+1} ${r.join(' | ')}`); } });
if (!m) console.log('(無)');
const p = await get('代購訂單!A:J');
console.log('=== 代購訂單 ==='); let k=0;
p.forEach((r,i)=>{ if (has(r[1])) { k++; console.log(`列${i+1} ${r.join(' | ')}`); } });
if (!k) console.log('(無)');
