const pptxgen = require('pptxgenjs');
const ONLY = process.argv[2] ? parseInt(process.argv[2]) : 0;
const SLIDES = [];
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5
p.author = 'HEIWEI 何謂美';
p.title  = '何謂美_週報統一模板';

const INK='1F2933', SUB='5A6773', LINE='D9DEE3', BG='FFFFFF', SOFT='F4F6F8';
const G='2E7D32', Y='E09B00', R='C62828';
const GBG='E8F3E9', YBG='FDF3DF', RBG='FBE9E9';
const F='Calibri', FH='Cambria';
const W=13.33;

function head(s, dept, line2, badge){
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:1.02,fill:{color:INK}});
  s.addText([{text:dept,options:{bold:true,color:'FFFFFF',fontSize:25,fontFace:FH}},
             {text:'   '+line2,options:{color:'B7C2CC',fontSize:13,fontFace:F}}],
    {x:0.55,y:0.16,w:9.4,h:0.68,isTextBox:true,margin:0,valign:'middle'});
  s.addShape(p.ShapeType.roundRect,{x:11.0,y:0.3,w:1.85,h:0.42,rectRadius:0.2,fill:{color:'2E3C49'}});
  s.addText(badge,{x:11.0,y:0.3,w:1.85,h:0.42,isTextBox:true,margin:0,align:'center',valign:'middle',
    color:'C9D4DD',fontSize:11,fontFace:F,bold:true});
}
function foot(s,t){
  s.addText(t,{x:0.55,y:7.06,w:12.2,h:0.26,isTextBox:true,margin:0,color:SUB,fontSize:9.5,fontFace:F});
}
function card(s,x,y,w,h,fill){
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.05,fill:{color:fill||SOFT},
    line:{color:LINE,width:0.75}});
}
function secTitle(s,x,y,w,txt,col){
  s.addText(txt,{x,y,w,h:0.3,isTextBox:true,margin:0,bold:true,fontSize:13,fontFace:FH,color:col||INK});
}
function bullets(s,x,y,w,h,items,sz){
  s.addText(items.map((t,i)=>({text:t,options:{bullet:{code:'2022',indent:12},breakLine:i<items.length-1}})),
    {x,y,w,h,isTextBox:true,margin:0,valign:'top',fontSize:sz||10.5,fontFace:F,color:INK,
     paraSpaceAfter:6,lineSpacing:15,indentLevel:0});
}

/* ─────────── S1 本週工作進度 ─────────── */
SLIDES.push(function(p){ const s=p.addSlide();
s.background={color:BG};
head(s,'【部門名稱】｜本週工作進度','【YYYY/MM/DD – MM/DD】（含 N 個工作日）','主管追蹤版');

// 數字帶
const tiles=[
 ['本週營收','【NT$______】','進行中團購／訂單數'],
 ['上週承諾','【_ / _ 項完成】','未完成請寫原因'],
 ['紅燈項目','【_ 項】','其中卡關逾兩週 _ 項'],
 ['等待他人','【_ 項】','見第 2 頁跨部門依賴'],
];
tiles.forEach((t,i)=>{
  const x=0.55+i*3.12;
  card(s,x,1.28,2.92,0.98);
  s.addText(t[0],{x:x+0.18,y:1.36,w:2.56,h:0.22,isTextBox:true,margin:0,fontSize:9.5,color:SUB,fontFace:F});
  s.addText(t[1],{x:x+0.18,y:1.56,w:2.56,h:0.34,isTextBox:true,margin:0,fontSize:16,bold:true,color:INK,fontFace:FH});
  s.addText(t[2],{x:x+0.18,y:1.92,w:2.56,h:0.22,isTextBox:true,margin:0,fontSize:8.5,color:SUB,fontFace:F});
});

// 三燈號
const cols=[
 {t:'綠燈｜本週完成',c:G,bg:GBG,x:0.55,
  items:['【事項】＋【數字】—— 例：完成出貨 381 筆（團購 210／一般 171）',
         '【事項】＋【數字】—— 例：CRM 純新品 Email 寄送 1,440 封',
         '寫「完成」的事一定要帶數量、金額或百分比',
         '沒有數字的完成事項，請改放黃燈']},
 {t:'黃燈｜進行中',c:Y,bg:YBG,x:4.83,
  items:['【事項】—— 目前進度【_%／第_階段】，預計【MM/DD】完成',
         '【事項】—— 目前進度【__】，預計【MM/DD】完成',
         '每一項都必須有「預計完成日」',
         '沒有完成日的項目，請改放紅燈']},
 {t:'紅燈｜異常／待調整',c:R,bg:RBG,x:9.11,
  items:['【問題】—— 影響【_ 筆訂單／_ 位顧客／NT$_】，首次出現【MM/DD】',
         '【問題】—— 影響【__】，首次出現【MM/DD】，已卡【_ 天】',
         '紅燈必須寫「影響多大」與「卡多久」',
         '連續三週紅燈 → 自動升級為第 2 頁的老闆決策項']},
];
cols.forEach(c=>{
  card(s,c.x,2.44,3.67,4.4,c.bg);
  s.addShape(p.ShapeType.ellipse,{x:c.x+0.2,y:2.62,w:0.2,h:0.2,fill:{color:c.c}});
  s.addText(c.t,{x:c.x+0.48,y:2.56,w:3.0,h:0.3,isTextBox:true,margin:0,bold:true,fontSize:13,fontFace:FH,color:c.c});
  bullets(s,c.x+0.22,3.0,3.3,3.7,c.items,10);
});
foot(s,'燈號定義｜綠＝本週已完成且可舉證　黃＝正常進行中且有明確完成日　紅＝異常、卡關、需他人決策，或無明確下一步');
});

