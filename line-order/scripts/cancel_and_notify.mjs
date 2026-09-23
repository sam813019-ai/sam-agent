// 批次取消訂單並各自 push 取消通知。只取消「未付款」(J≠已確認) 的單，已付款的會跳過並列出。
// 用法：node scripts/cancel_and_notify.mjs <id1> <id2> ... [--do]
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const DO = process.argv.includes('--do'); const ids = [...new Set(process.argv.slice(2).filter(a=>!a.startsWith('--')))];
const o = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:'訂單表!A:R'})).data.values||[];
const p = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:'代購訂單!A:J'})).data.values||[];
const targets=[], skipped=[];
for (const id of ids) {
  const i = o.findIndex(r=>String(r[1]||'')===id);
  if (i<0) { skipped.push([id,'找不到']); continue; }
  const r=o[i];
  if (r[7]==='已取消') { skipped.push([id,`${r[3]} 已經是已取消`]); continue; }
  if (r[9]==='已確認'||r[9]==='已回報') { skipped.push([id,`${r[3]} 付款狀態=${r[9]}，不自動取消`]); continue; }
  targets.push({id, row:i+1, name:r[3], userId:r[2], items:String(r[4]||'').replace(/\n/g,'；'), total:Number(r[5]||0), J:r[9]||''});
}
console.log(`要取消 ${targets.length} 筆，跳過 ${skipped.length} 筆`);
targets.forEach(t=>console.log(`  ${t.id} | ${t.name} | ${t.items} | NT$${t.total} | J=${t.J}`));
skipped.forEach(s=>console.log('  SKIP', s[0], s[1]));
if (!DO) { console.log('(預覽，未寫入)'); process.exit(0); }
const data=[];
for (const t of targets) {
  data.push({range:`訂單表!H${t.row}`, values:[['已取消']]}, {range:`訂單表!J${t.row}`, values:[['']]});
  // 代購訂單用 時間+姓名 對應（一張訂單多列），J=狀態
  p.forEach((r,i)=>{ if (String(r[0]||'')===String(o[t.row-1][0]) && String(r[1]||'')===t.name) data.push({range:`代購訂單!J${i+1}`, values:[['已取消']]}); });
}
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:SID, requestBody:{valueInputOption:'RAW', data}});
const v = (await sheets.spreadsheets.values.get({spreadsheetId:SID, range:'訂單表!A:J'})).data.values;
let bad=0; for (const t of targets){ const r=v[t.row-1]; if (r[7]!=='已取消'||(r[9]||'')!=='') { bad++; console.log('驗證失敗', t.id, r[7], r[9]); } }
console.log(`Sheet 寫入完成，驗證 ${targets.length-bad}/${targets.length} OK`);
let ok=0;
for (const t of targets) {
  if (!t.userId) { console.log('無 userId 略過推播', t.id); continue; }
  const text = `${t.name} 您好，這裡是 HERA 凱麗 🤍

依您的需求，已幫您取消以下訂單：

▪︎ 訂單 ${t.id}
　${t.items}
　NT$${t.total.toLocaleString()}

這筆不需要匯款，「我的訂單」裡也不會再顯示。之後有喜歡的款式歡迎再回來下單，謝謝您 ✨`;
  const res = await fetch('https://api.line.me/v2/bot/message/push', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:t.userId, messages:[{type:'text', text}]}) });
  if (res.ok) ok++; else console.log('推播失敗', t.id, t.name, res.status, await res.text());
  await new Promise(r=>setTimeout(r,120));
}
console.log(`推播成功 ${ok}/${targets.length}`);
