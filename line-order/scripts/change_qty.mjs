// 改一張訂單裡某項商品的數量（三個分頁同步）：訂單表 E/F/G、訂單明細 G/H、代購訂單 G/I
// 用法：node scripts/change_qty.mjs <訂單編號> <商品編號> <規格> <新數量> [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const [ORDER_ID, CODE, SPEC, QTY] = process.argv.slice(2); const newQty = Number(QTY); const DO = process.argv.includes('--do');
const get = async (range) => (await sheets.spreadsheets.values.get({spreadsheetId:SID, range})).data.values||[];
const setting = await get('設定!A:B'); const fee = Number((setting.find(r=>r[0]==='shipping_fee')||[])[1] ?? 60);
const o = await get('訂單表!A:R'); const oi = o.findIndex(r=>String(r[1]||'')===ORDER_ID); if (oi<0){console.log('找不到訂單');process.exit(1);} const orow=o[oi];
console.log(`訂單表 列${oi+1} ${orow[3]} 總額=${orow[5]} H=${orow[7]} J=${orow[9]||''}`);
const d = await get('訂單明細!A:I'); const items = d.map((r,i)=>({i,r})).filter(x=>String(x.r[0]||'')===ORDER_ID);
items.forEach(x=>console.log(`  明細 列${x.i+1} | ${x.r[2]} | ${x.r[3]} | ${x.r[4]} | 單價${x.r[5]} x${x.r[6]} = ${x.r[7]}`));
const t = items.filter(x=>String(x.r[2]||'')===CODE && String(x.r[4]||'')===SPEC);
if (t.length!==1){ console.log(`命中 ${t.length} 筆，需為 1`); process.exit(1); }
const tr = t[0].r; const oldQty=Number(tr[6]), unit=Number(tr[5]);
if (newQty<=0){ console.log('數量要 >0；要整項移除請用 cancel_order_item.mjs'); process.exit(1); }
const newItems = items.map(x=>{ const r=[...x.r]; if (x===t[0]) { r[6]=newQty; r[7]=unit*newQty; } return r; });
const newText = newItems.map(r=>{ const label=r[4]?`${r[3]} / ${r[4]}`:r[3]; return `${label} x${r[6]} (NT$${r[5]})`; }).join('\n');
const newTotal = newItems.reduce((s,r)=>s+Number(r[7]),0)+fee;
const note = `${orow[6]||''}${orow[6]?'；':''}${tr[2]} ${tr[4]} x${oldQty}→x${newQty}，總額 ${orow[5]}→${newTotal}（${new Date().toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}）`;
const p = await get('代購訂單!A:J'); const pi = p.findIndex(r=>String(r[0]||'')===String(orow[0]) && String(r[1]||'')===String(orow[3]) && String(r[2]||'')===CODE && String(r[4]||'')===SPEC);
console.log(pi>=0 ? `代購訂單 列${pi+1} | ${p[pi].join(' | ')}` : '代購訂單：未找到對應列');
console.log('\n將改為：\n  明細=',newText.replace(/\n/g,' ; '),'\n  總額=',newTotal,`(含運 ${fee})`,'\n  備註=',note);
if (!DO){ console.log('(預覽，未寫入)'); process.exit(0); }
const data=[
  {range:`訂單表!E${oi+1}:G${oi+1}`, values:[[newText,newTotal,note]]},
  {range:`訂單明細!G${t[0].i+1}:H${t[0].i+1}`, values:[[newQty, unit*newQty]]},
];
// 代購訂單欄位：A日期 B姓名 C編號 D品名 E規格 F進價 G售價 H數量 I小計 J狀態
if (pi>=0) data.push({range:`代購訂單!H${pi+1}:I${pi+1}`, values:[[newQty, Number(p[pi][6]||0)*newQty]]});
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SID, requestBody:{valueInputOption:'RAW', data}});
console.log('讀回訂單表 E~F:', JSON.stringify(await get(`訂單表!E${oi+1}:F${oi+1}`)));
console.log('讀回訂單明細:', (await get('訂單明細!A:I')).filter(r=>r[0]===ORDER_ID).map(r=>r.slice(2).join(' | ')));