/* ─────────── S2 時程・依賴・決策 ─────────── */
SLIDES.push(function(p){ const s=p.addSlide();
s.background={color:BG};
head(s,'【部門名稱】｜重要時程與待決事項','【YYYY/MM/DD – MM/DD】','主管追蹤版');

secTitle(s,0.55,1.3,4,'本週重要時程');
const rows=[['MM/DD','【事項】','【數字結果】'],['MM/DD','【事項】','【數字結果】'],
            ['MM/DD','【事項】','【數字結果】'],['MM/DD','【事項】','【數字結果】'],
            ['MM/DD','【事項】','【數字結果】']];
s.addTable([[{text:'日期',options:{bold:true}},{text:'事項',options:{bold:true}},{text:'結果／數量',options:{bold:true}}],...rows],
 {x:0.55,y:1.68,w:6.1,colW:[0.95,3.05,2.1],rowH:0.36,fontSize:10,fontFace:F,color:INK,
  border:{type:'solid',color:LINE,pt:0.75},fill:{color:'FFFFFF'},valign:'middle',
  autoPage:false});

secTitle(s,7.0,1.3,5.8,'跨部門依賴（新增欄位）');
card(s,7.0,1.68,5.78,1.28,SOFT);
s.addText([{text:'我在等誰：',options:{bold:true,color:R}},
           {text:'【部門／人】的【什麼事】，已等【_ 天】，卡住我的【什麼工作】',options:{color:INK}}],
 {x:7.2,y:1.8,w:5.4,h:0.5,isTextBox:true,margin:0,fontSize:10,fontFace:F});
s.addText([{text:'誰在等我：',options:{bold:true,color:G}},
           {text:'【部門／人】等我的【什麼事】，我承諾【MM/DD】給',options:{color:INK}}],
 {x:7.2,y:2.34,w:5.4,h:0.5,isTextBox:true,margin:0,fontSize:10,fontFace:F});

secTitle(s,7.0,3.12,5.8,'待老闆拍板決策');
[1,2,3].forEach((n,i)=>{
  const y=3.5+i*0.86;
  card(s,7.0,y,5.78,0.76,'FFFFFF');
  s.addShape(p.ShapeType.ellipse,{x:7.18,y:y+0.2,w:0.36,h:0.36,fill:{color:INK}});
  s.addText(String(n),{x:7.18,y:y+0.2,w:0.36,h:0.36,isTextBox:true,margin:0,align:'center',
    valign:'middle',color:'FFFFFF',fontSize:12,bold:true,fontFace:F});
  s.addText([{text:'【要決定的事】',options:{bold:true,fontSize:11}},
             {text:'　選項 A【__】／選項 B【__】｜不決定的後果：【__】',options:{fontSize:9.5,color:SUB}}],
   {x:7.68,y:y+0.14,w:4.95,h:0.5,isTextBox:true,margin:0,fontFace:F,color:INK});
});

secTitle(s,0.55,4.22,6.1,'本週產出可舉證連結');
card(s,0.55,4.6,6.1,2.24,SOFT);
bullets(s,0.75,4.78,5.7,1.9,[
 '報表／後台截圖：【連結或檔名】',
 '社群貼文／影片：【連結】',
 'Email 寄送紀錄：【連結】',
 '訂單／出貨明細：【連結】',
 '沒有佐證的數字，主管一律視為未完成'],10);
foot(s,'填寫原則｜數字一律取自系統（Shopline 後台／標籤系統），同一個數字全公司只有一個來源，不自行估算');
});

