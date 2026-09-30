// 提醒「已確認收款但還沒填收件資訊」的客人
// 用法：node scripts/remind_shipping_info.mjs [--do]
import { google } from 'googleapis'; import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth}); const DO = process.argv.includes('--do');
const get = async r => (await sheets.spreadsheets.values.get({spreadsheetId:env.GOOGLE_SHEET_ID, range:r})).data.values||[];
// 可用第一個非 -- 參數指定連線；不給就用設定分頁的當期連線
const argCampaign = process.argv.slice(2).find((a) => !a.startsWith('--'));
const campaign = argCampaign || Object.fromEntries((await get('設定!A:B'))).title;
const rows = (await get('訂單表!A:R')).slice(1).filter(r =>
  r[8]===campaign && r[7]!=='已取消' && r[7]!=='已出貨' && r[9]==='已確認' && !String(r[13]||'').trim() && r[2]);
const byUser = {};
for (const r of rows) (byUser[r[2]] ??= {name:r[3], orders:[]}).orders.push({id:r[1], items:String(r[4]||''), total:Number(r[5]||0)});
const build = ({name, orders}) => {
  const list = orders.map(x=>`▪︎ 訂單 ${x.id}\n　${x.items.split('\n').join('\n　')}\n　NT$${x.total.toLocaleString()}`).join('\n\n');
  return `${name} 您好，這裡是 HERA 凱麗 🤍

再次提醒您，您的款項我們已經收到並確認了，但因為還沒收到您的取貨資訊，這筆訂單一直沒辦法出貨 🙏

${list}

這檔的貨都已經到齊、陸續在出貨了，麻煩您抽空點下方連結填一下收件人姓名、手機與 7-11 取貨門市（門市名稱＋店號），填好我們就會立刻幫您寄出：
👉 https://liff.line.me/2009584152-1OeHbXjx/my-orders

💡 小提醒：選門市前可以先到 7-11 電子地圖確認該門市有提供包裹寄取件服務，避免包裹寄不出去。

如果填寫上有任何困難，或想改成其他方式取貨，直接在這裡回覆我們，我們幫您處理 ✨`;
};
const entries = Object.entries(byUser);
console.log(`連線=${campaign}　已付款未填收件：${rows.length} 筆 → ${entries.length} 位客人`);
entries.forEach(([,u])=>console.log(`  ${u.name} | ${u.orders.map(o=>o.id).join(', ')}`));
if (!DO) { console.log('\n===== 範例 =====\n'+build(entries[0][1])+'\n\n(預覽，未送出)'); process.exit(0); }
let ok=0; const log=[];
for (const [uid,u] of entries) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:uid, messages:[{type:'text', text:build(u)}]})});
  const body = res.ok?'':await res.text(); log.push({name:u.name, orders:u.orders.map(o=>o.id), status:res.status, body});
  if (res.ok) ok++; else console.log('FAIL', u.name, res.status, body);
  await new Promise(r=>setTimeout(r,120));
}
fs.writeFileSync(`docs/remind_shipping_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(log,null,1));
console.log(`成功 ${ok}/${entries.length}`);
