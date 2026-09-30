// 直接對 userId 推播一則文字（給沒有當期訂單的舊客人用）
// 用法：node scripts/push_user.mjs <userId> "<訊息>" [--do]
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const [UID, TEXT] = process.argv.slice(2); const DO = process.argv.includes('--do');
console.log('--- 訊息 ---\n'+TEXT+'\n---');
if (!DO) { console.log('(預覽，未送出)'); process.exit(0); }
const res = await fetch('https://api.line.me/v2/bot/message/push', {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`}, body: JSON.stringify({to:UID, messages:[{type:'text', text:TEXT}]})});
console.log('LINE push', res.status, await res.text());