/* ─────────── S3 下週計畫 ─────────── */
SLIDES.push(function(p){ const s=p.addSlide();
s.background={color:BG};
head(s,'【部門名稱】｜下週工作計畫','【YYYY/MM/DD – MM/DD】','執行追蹤版');

const pr=[
 {t:'高優先｜本週必達',c:INK,x:0.55,
  items:['【MM/DD】完成【事項】，交付【具體產出】',
         '【MM/DD】完成【事項】，交付【具體產出】',
         '【MM/DD】完成【事項】，交付【具體產出】',
         '此欄每項下週要逐條結算達成與否']},
 {t:'中優先｜正常推進',c:'44525E',x:4.83,
  items:['【事項】—— 預計【MM/DD】',
         '【事項】—— 預計【MM/DD】',
         '【事項】—— 預計【MM/DD】',
         '本週沒做完不算失敗，但要說明順延原因']},
 {t:'籌備｜待條件成熟',c:'6B7885',x:9.11,
  items:['【事項】—— 需先有【什麼條件】才能啟動',
         '【事項】—— 需先有【什麼條件】才能啟動',
         '卡在別人身上的，同步寫進第 2 頁「我在等誰」']},
];
pr.forEach(c=>{
  card(s,c.x,1.3,3.67,2.9);
  s.addText(c.t,{x:c.x+0.22,y:1.44,w:3.3,h:0.3,isTextBox:true,margin:0,bold:true,fontSize:13,fontFace:FH,color:c.c});
  bullets(s,c.x+0.22,1.84,3.3,2.2,c.items,10);
});

secTitle(s,0.55,4.4,12.2,'下週日程（只填工作，節慶與假期另註於備註）');
const d=[['MM/DD (一)','【事項】'],['MM/DD (二)','【事項】'],['MM/DD (三)','【事項】'],
         ['MM/DD (四)','【事項】'],['MM/DD (五)','【事項】']];
d.forEach((r,i)=>{
  const x=0.55+i*2.48;
  card(s,x,4.78,2.3,1.5,'FFFFFF');
  s.addText(r[0],{x:x+0.16,y:4.9,w:2.0,h:0.26,isTextBox:true,margin:0,bold:true,fontSize:10.5,color:INK,fontFace:F});
  s.addText(r[1],{x:x+0.16,y:5.18,w:2.0,h:0.98,isTextBox:true,margin:0,fontSize:9.5,color:SUB,fontFace:F});
});
s.addText('連假出貨停擺日、到貨預期變動，請寫在此列並同步通知客服',
 {x:0.55,y:6.42,w:12.2,h:0.3,isTextBox:true,margin:0,fontSize:9.5,color:R,fontFace:F,italic:true});
foot(s,'優先級定義｜高＝本週必達，下週結算　中＝正常推進，可順延但須說明　籌備＝條件未到，先卡位不排期');
});

/* ─────────── S4 填寫規則 ─────────── */
SLIDES.push(function(p){ const s=p.addSlide();
s.background={color:INK};
s.addText('填寫規則',{x:0.55,y:0.5,w:6,h:0.6,isTextBox:true,margin:0,bold:true,fontSize:30,color:'FFFFFF',fontFace:FH});
s.addText('三個部門共用此模板，每週一上午繳交',
 {x:0.55,y:1.12,w:8,h:0.3,isTextBox:true,margin:0,fontSize:12,color:'A8B4BF',fontFace:F});

const rules=[
 ['1','每個完成事項都要有數字','「完成出貨」不算，「出貨 381 筆」才算。沒有數字的請放黃燈。'],
 ['2','紅燈要寫影響範圍與卡關天數','「部分訂單無法出貨」不算，「缺貨 77 支、影響 59 筆訂單、卡 4 天」才算。'],
 ['3','同一個數字全公司一個來源','CRM 寄送數以標籤系統為準，營收以 Shopline 後台為準。兩個部門報同一件事前先對數。'],
 ['4','上週承諾要結算','第 1 頁的「上週承諾」欄位，未完成須寫原因，不可略過。'],
 ['5','專有名詞第一次出現要解釋','例如「問題 13」請寫成「問題 13（功效宣稱法規審查）」。'],
 ['6','跨部門的事要標出來','你在等誰、誰在等你，寫進第 2 頁。這是主管排解卡關的依據。'],
 ['7','節慶不是工作項目','中秋、教師節不佔時程格；要寫的是連假對出貨與客服的影響。'],
];
rules.forEach((r,i)=>{
  const y=1.62+i*0.75;
  s.addShape(p.ShapeType.ellipse,{x:0.55,y:y+0.08,w:0.4,h:0.4,fill:{color:'2E3C49'}});
  s.addText(r[0],{x:0.55,y:y+0.08,w:0.4,h:0.4,isTextBox:true,margin:0,align:'center',valign:'middle',
    color:'FFFFFF',fontSize:12,bold:true,fontFace:F});
  s.addText(r[1],{x:1.12,y:y+0.02,w:3.8,h:0.3,isTextBox:true,margin:0,bold:true,fontSize:12.5,color:'FFFFFF',fontFace:FH});
  s.addText(r[2],{x:5.05,y:y+0.02,w:7.7,h:0.55,isTextBox:true,margin:0,fontSize:10.5,color:'B7C2CC',fontFace:F});
});
s.addText('何鑽美國際有限公司　HEIWEI INTERNATIONAL CO., LTD.',
 {x:0.55,y:7.02,w:12.2,h:0.3,isTextBox:true,margin:0,fontSize:9,color:'6B7885',fontFace:F});
});

SLIDES.forEach((fn,i)=>{ if(!ONLY || ONLY===i+1) fn(p); });
p.writeFile({fileName: ONLY? ('qa'+ONLY+'.pptx') : '何謂美_週報統一模板_v1.pptx'}).then(f=>console.log('produced',f));
