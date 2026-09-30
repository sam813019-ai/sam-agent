// 用收件人姓名比對訂單（已確認收款、已填收件、未取消）
import { google } from 'googleapis'; import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const auth = new google.auth.JWT({ email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({version:'v4', auth});
const groups = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const o = ((await sheets.spreadsheets.values.get({spreadsheetId:env.GOOGLE_SHEET_ID, range:'訂單表!A:R'})).data.values||[]).slice(1);
const out = {};
for (const [due, names] of Object.entries(groups)) {
  out[due] = [];
  for (const nm of names) {
    const hits = o.filter(r => String(r[13]||'').trim()===nm && r[7]!=='已取消');
    if (!hits.length) {
      const loose = o.filter(r => (String(r[13]||'').includes(nm) || String(r[3]||'').includes(nm)) && r[7]!=='已取消');
      console.log(`❌ ${nm} 找不到精確收件人${loose.length?'（模糊命中 '+loose.map(r=>r[1]+' 收件='+r[13]+' 下單名='+r[3]).join(' / ')+'）':''}`);
      continue;
    }
    for (const r of hits) out[due].push({name:nm, orderId:r[1], displayName:r[3], userId:r[2], total:r[5], H:r[7], J:r[9], store:`${r[15]}(${r[16]})`, phone:r[14]});
  }
}
for (const [due, list] of Object.entries(out)) {
  console.log(`\n=== 截止 9/${due}：${list.length} 筆 ===`);
  list.forEach(x=>console.log(`  ${x.name} | ${x.orderId} | ${x.displayName} | ${x.total} | H=${x.H} J=${x.J} | ${x.store} | uid=${x.userId?'有':'無'}`));
}
fs.writeFileSync('/private/tmp/claude-501/-Users-mac-Downloads-sam-agent/7ee9858e-7de2-4448-a4e9-000fc78452a0/scratchpad/matched.json', JSON.stringify(out,null,1));
