// 催款推播：對當期所有「待匯款」訂單的客人各發一則（同一人多筆合併成一則）
// 用法：node scripts/remind_pending_payment.mjs [--do]   （不加 --do 只預覽前 3 則與總數）
import { google } from 'googleapis';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth}); const SID = env.GOOGLE_SHEET_ID;
const DO = process.argv.includes('--do');
const get = async (range) => (await sheets.spreadsheets.values.get({spreadsheetId:SID, range})).data.values||[];
const setting = Object.fromEntries((await get('設定!A:B')).map(r=>[r[0],r[1]]));
const campaign = setting.title;
const bank = setting.payment_bank || '國泰世華（013）'; const acct = setting.payment_account || '014506140928';
const o = (await get('訂單表!A:R')).slice(1).filter(r=>r[8]===campaign && r[7]!=='已取消' && r[9]==='待匯款' && r[2]);
const byUser = {};
for (const r of o) { (byUser[r[2]] ??= {name:r[3], orders:[]}).orders.push({id:r[1], items:String(r[4]||''), total:Number(r[5]||0)}); }
const build = ({name, orders}) => {
  const list = orders.map(x=>`▪︎ 訂單 ${x.id}\n　${x.items.split('\n').join('\n　')}\n　應付 NT$${x.total.toLocaleString()}`).join('\n\n');
  const sum = orders.length>1 ? `\n\n合計應付 NT$${orders.reduce((s,x)=>s+x.total,0).toLocaleString()}` : '';
  return `${name} 您好，這裡是 HERA 凱麗 🤍

提醒您，以下訂單我們還沒收到匯款：

${list}${sum}

💡 小提醒：匯款完成並回報後，訂單才算正式成立；成立後 7～10 個工作天出貨（7-11 超商取貨，睫毛專用鑷子隨貨附贈 ♥）。

因為這次是預購連線，商品要依已成立的訂單數量向廠商叫貨，還沒匯款的訂單沒辦法先幫您保留，麻煩您盡快完成匯款，我們才能幫您排進出貨 🙏

匯款資訊
${bank} ${acct}

匯款後請點下方「我的訂單」填寫後五碼或上傳截圖，我們核對後會通知您填寫取貨門市：
👉 https://liff.line.me/2009584152-1OeHbXjx/my-orders

若您已經匯款但還沒回報，也請補填一下讓我們對帳；如果不需要了也可以直接跟我們說，謝謝您 ✨`;
};
const entries = Object.entries(byUser);
console.log(`連線=${campaign} 待匯款訂單 ${o.length} 筆 → 客人 ${entries.length} 位`);
if (!DO) { entries.slice(0,2).forEach(([uid,u])=>console.log('\n=====\n'+build(u))); const m=entries.find(([,u])=>u.orders.length>1); if(m) console.log('\n===== 多筆範例 =====\n'+build(m[1])); console.log('\n(預覽，未送出)'); process.exit(0); }
let ok=0, fail=[]; const log=[];
for (const [uid,u] of entries) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:uid, messages:[{type:'text', text:build(u)}]}) });
  const body = await res.text();
  log.push({uid, name:u.name, orders:u.orders.map(x=>x.id), status:res.status, body: res.ok?'':body});
  if (res.ok) ok++; else { fail.push({name:u.name, status:res.status, body}); }
  if (res.status===429) { console.log('額度用完，停止'); break; }
  await new Promise(r=>setTimeout(r,120));
}
fs.writeFileSync(`docs/remind_log_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(log,null,1));
console.log(`成功 ${ok} / 失敗 ${fail.length}`); fail.forEach(f=>console.log('FAIL', f.name, f.status, f.body));
