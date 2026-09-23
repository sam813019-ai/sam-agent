// 部分取消：一張 LIFF 訂單裡只取消其中一項商品
// 用法：node scripts/cancel_order_item.mjs <訂單編號> <商品編號> [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth});
const SID = env.GOOGLE_SHEET_ID;
const [ORDER_ID, CODE] = process.argv.slice(2); const DO = process.argv.includes('--do');
const get = async (range) => (await sheets.spreadsheets.values.get({spreadsheetId:SID, range})).data.values||[];
const setting = await get('設定!A:B'); const fee = Number((setting.find(r=>r[0]==='shipping_fee')||[])[1] ?? 60);

// 訂單表
const o = await get('訂單表!A:R'); const oi = o.findIndex(r=>String(r[1]||'')===ORDER_ID);
if (oi<0) { console.log('找不到訂單'); process.exit(1); }
const orow = o[oi];
console.log(`訂單表 列${oi+1} ${orow[3]} 總額=${orow[5]} H=${orow[7]} J=${orow[9]||''}`);
// 訂單明細
const d = await get('訂單明細!A:I');
const items = d.map((r,i)=>({i, r})).filter(x=>String(x.r[0]||'')===ORDER_ID);
console.log('訂單明細:'); items.forEach(x=>console.log(`  列${x.i+1} | ${x.r.join(' | ')}`));
const target = items.filter(x=>String(x.r[2]||'')===CODE);
const keep = items.filter(x=>String(x.r[2]||'')!==CODE);
if (target.length!==1) { console.log(`商品 ${CODE} 在該訂單命中 ${target.length} 筆，需為 1 筆`); process.exit(1); }
if (keep.length===0) { console.log('這是訂單唯一一項，請改用 cancel_order.mjs 整張取消'); process.exit(1); }
// 代購訂單：以日期+姓名+商品編號比對（欄位 A時間 B姓名 C編號 D品名 E規格 F進價 G售價 H數量 I毛利 J狀態）
const p = await get('代購訂單!A:J');
const pi = p.findIndex(r=>String(r[0]||'')===String(orow[0]) && String(r[1]||'')===String(orow[3]) && String(r[2]||'')===CODE);
console.log(pi>=0 ? `代購訂單 列${pi+1} | ${p[pi].join(' | ')}` : '代購訂單：未找到對應列');

const newText = keep.map(x=>{ const r=x.r; const label = r[4] ? `${r[3]} / ${r[4]}` : r[3]; return `${label} x${r[6]} (NT$${r[5]})`; }).join('\n');
const newTotal = keep.reduce((s,x)=>s+Number(x.r[7]||0),0) + fee;
const t = target[0].r;
const note = `${orow[6]||''}${orow[6]?'；':''}已取消 ${t[2]} ${t[3]} / ${t[4]} x${t[6]}（${new Date().toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}）`;
console.log('\n將改為：\n  明細=', newText.replace(/\n/g,' ; '), '\n  總額=', newTotal, `(含運 ${fee})`, '\n  備註=', note);
if (!DO) { console.log('(預覽，未寫入)'); process.exit(0); }

await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SID, requestBody:{valueInputOption:'RAW', data:[
  {range:`訂單表!E${oi+1}:G${oi+1}`, values:[[newText, newTotal, note]]},
  ...(pi>=0 ? [{range:`代購訂單!J${pi+1}`, values:[['已取消']]}] : []),
]}});
// 刪掉訂單明細那一列（叫貨統計來源，留著會多算）
const meta = await sheets.spreadsheets.get({spreadsheetId:SID});
const sheetId = meta.data.sheets.find(s=>s.properties.title==='訂單明細').properties.sheetId;
await sheets.spreadsheets.batchUpdate({spreadsheetId:SID, requestBody:{requests:[{deleteDimension:{range:{sheetId, dimension:'ROWS', startIndex:target[0].i, endIndex:target[0].i+1}}}]}});
const v = await get(`訂單表!E${oi+1}:J${oi+1}`); console.log('讀回訂單表 E~J:', JSON.stringify(v));
const d2 = (await get('訂單明細!A:I')).filter(r=>String(r[0]||'')===ORDER_ID); console.log('讀回訂單明細:', d2.map(r=>r.join(' | ')));
