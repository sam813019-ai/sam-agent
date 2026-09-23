import { google } from "googleapis";
import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
const get=k=>{const m=env.match(new RegExp("^"+k+"=(.*)$","m"));return m?m[1].replace(/^["']|["']$/g,""):"";};
const auth=new google.auth.JWT({
  email:get("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  key:get("GOOGLE_PRIVATE_KEY").replace(/\\n/g,"\n"),
  scopes:["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets=google.sheets({version:"v4",auth});
const SID="1FJzQcTBP9FalpiN7eHMhRFZVqmkDXHqZh3awpBi1NlU";
const meta=await sheets.spreadsheets.get({spreadsheetId:SID});
console.log("=== 分頁 (name / sheetId) ===");
for(const s of meta.data.sheets){console.log(s.properties.title,"=> sheetId",s.properties.sheetId);}
// 找 gid 1886644817 的分頁名
const t=meta.data.sheets.find(s=>s.properties.sheetId===1886644817);
console.log("\n5月分頁名稱 =", t?.properties.title);
// 讀該分頁前 6 列現況
const r=await sheets.spreadsheets.values.get({spreadsheetId:SID,range:`${t.properties.title}!A1:G6`});
console.log("\n=== 5月分頁現況 A1:G6 ===");
console.log(JSON.stringify(r.data.values,null,1));
// 讀 4月分頁 E 欄一格看格式 (用 grid data)
const apr=meta.data.sheets.find(s=>s.properties.title.includes("4")||s.properties.sheetId===715088187);
const g=await sheets.spreadsheets.get({spreadsheetId:SID,ranges:[`${apr.properties.title}!E2`],includeGridData:true});
const cell=g.data.sheets[0].data[0].rowData[0].values[0];
console.log("\n=== 4月 E2 cell ===");
console.log("value:",JSON.stringify(cell.effectiveValue),"| format:",JSON.stringify(cell.userEnteredFormat?.numberFormat));
