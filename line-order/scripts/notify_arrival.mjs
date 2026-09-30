// 到貨通知：依收件人姓名分組（各組不同取貨截止日）推播
// 用法：node scripts/notify_arrival.mjs <matched.json> [--do]
import { google } from 'googleapis'; import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const groups = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const DO = process.argv.includes('--do');
const build = (x, due) => `${x.name} 您好，這裡是 HERA 凱麗 🤍

您的包裹已經送達門市囉，可以去取貨了 🎉

📍 7-11 ${x.store}
📦 訂單 ${x.orderId}（NT$${Number(x.total).toLocaleString()}）
⏰ 取貨期限：9/${due} 前

超商包裹逾期未取會被退回，麻煩您在期限前抽空去領一下 🙏
取貨時報「${x.name}」的名字或末三碼即可，謝謝您 ✨`;
let all=[]; for (const [due,list] of Object.entries(groups)) list.forEach(x=>all.push({...x, due}));
console.log(`共 ${all.length} 則`);
if (!DO) { console.log('\n'+build(all[0], all[0].due)); console.log('\n(預覽，未送出)'); process.exit(0); }
let ok=0; const log=[];
for (const x of all) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:x.userId, messages:[{type:'text', text:build(x,x.due)}]})});
  const body = res.ok?'':await res.text();
  log.push({name:x.name, orderId:x.orderId, due:x.due, status:res.status, body});
  if (res.ok) ok++; else console.log('FAIL', x.name, x.orderId, res.status, body);
  await new Promise(r=>setTimeout(r,120));
}
fs.writeFileSync(`docs/arrival_log_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(log,null,1));
console.log(`成功 ${ok}/${all.length}`);
