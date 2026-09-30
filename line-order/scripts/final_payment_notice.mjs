// 最後通知：待匯款客人，今晚未匯款將自動取消
// 用法：node scripts/final_payment_notice.mjs "<截止敘述>" [--do]
import { google } from 'googleapis'; import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth});
const DEADLINE = process.argv[2]; const DO = process.argv.includes('--do');
const get = async r => (await sheets.spreadsheets.values.get({spreadsheetId:env.GOOGLE_SHEET_ID, range:r})).data.values||[];
const st = Object.fromEntries(await get('設定!A:B'));
const campaign = st.title, bank = st.payment_bank || '國泰世華（013）', acct = st.payment_account || '014506140928';
const rows = (await get('訂單表!A:R')).slice(1).filter(r => r[8]===campaign && r[7]!=='已取消' && r[9]==='待匯款' && r[2]);
const byUser = {};
for (const r of rows) (byUser[r[2]] ??= {name:r[3], orders:[]}).orders.push({id:r[1], items:String(r[4]||''), total:Number(r[5]||0)});
const build = ({name, orders}) => {
  const list = orders.map(x=>`▪︎ 訂單 ${x.id}\n　${x.items.split('\n').join('\n　')}\n　應付 NT$${x.total.toLocaleString()}`).join('\n\n');
  const sum = orders.length>1 ? `\n\n合計應付 NT$${orders.reduce((s,x)=>s+x.total,0).toLocaleString()}` : '';
  return `${name} 您好，這裡是 HERA 凱麗 🤍

⚠️ 最後提醒：以下訂單我們還沒收到您的匯款

${list}${sum}

這次連線的貨都已經陸續到齊、開始出貨了，為了結清帳務，${DEADLINE}仍未收到匯款的訂單，我們會直接幫您取消，不再另行通知，還請見諒 🙏

匯款資訊
${bank} ${acct}

匯款完成後，請務必點下方連結回報後五碼或上傳截圖，我們核對確認後才算完成訂單：
👉 https://liff.line.me/2009584152-1OeHbXjx/my-orders

✅ 如果您已經匯款了，麻煩也到上面連結補填回報，我們才對得到帳，否則一樣會被取消喔
❌ 如果不需要了，直接在這裡回覆我們就好，我們幫您取消，不會影響之後的購買

謝謝您 ✨`;
};
const entries = Object.entries(byUser);
console.log(`連線=${campaign}　待匯款 ${rows.length} 筆 → ${entries.length} 位客人`);
if (!DO) { console.log('\n===== 範例 =====\n'+build(entries[0][1])+'\n\n(預覽，未送出)'); process.exit(0); }
let ok=0; const log=[];
for (const [uid,u] of entries) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:uid, messages:[{type:'text', text:build(u)}]})});
  const body = res.ok?'':await res.text(); log.push({uid, name:u.name, orders:u.orders.map(o=>o.id), status:res.status, body});
  if (res.ok) ok++; else console.log('FAIL', u.name, res.status, body);
  if (res.status===429) { console.log('額度用完，停止'); break; }
  await new Promise(r=>setTimeout(r,120));
}
fs.writeFileSync(`docs/final_notice_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(log,null,1));
console.log(`成功 ${ok}/${entries.length}`);
