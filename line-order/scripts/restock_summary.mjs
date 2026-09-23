// 叫貨彙總：只算 J=已確認 且 H≠已取消 的訂單，依 商品編號×規格 彙總（與後台「只算已付款」同邏輯）
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth});
const SID = env.GOOGLE_SHEET_ID;
const get = async (range) => (await sheets.spreadsheets.values.get({spreadsheetId:SID, range})).data.values||[];
const setting = await get('設定!A:B'); const campaign = (setting.find(r=>r[0]==='title')||[])[1];
const o = (await get('訂單表!A:R')).slice(1).filter(r=>String(r[8]||'')===campaign);
const paid = new Set(o.filter(r=>r[7]!=='已取消' && r[9]==='已確認').map(r=>r[1]));
const all = new Set(o.filter(r=>r[7]!=='已取消').map(r=>r[1]));
const reported = new Set(o.filter(r=>r[7]!=='已取消' && r[9]==='已回報').map(r=>r[1]));
const pending = o.filter(r=>r[7]!=='已取消' && r[9]==='待匯款');
const d = (await get('訂單明細!A:I')).slice(1).filter(r=>String(r[8]||'')===campaign);
const agg = (ids)=>{ const m={}; for (const r of d){ if(!ids.has(r[0])) continue; const k=`${r[2]}|${r[3]}|${r[4]}`; m[k]??={code:r[2],name:r[3],spec:r[4],qty:0,amt:0}; m[k].qty+=Number(r[6]||0); m[k].amt+=Number(r[7]||0);} return Object.values(m).sort((a,b)=>a.code.localeCompare(b.code)||a.spec.localeCompare(b.spec)); };
const out = { campaign, paidOrders: paid.size, allOrders: all.size, reportedOrders: reported.size, pendingOrders: pending.length,
  pendingAmt: pending.reduce((s,r)=>s+Number(r[5]||0),0), paid: agg(paid), all: agg(all) };
console.log(JSON.stringify(out,null,1));
