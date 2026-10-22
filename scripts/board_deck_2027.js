const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/Users/mac/.claude/skills/synced/d9e093a6-200f-41ec-bff4-26313db5af9a_761aa8c7-b286-45ec-ba8e-70b78157d20c/pptx/scripts/apply_theme.js');

const THEME = {
  name: 'HEIWEI Board 2027',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '1F2024', lt1: 'FFFFFF', dk2: '4D4E52', lt2: 'F4F4F5',
    accent1: '25262A',  // 主墨
    accent2: '8C9A8E',  // 葉綠：成長／正面
    accent3: 'C9A15C',  // 金：強調
    accent4: 'EF9F27',  // 琥珀：警示
    accent5: '97999B',  // 灰
    accent6: 'C8CCC8',
    hlink: '8C9A8E', folFlink: '97999B', folHlink: '97999B',
  },
};
const INK='25262A', LEAF='8C9A8E', GOLD='C9A15C', AMBER='EF9F27', GRAY='97999B',
      SOFT='F4F4F5', LINE='E0E0E1', WHITE='FFFFFF';
const ONLY = process.argv[2] ? parseInt(process.argv[2]) : 0;
const SLIDES = [];
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5
p.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
p.author = 'Sam';
p.company = 'HEIWEI';
p.title = 'HEIWEI 2027 年度計畫與預算｜董事會會報';
const C = p.SchemeColor;

const FOOT = '何謂美國際有限公司　｜　機密・僅供董事會';

/* ─────────── 版面 ─────────── */
p.defineSlideMaster({
  title: 'COVER', background: { color: INK },
  objects: [
    { text: { text: 'HEIWEI', options: { x:0.9, y:0.72, w:5, h:0.5, fontSize:21, bold:true, charSpacing:7, color:WHITE, fontFace:'Cambria', isTextBox:true, margin:0 } } },
    { text: { text: '何　謂　美', options: { x:0.93, y:1.2, w:5, h:0.3, fontSize:9.5, charSpacing:5, color:GRAY, isTextBox:true, margin:0 } } },
    { placeholder: { options: { name:'title', type:'title', x:0.9, y:2.6, w:11.5, h:1.5, fontSize:40, bold:true, color:WHITE, fontFace:'Cambria', valign:'bottom', align:'left', margin:0 }, text:' ' } },
    { placeholder: { options: { name:'body', type:'body', x:0.9, y:4.25, w:11.5, h:1.2, fontSize:15, color:'C3C4C7', valign:'top', align:'left', margin:0 }, text:' ' } },
  ],
});
p.defineSlideMaster({
  title: 'SECTION', background: { color: INK },
  objects: [
    { placeholder: { options: { name:'kicker', type:'body', x:0.9, y:2.85, w:11.5, h:0.4, fontSize:12, charSpacing:3, color:GOLD, align:'left', margin:0 }, text:' ' } },
    { placeholder: { options: { name:'title', type:'title', x:0.9, y:3.3, w:11.5, h:1.0, fontSize:34, bold:true, color:WHITE, fontFace:'Cambria', valign:'top', align:'left', margin:0 }, text:' ' } },
    { placeholder: { options: { name:'body', type:'body', x:0.9, y:4.45, w:11.0, h:0.8, fontSize:13.5, color:'C3C4C7', align:'left', margin:0 }, text:' ' } },
  ],
});
p.defineSlideMaster({
  title: 'CONTENT', background: { color: WHITE },
  objects: [
    { placeholder: { options: { name:'title', type:'title', x:0.72, y:0.46, w:11.9, h:0.62, fontSize:25, bold:true, color:INK, fontFace:'Cambria', valign:'middle', align:'left', margin:0 }, text:' ' } },
    { text: { text: FOOT, options: { x:0.72, y:7.0, w:7, h:0.26, fontSize:8.5, color:'B4B5B8', isTextBox:true, margin:0 } } },
  ],
  slideNumber: { x:12.3, y:7.0, w:0.4, h:0.26, fontSize:8.5, color:'B4B5B8', align:'right' },
});
p.defineSlideMaster({
  title: 'CLOSING', background: { color: INK },
  objects: [
    { placeholder: { options: { name:'title', type:'title', x:0.9, y:0.62, w:11.5, h:0.7, fontSize:26, bold:true, color:WHITE, fontFace:'Cambria', valign:'middle', align:'left', margin:0 }, text:' ' } },
    { text: { text: FOOT, options: { x:0.9, y:7.0, w:7, h:0.26, fontSize:8.5, color:'6A6B6F', isTextBox:true, margin:0 } } },
  ],
});

/* ─────────── 共用元件 ─────────── */
const card = (s,x,y,w,h,fill,opts={}) => s.addShape(p.ShapeType.roundRect,
  Object.assign({ x,y,w,h, rectRadius:0.04, fill:{color:fill||SOFT}, line:{color:opts.line||LINE,width:0.75} }, opts.extra||{}));
const kpi = (s,x,y,w,label,val,unit,sub,dark) => {
  card(s,x,y,w,1.52, dark?INK:SOFT, dark?{line:INK}:{});
  s.addText(label,{x:x+0.26,y:y+0.17,w:w-0.52,h:0.26,isTextBox:true,margin:0,fontSize:11,color:dark?'B8BABD':'5F6064'});
  s.addText([{text:val,options:{fontSize:34,bold:true,color:dark?WHITE:INK,fontFace:'Cambria'}},
             {text:unit||'',options:{fontSize:13,bold:true,color:dark?WHITE:INK}}],
    {x:x+0.26,y:y+0.47,w:w-0.52,h:0.58,isTextBox:true,margin:0,valign:'middle'});
  s.addText(sub,{x:x+0.26,y:y+1.08,w:w-0.52,h:0.3,isTextBox:true,margin:0,fontSize:9.5,color:dark?'9A9CA0':GRAY});
};
const note = (s,y,txt,color) => {
  card(s,0.72,y,11.9,0.62,SOFT);
  s.addText(txt,{x:1.0,y:y+0.06,w:11.4,h:0.5,isTextBox:true,margin:0,fontSize:11.5,color:'3C3D41',valign:'middle'});
  s.addShape(p.ShapeType.rect,{x:0.72,y:y,w:0.055,h:0.62,fill:{color:color||LEAF}});
};
const CHARTBASE = {
  showLegend:false, chartColors:[INK],
  catAxisLabelColor:'6A6B6F', catAxisLabelFontSize:10.5, catAxisLabelFontFace:'+mn-lt',
  valAxisLabelColor:'6A6B6F', valAxisLabelFontSize:10,  valAxisLabelFontFace:'+mn-lt',
  dataLabelColor:INK, dataLabelFontSize:10, dataLabelFontFace:'+mn-lt',
  valGridLine:{ color:'EDEDEE', size:1 }, catGridLine:{ style:'none' },
  valAxisLineShow:false, catAxisLineShow:true, catAxisLineColor:'D8D8D9',
  showTitle:false, dataBorder:{pt:0,color:WHITE},
};

/* ═══════════ 1 封面 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'COVER' });
  s.addText('2027 年度計畫與預算', { placeholder:'title' });
  s.addText('董事會會報　｜　2026/10/13　｜　報告人：Sam', { placeholder:'body' });
  s.addShape(p.ShapeType.rect,{x:0.9,y:5.72,w:1.6,h:0.03,fill:{color:GOLD}});
  s.addText('營收目標 2,500 萬　·　營業利益率 20.9%　·　安全邊際 37%',
    {x:0.9,y:5.95,w:11.5,h:0.4,isTextBox:true,margin:0,fontSize:12.5,color:GOLD});
  s.addNotes('開場 90 秒：2027 要做 2,500 萬，比今年實際 1,818 萬成長 38%。營業利益 523 萬、利潤率 20.9%，與今年持平——因為把團購分潤省下的錢全數再投入行銷，換到官網從 233 萬做到 600 萬。數字是用今年 7,546 筆真實訂單推出來的。');
});

/* ═══════════ 2 執行摘要 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('一頁看完 2027', { placeholder:'title' });
  kpi(s,0.72,1.30,3.82,'2027 營收目標','2,500','萬','基準年 1,818 萬　·　+38%',true);
  kpi(s,4.76,1.30,3.82,'營業利益','523','萬','利益率 20.9%　·　基準年 21.0%');
  kpi(s,8.80,1.30,3.82,'安全邊際','37','%','損益兩平需 1,585 萬');
  s.addText('三個段落', {x:0.72,y:3.18,w:11.9,h:0.3,isTextBox:true,margin:0,fontSize:12,bold:true,color:GRAY,charSpacing:2});
  const steps = [
    ['01','數字從何而來','滾動 12 個月損益表 ＋ 7,546 筆訂單逐筆歸戶'],
    ['02','怎麼達成','三大策略，每條都綁預算科目與負責部門'],
    ['03','風險怎麼控','彈性預算 ／ 人力閘門 ／ 月度差異分析'],
  ];
  steps.forEach((t,i)=>{
    const x = 0.72 + i*4.04;
    card(s,x,3.56,3.82,1.46);
    s.addText(t[0],{x:x+0.26,y:3.70,w:1,h:0.4,isTextBox:true,margin:0,fontSize:17,bold:true,color:GOLD,fontFace:'Cambria'});
    s.addText(t[1],{x:x+0.26,y:4.10,w:3.3,h:0.3,isTextBox:true,margin:0,fontSize:14,bold:true,color:INK});
    s.addText(t[2],{x:x+0.26,y:4.42,w:3.3,h:0.52,isTextBox:true,margin:0,fontSize:10.5,color:'5F6064'});
  });
  note(s,5.26,'核心訊息：營收 +38%，營業利益 +37%，利潤率 21.0% → 20.9% 持平。分潤省下 5.9 個百分點，全數再投入行銷（9.0% → 16.2%，董事會核定上限 405 萬），換到官網 233 萬 → 600 萬、自有客占比 13% → 24%。',GOLD);
  s.addNotes('這頁是全場的錨。先給三個數字，再說接下來分三段講。');
});

/* ═══════════ 3 分隔：數字從何而來 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'SECTION' });
  s.addText('P A R T   0 1', { placeholder:'kicker' });
  s.addText('數字從何而來', { placeholder:'title' });
  s.addText('基準年取法　·　通路逐筆歸戶　·　42 個假設的來源', { placeholder:'body' });
  s.addNotes('這段是董事會最會追問的部分，講慢一點。');
});

/* ═══════════ 4 基準年體質 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('基準年：滾動 12 個月，不是會計年度', { placeholder:'title' });
  s.addText('2025/10 – 2026/09 實際損益表（未稅）',
    {x:0.72,y:1.08,w:7,h:0.3,isTextBox:true,margin:0,fontSize:11.5,color:GRAY});
  s.addChart(p.ChartType.bar, [{
    name:'占營收',
    labels:['銷貨成本','團購分潤（占全站）','人事與固定','行銷','物流金流','檢驗'],
    values:[22.0,21.3,18.9,9.0,5.5,2.3],
  }], Object.assign({}, CHARTBASE, {
    x:0.72, y:1.48, w:7.3, h:4.0, barDir:'bar',
    showValue:true, dataLabelPosition:'outEnd', dataLabelFormatCode:'0.0"%"',
    chartColors:[INK], valAxisMaxVal:25, catAxisOrientation:'maxMin', barGapWidthPct:52,
  }));
  kpi(s,8.30,1.48,4.32,'基準年營收','1,818','萬','18,179,244 元（未稅）',true);
  kpi(s,8.30,3.16,4.32,'營業淨利','381','萬','利益率 21.0%');
  card(s,8.30,4.84,4.32,0.98,SOFT);
  s.addText('團購分潤：同一筆錢，兩種看法',
    {x:8.56,y:4.92,w:3.9,h:0.28,isTextBox:true,margin:0,fontSize:11.5,color:INK,bold:true});
  s.addText('÷ 全站營收 ＝ 21.3%（本頁，與其他成本同基準）　÷ 團購營收 ＝ 34.2%（跟團主談的實際條件）',
    {x:8.56,y:5.20,w:3.9,h:0.54,isTextBox:true,margin:0,fontSize:9.5,color:'5F6064'});
  note(s,5.96,'為什麼不用會計年度：公司今年生意結構變化非常大，用舊年度會嚴重低估現在的體質。',LEAF);
  s.addNotes('重點是「團購分潤」這一條 —— 它是後面三大策略第一條要處理的對象。若被問為什麼第 6 頁寫 34.2%：同一筆 3,864,763，本頁除以全站營收 1,818 萬得 21.3%（要跟其他成本同基準才能比），第 6 頁除以團購營收 1,130 萬得 34.2%（那是跟團主談的實際趴數）。');
});

/* ═══════════ 5 通路拆分 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('通路拆分：7,546 筆訂單逐筆歸戶', { placeholder:'title' });
  s.addChart(p.ChartType.bar, [
    { name:'基準年', labels:['團購','官網＋LINE','經銷／代理','展會／快閃'], values:[1130,233,418,37] },
    { name:'2027 目標', labels:['團購','官網＋LINE','經銷／代理','展會／快閃'], values:[1400,400,620,80] },
  ], Object.assign({}, CHARTBASE, {
    x:0.72, y:1.30, w:7.5, h:4.3, barDir:'col', barGrouping:'clustered',
    chartColors:[ 'C8CCC8', INK ], showLegend:true, legendPos:'t', legendColor:'6A6B6F', legendFontSize:10.5, legendFontFace:'+mn-lt',
    showValue:true, dataLabelPosition:'outEnd', dataLabelFormatCode:'#,##0',
    barGapWidthPct:58, valAxisLabelFormatCode:'#,##0',
  }));
  s.addText('單位：萬元（未稅）',{x:0.72,y:5.62,w:4,h:0.26,isTextBox:true,margin:0,fontSize:9.5,color:GRAY});
  const rows = [
    [{text:'通路',options:{bold:true}},{text:'基準年',options:{bold:true,align:'right'}},{text:'2027',options:{bold:true,align:'right'}},{text:'成長',options:{bold:true,align:'right'}}],
    ['團購',{text:'1,130',options:{align:'right'}},{text:'1,200',options:{align:'right'}},{text:'+6%',options:{align:'right'}}],
    ['官網＋LINE',{text:'233',options:{align:'right'}},{text:'600',options:{align:'right'}},{text:'+157%',options:{align:'right',bold:true,color:GOLD}}],
    ['經銷／代理',{text:'418',options:{align:'right'}},{text:'620',options:{align:'right'}},{text:'+48%',options:{align:'right'}}],
    ['展會／快閃',{text:'37',options:{align:'right'}},{text:'80',options:{align:'right'}},{text:'+118%',options:{align:'right'}}],
    [{text:'合計',options:{bold:true}},{text:'1,818',options:{align:'right',bold:true}},{text:'2,500',options:{align:'right',bold:true}},{text:'+38%',options:{align:'right',bold:true}}],
  ];
  s.addTable(rows,{ x:8.46, y:1.46, w:4.16, colW:[1.6,0.86,0.86,0.84], rowH:0.38,
    fontSize:10.5, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  card(s,8.46,4.06,4.16,1.52,SOFT);
  s.addText('官網占比 13% → 24%',{x:8.72,y:4.20,w:3.7,h:0.3,isTextBox:true,margin:0,fontSize:12.5,bold:true,color:INK});
  s.addText('官網是唯一零分潤的通路，毛利率 70%（團購 40%）。行銷依董事會核定加至 405 萬，業績責任同步上調至 600 萬。',
    {x:8.72,y:4.52,w:3.7,h:0.94,isTextBox:true,margin:0,fontSize:10.5,color:'5F6064'});
  note(s,5.90,'對齊係數 0.974：Shopline 出貨口徑 1,438 萬 vs 損益表 1,400 萬，差 2.7%（認列時點差異）。總額以損益表為準，比例用 Shopline。',AMBER);
  s.addNotes('若被問「官網憑什麼成長 157%」：行銷預算從模型原 255 萬加到董事會核定的 405 萬（+59%），預算加了業績責任就要同步上調。官網客單 4,125 元是團購 2,315 元的 1.78 倍。風險揭露：2026 官網實際衰退 25%，須先止跌；已設 Q1 轉正、上半年達 300 萬兩個檢核點。');
});

/* ═══════════ 6 假設來源 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('42 個假設，每一個都有來源', { placeholder:'title' });
  s.addText('預算模型的「假設」頁是唯一輸入口，董事會想驗證任何數字都可以追到底',
    {x:0.72,y:1.08,w:9,h:0.3,isTextBox:true,margin:0,fontSize:11.5,color:GRAY});
  const r = [
    [{text:'關鍵假設',options:{bold:true}},{text:'數值',options:{bold:true,align:'right'}},{text:'來源',options:{bold:true}}],
    ['進貨成本率',{text:'22.0%',options:{align:'right'}},'損益表 3,995,282 ÷ 18,179,244 校準'],
    ['團購分潤率（基準年實際）',{text:'34.2%',options:{align:'right'}},'佣金 3,864,763 ÷ 團購營收 1,130 萬（＝第 4 頁的 21.3% 換分母）'],
    [{text:'團購分潤率（2027 預算）',options:{bold:true}},{text:'32.0%',options:{align:'right',bold:true,color:GOLD}},{text:'刻意調降 —— 見策略一',options:{bold:true}}],
    ['物流金流率',{text:'5.5–6%',options:{align:'right'}},'損益表 1,004,644 ÷ 營收'],
    ['Meta 廣告費率',{text:'33.7%',options:{align:'right'}},'近 12 月實際 524,654 ÷ 官網 233 萬＝22.5%，依董事會加碼後編至 33.7%（202.2 萬 ÷ 600 萬）'],
    ['月固定開銷',{text:'293,000',options:{align:'right'}},'人事 2,647,766 ＋ 租金 165,000 ＋ 管理雜支'],
    ['季節權重',{text:'逐月',options:{align:'right'}},'Shopline 實際出貨月份分布'],
    ['平均件單價（四通路）',{text:'286–573',options:{align:'right'}},'各通路實際成交價 ÷ 1.05 換未稅'],
  ];
  s.addTable(r,{ x:0.72, y:1.52, w:11.9, colW:[3.5,1.7,6.7], rowH:0.44,
    fontSize:11.5, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  note(s,5.92,'「假設」頁有來源欄，寫明每個數字是從損益表哪個科目、Shopline 哪份報表、還是哪次實際報價來的。',LEAF);
  s.addNotes('強調：沒有一個數字是拍腦袋的。想驗證就打開假設頁。');
});

/* ═══════════ 7 分隔：怎麼達成 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'SECTION' });
  s.addText('P A R T   0 2', { placeholder:'kicker' });
  s.addText('怎麼達成', { placeholder:'title' });
  s.addText('三大策略　·　每條都綁預算科目與負責部門', { placeholder:'body' });
});

/* ═══════════ 8 三大策略 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('三大策略', { placeholder:'title' });
  const st = [
    ['01','降低團購依賴','分潤率 34.2% → 32%',
      '每檔配「引流品＋利潤品＋$99 加購」；新團主改階梯分潤',
      '每降 1 個百分點省 14 萬','業務通路部｜分潤費用率 ≤ 32%'],
    ['02','團購客留成自有客','官網 233 萬 → 600 萬',
      'CRM 三條自動化（D+60、存量推算、新品鉤子）＋節慶送禮檔',
      'Meta 202.2 萬／CRM 專員 57.2 萬／建置 10 萬','品牌行銷部｜自有占比 ≥ 24%、ROAS ≥ 3.0'],
    ['03','擴大經銷、補法規底盤','經銷 418 萬 → 620 萬',
      '大量採購名單 253 位轉經銷，新增 6 家；功效宣稱檢驗與 PIF 3/31 結案',
      '檢驗 30 萬／新品開發 25 萬','產品研發部｜3/31 前結案'],
  ];
  st.forEach((t,i)=>{
    const y = 1.26 + i*1.62;
    card(s,0.72,y,11.9,1.46);
    s.addShape(p.ShapeType.ellipse,{x:1.0,y:y+0.46,w:0.54,h:0.54,fill:{color:INK}});
    s.addText(t[0],{x:1.0,y:y+0.46,w:0.54,h:0.54,isTextBox:true,margin:0,align:'center',valign:'middle',fontSize:14,bold:true,color:WHITE,fontFace:'Cambria'});
    s.addText(t[1],{x:1.78,y:y+0.20,w:3.3,h:0.34,isTextBox:true,margin:0,fontSize:15,bold:true,color:INK});
    s.addText(t[2],{x:1.78,y:y+0.56,w:3.3,h:0.3,isTextBox:true,margin:0,fontSize:11.5,color:GOLD,bold:true});
    s.addText(t[3],{x:1.78,y:y+0.88,w:5.5,h:0.44,isTextBox:true,margin:0,fontSize:10.5,color:'5F6064'});
    s.addText('預算連動',{x:7.55,y:y+0.22,w:2.2,h:0.26,isTextBox:true,margin:0,fontSize:9,color:GRAY});
    s.addText(t[4],{x:7.55,y:y+0.48,w:2.4,h:0.6,isTextBox:true,margin:0,fontSize:11.5,bold:true,color:INK});
    s.addText('責任與 KPI',{x:10.1,y:y+0.22,w:2.3,h:0.26,isTextBox:true,margin:0,fontSize:9,color:GRAY});
    s.addText(t[5],{x:10.1,y:y+0.48,w:2.4,h:0.74,isTextBox:true,margin:0,fontSize:10.5,color:'3C3D41'});
  });
  s.addNotes('三條策略不是口號，每一條都對應到預算裡的具體科目和一個部門的 KPI。');
});

/* ═══════════ 9 月營收節奏 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('2027 月營收節奏', { placeholder:'title' });
  s.addChart(p.ChartType.bar, [{
    name:'月營收',
    labels:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    values:[343,135,138,160,234,372,144,324,234,144,165,107],
  }], Object.assign({}, CHARTBASE, {
    x:0.72, y:1.26, w:11.9, h:3.5, barDir:'col',
    showValue:true, dataLabelPosition:'outEnd', dataLabelFormatCode:'#,##0',
    chartColors:[INK], barGapWidthPct:42, valAxisLabelFormatCode:'#,##0',
  }));
  s.addText('單位：萬元（未稅）　·　依各通路季節權重排出',{x:0.72,y:4.82,w:6,h:0.26,isTextBox:true,margin:0,fontSize:9.5,color:GRAY});
  kpi(s,0.72,5.22,3.82,'最高月','372','萬','6 月 —— 團購高峰');
  kpi(s,4.76,5.22,3.82,'最低月','107','萬','12 月 —— 淡季＋備貨期');
  kpi(s,8.80,5.22,3.82,'上半年占比','55','%','1,382 萬 —— 第二位人力的閘門');
  s.addNotes('月營收波動大是團購生意的本質。上半年 1,382 萬這個數字很重要，它是第二位人力的放行門檻。');
});

/* ═══════════ 10 分隔：財務結果 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'SECTION' });
  s.addText('P A R T   0 3', { placeholder:'kicker' });
  s.addText('財務結果', { placeholder:'title' });
  s.addText('預計損益　·　現金與資產（僅董事會）', { placeholder:'body' });
});

/* ═══════════ 11 預計損益 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('2027 預計損益', { placeholder:'title' });
  const r = [
    [{text:'項目',options:{bold:true}},{text:'2027 預算',options:{bold:true,align:'right'}},{text:'占營收',options:{bold:true,align:'right'}},{text:'基準年占比',options:{bold:true,align:'right'}}],
    ['營業收入',{text:'25,000,000',options:{align:'right'}},{text:'100%',options:{align:'right'}},{text:'100%',options:{align:'right'}}],
    ['進貨成本',{text:'5,402,000',options:{align:'right'}},{text:'21.6%',options:{align:'right'}},{text:'22.0%',options:{align:'right'}}],
    [{text:'佣金支出（團購分潤）',options:{color:GOLD,bold:true}},{text:'3,840,000',options:{align:'right',color:GOLD,bold:true}},{text:'15.4%',options:{align:'right',color:GOLD,bold:true}},{text:'21.3%',options:{align:'right',color:GOLD,bold:true}}],
    ['平台手續費',{text:'720,500',options:{align:'right'}},{text:'2.9%',options:{align:'right'}},{text:'2.8%',options:{align:'right'}}],
    ['物流費（運費＋耗材）',{text:'720,500',options:{align:'right'}},{text:'2.9%',options:{align:'right'}},{text:'2.8%',options:{align:'right'}}],
    [{text:'貢獻毛利',options:{bold:true}},{text:'14,317,000',options:{align:'right',bold:true}},{text:'57.3%',options:{align:'right',bold:true}},{text:'51.2%',options:{align:'right'}}],
    ['營業費用合計',{text:'9,084,000',options:{align:'right'}},{text:'36.3%',options:{align:'right'}},{text:'30.2%',options:{align:'right'}}],
    [{text:'營業利益',options:{bold:true}},{text:'5,233,000',options:{align:'right',bold:true}},{text:'20.9%',options:{align:'right',bold:true}},{text:'21.0%',options:{align:'right'}}],
    ['所得稅 20%',{text:'1,046,600',options:{align:'right'}},{text:'',options:{align:'right'}},{text:'',options:{align:'right'}}],
    [{text:'稅後淨利',options:{bold:true}},{text:'4,186,400',options:{align:'right',bold:true}},{text:'16.7%',options:{align:'right',bold:true}},{text:'基準年 3,704,639',options:{align:'right'}}],
  ];
  s.addTable(r,{ x:0.72, y:1.26, w:7.6, colW:[2.5,1.9,1.5,1.7], rowH:0.40,
    fontSize:11, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  kpi(s,8.58,1.26,4.04,'營收成長','+38','%','1,818 萬 → 2,500 萬');
  kpi(s,8.58,2.94,4.04,'營業利益成長','+37','%','381 萬 → 523 萬',true);
  s.addNotes('營收 +38%、營業利益 +37%，利潤率持平不是失守而是刻意再投資。分潤率 21.3%→15.4% 省 5.9 個百分點（團購從 1,400 降到 1,200 萬），固定成本攤薄再省 1.4 個百分點；但行銷 9.0%→16.2% 多花 7.2 個百分點，那是董事會核定的 405 萬上限，全數用於官網成長。換到的是官網 233→600 萬、自有客占比 13%→24%。團購賺當期現金，官網賺顧客資產。');
  card(s,8.58,4.62,4.04,1.46,SOFT);
  s.addText('利潤率為什麼持平',{x:8.84,y:4.72,w:3.6,h:0.28,isTextBox:true,margin:0,fontSize:12,bold:true,color:INK});
  s.addText([
    {text:'佣金支出　　　 −5.9 pt',options:{breakLine:true,color:'2E7D32'}},
    {text:'行銷再投資　　 ＋7.2 pt',options:{breakLine:true,color:AMBER}},
    {text:'固定成本攤薄　 −1.4 pt',options:{breakLine:true,color:'2E7D32'}},
    {text:'其他小計　　　 ＋0.2 pt',options:{breakLine:true,color:GRAY}},
    {text:'淨效果　　　　 ＋0.1 pt → 利潤率持平',options:{bold:true,color:INK}},
  ],{x:8.84,y:5.02,w:3.6,h:1.0,isTextBox:true,margin:0,fontSize:9.5,lineSpacing:13});
  note(s,6.30,'一句話：分潤省下 5.9 個百分點，全數（+7.2）再投入行銷買官網成長，加上固定成本攤薄 1.4，淨效果利潤率持平。不是砍成本換利潤，是把團主的錢換成自己的客人。',GOLD);
});

/* ═══════════ 12 現金與資產 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('現金與資產', { placeholder:'title' });
  s.addShape(p.ShapeType.roundRect,{x:10.5,y:0.52,w:2.12,h:0.44,rectRadius:0.2,fill:{color:AMBER}});
  s.addText('僅限董事會',{x:10.5,y:0.52,w:2.12,h:0.44,isTextBox:true,margin:0,align:'center',valign:'middle',fontSize:11,bold:true,color:WHITE});
  s.addChart(p.ChartType.line, [{
    name:'月底現金',
    labels:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    values:[853,877,893,902,865,997,1006,1098,1198,1228,1277,1225],
  }], Object.assign({}, CHARTBASE, {
    x:0.72, y:1.30, w:7.6, h:3.5, chartColors:[LEAF], lineSize:3, lineSmooth:false,
    showValue:true, dataLabelPosition:'t', dataLabelFormatCode:'#,##0',
    valAxisMinVal:0, valAxisMaxVal:1500, valAxisLabelFormatCode:'#,##0',
  }));
  s.addText('單位：萬元　·　最低現金水位 58.6 萬（月固定開銷 ×2），12 個月全部通過',
    {x:0.72,y:4.86,w:7.6,h:0.26,isTextBox:true,margin:0,fontSize:9.5,color:GRAY});
  const r = [
    [{text:'科目',options:{bold:true}},{text:'2026/9/30 實際',options:{bold:true,align:'right'}}],
    ['銀行存款',{text:'6,198,347',options:{align:'right'}}],
    ['應收帳款（經銷）',{text:'689,657',options:{align:'right'}}],
    ['商品存貨',{text:'1,978,916',options:{align:'right'}}],
    [{text:'負債（僅預收）',options:{bold:true}},{text:'121,270',options:{align:'right',bold:true}}],
  ];
  s.addTable(r,{ x:8.58, y:1.30, w:4.04, colW:[2.14,1.90], rowH:0.42,
    fontSize:11, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  kpi(s,8.58,3.52,4.04,'全年最低月底現金','853','萬','1 月　·　水位要求 58.6 萬',true);
  card(s,8.58,5.20,4.04,0.66,SOFT);
  s.addText('無銀行借款　·　負債僅預收 12 萬',{x:8.84,y:5.28,w:3.6,h:0.5,isTextBox:true,margin:0,fontSize:11.5,bold:true,color:INK,valign:'middle'});
  note(s,6.08,'12 月為 2028 年 1 月大團備貨 171 萬，所以年底現金略低於前兩個月，屬正常。另有 655,850 元為 2025 年盈餘未轉入累積盈虧，年結時轉入即可。',LEAF);
  s.addNotes('這頁是機密等級最高的一頁。若簡報會留檔給非董事，這頁要抽掉。');
});

/* ═══════════ 13 分隔：風險 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'SECTION' });
  s.addText('P A R T   0 4', { placeholder:'kicker' });
  s.addText('風險怎麼控', { placeholder:'title' });
  s.addText('彈性預算　·　人力閘門　·　月度差異分析', { placeholder:'body' });
});

/* ═══════════ 14 彈性預算 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('做不到也不會虧：彈性預算', { placeholder:'title' });
  s.addChart(p.ChartType.bar, [{
    name:'營業利益',
    labels:['80%\n2,000萬','90%\n2,250萬','100%\n2,500萬','110%\n2,750萬','120%\n3,000萬'],
    values:[238,381,524,667,811],
  }], Object.assign({}, CHARTBASE, {
    x:0.72, y:1.30, w:7.6, h:3.9, barDir:'col',
    showValue:true, dataLabelPosition:'outEnd', dataLabelFormatCode:'#,##0',
    chartColors:[ 'C8CCC8','C8CCC8', INK, '8C9A8E','8C9A8E' ], varyColors:true,
    barGapWidthPct:48, valAxisLabelFormatCode:'#,##0', valAxisMaxVal:900,
  }));
  s.addText('營業利益（萬元）　·　橫軸為營收達成率',
    {x:0.72,y:5.26,w:7.6,h:0.26,isTextBox:true,margin:0,fontSize:9.5,color:GRAY});
  kpi(s,8.58,1.30,4.04,'損益兩平營收','1,585','萬','營收掉 37% 才會虧',true);
  kpi(s,8.58,2.98,4.04,'安全邊際','47','%','預算營收高於兩平點');
  card(s,8.58,4.66,4.04,1.34,SOFT);
  s.addText('最壞情境',{x:8.84,y:4.78,w:3.6,h:0.3,isTextBox:true,margin:0,fontSize:12,bold:true,color:INK});
  s.addText('營收只做到 80%（2,000 萬），營業利益仍有 238 萬、利益率 11.9%，全年獲利。',
    {x:8.84,y:5.10,w:3.6,h:0.8,isTextBox:true,margin:0,fontSize:10.5,color:'5F6064'});
  note(s,6.22,'我不用單一數字管理，用的是區間 —— 這是預算制度跟「訂一個目標」最大的差別。',GOLD);
});

/* ═══════════ 15 三道防線 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('三道防線', { placeholder:'title' });
  const d = [
    ['彈性預算','營收做不到也能獲利','五個情境同時管理；80% 達成仍有 238 萬營業利益，損益兩平 1,585 萬'],
    ['人力閘門','不達標就不加人','第二位人力 7 月才啟動，6 月底結算上半年營收需達 1,382 萬，未達即凍結（月成本 4.8 萬）'],
    ['月度差異分析','每月盯，不是年底才知道','每月 5 日月結後對照預算，差異 > 10% 一律寫說明；差異拆成數量差異與價格差異'],
  ];
  d.forEach((t,i)=>{
    const x = 0.72 + i*4.04;
    card(s,x,1.30,3.82,4.2);
    s.addShape(p.ShapeType.ellipse,{x:x+0.3,y:1.60,w:0.62,h:0.62,fill:{color:i===1?GOLD:INK}});
    s.addText(String(i+1),{x:x+0.3,y:1.60,w:0.62,h:0.62,isTextBox:true,margin:0,align:'center',valign:'middle',fontSize:17,bold:true,color:WHITE,fontFace:'Cambria'});
    s.addText(t[0],{x:x+0.3,y:2.42,w:3.2,h:0.36,isTextBox:true,margin:0,fontSize:16,bold:true,color:INK,fontFace:'Cambria'});
    s.addText(t[1],{x:x+0.3,y:2.82,w:3.2,h:0.3,isTextBox:true,margin:0,fontSize:11.5,bold:true,color:GOLD});
    s.addText(t[2],{x:x+0.3,y:3.22,w:3.22,h:1.9,isTextBox:true,margin:0,fontSize:11,color:'5F6064'});
  });
  note(s,5.76,'三道防線的共同點：都在事情發生前就設好門檻，不是事後檢討。',LEAF);
});

/* ═══════════ 16 要裁示的三件事 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CLOSING' });
  s.addText('要請董事會裁示的三件事', { placeholder:'title' });
  const q = [
    ['01','2,500 萬目標是否核定','含四通路拆分比例：團購 1,200／官網 600／經銷 620／展會 80'],
    ['02','第二位人力的閘門標準','上半年營收需達預算 100%（1,382 萬）才放行，是否同意'],
    ['03','營收認列時點','出貨基礎 vs 付款基礎 —— 影響 9 月未出貨 82 萬放在哪一期，請裁示後統一'],
  ];
  q.forEach((t,i)=>{
    const y = 1.72 + i*1.42;
    s.addShape(p.ShapeType.roundRect,{x:0.9,y:y,w:11.5,h:1.2,rectRadius:0.04,fill:{color:'2E2F34'},line:{color:'3C3D43',width:0.75}});
    s.addText(t[0],{x:1.22,y:y+0.14,w:0.9,h:0.4,isTextBox:true,margin:0,fontSize:17,bold:true,color:GOLD,fontFace:'Cambria'});
    s.addText(t[1],{x:1.22,y:y+0.56,w:5.2,h:0.36,isTextBox:true,margin:0,fontSize:15,bold:true,color:WHITE});
    s.addText(t[2],{x:6.6,y:y+0.28,w:5.5,h:0.7,isTextBox:true,margin:0,fontSize:11,color:'B8BABD',valign:'middle'});
  });
  s.addText('另有兩項待會計師確認：2026 營所稅估計約 68 萬（帳列僅 42,977）、對齊係數 0.974 的差額成因',
    {x:0.9,y:6.18,w:11.5,h:0.36,isTextBox:true,margin:0,fontSize:11,color:AMBER});
});

/* ═══════════ 17 時程 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('會後交付時程', { placeholder:'title' });
  const r = [
    [{text:'時間',options:{bold:true}},{text:'項目',options:{bold:true}},{text:'負責',options:{bold:true}}],
    ['10/16（五）','依裁示修正預算模型','Sam'],
    ['10/19（一）','策略校準會，發下部門預算申請表','Sam'],
    ['10/20 – 11/27','各部門填寫營收預測與費用申請（約 5.5 週）','各部門主管'],
    ['11/30（一）','部門草案繳回','各部門主管'],
    ['12/1 – 12/4','彙整、對照上限與基準年、列問題清單','財務行政部'],
    ['12/7 – 12/11','預算審查會（每部門 30 分鐘）','Sam ＋ 各部門'],
    ['12/15（二）','依審查結論修正回繳','各部門主管'],
    [{text:'12/18（五）',options:{bold:true}},{text:'核定版',options:{bold:true}},{text:'Sam',options:{bold:true}}],
    ['2027/1/5 起','月度差異分析上線','財務行政部'],
  ];
  s.addTable(r,{ x:0.72, y:1.30, w:11.9, colW:[3.0,6.4,2.5], rowH:0.42,
    fontSize:11.5, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  note(s,6.12,'預算核定後即為部門的管理依據：預算內不需逐筆申請，差異超過 10% 須提出說明。',LEAF);
});

/* ═══════════ 18 數字來源附錄 ═══════════ */
SLIDES.push(()=>{
  const s = p.addSlide({ masterName:'CONTENT' });
  s.addText('附錄：數字來源與驗證狀態', { placeholder:'title' });
  s.addText('每一個數字都追得到來源。⚠ 標記＝尚未經會計師確認，已主動列出',
    {x:0.72,y:1.06,w:9.5,h:0.28,isTextBox:true,margin:0,fontSize:11,color:GRAY});
  const r = [
    [{text:'數字',options:{bold:true}},{text:'來源',options:{bold:true}},{text:'狀態',options:{bold:true}}],
    ['基準年營收 18,179,244','2025/10–2026/09 綜合損益表（未稅）','已核對'],
    ['銷貨成本 3,995,282（22.0%）','同上','已核對'],
    ['團購分潤 3,864,763','同上「佣金支出」；÷全站 21.3%、÷團購營收 34.2%','已核對'],
    ['物流金流 1,004,644','銷貨運費＋平台手續費＋包裝耗材','已核對'],
    ['人事與固定 3,441,359','人事 2,647,766＋租金 165,000＋管理雜支','已核對'],
    ['經銷營收 4,177,095','損益表「公司銷貨收入」（開發票給經銷／代理）','已核對'],
    ['通路拆分比例','Shopline 依 order_source 逐筆歸戶；基準期 7,547 筆（有效 7,085）',{text:'已重新驗證',options:{color:'2E7D32',bold:true}}],
    ['Meta 廣告 524,654','Meta 帳戶「何謂美 2.0」實際花費','已核對'],
    ['季節權重','Shopline 實際出貨月份分布','已核對'],
    [{text:'對齊係數 0.974',options:{bold:true}},'Shopline 出貨口徑 1,438 萬 ÷ 損益表 1,400 萬',{text:'⚠ 差額成因待確認',options:{color:AMBER,bold:true}}],
    [{text:'2026 營所稅 68 萬',options:{bold:true}},'1–9 月本期損益＋Q4 預估 × 20%',{text:'⚠ 帳列僅 42,977',options:{color:AMBER,bold:true}}],
    [{text:'資本預算 230,000',options:{bold:true}},'CRM 建置 10 萬／攝影設備 5 萬／官網功能 8 萬',{text:'⚠ 尚無報價',options:{color:AMBER,bold:true}}],
    [{text:'2027 目標 2,500 萬',options:{bold:true}},'Sam 核定之目標，非由基準年推算',{text:'前提',options:{color:GRAY,bold:true}}],
    [{text:'分潤率 32%',options:{bold:true}},'刻意自實際 34.2% 調降，見策略一',{text:'前提',options:{color:GRAY,bold:true}}],
  ];
  s.addTable(r,{ x:0.72, y:1.42, w:11.9, colW:[3.1,6.5,2.3], rowH:0.33,
    fontSize:10, fontFace:'+mn-lt', color:'3C3D41', valign:'middle',
    border:{type:'solid',color:'EDEDEE',pt:0.75}, fill:{color:WHITE} });
  note(s,6.38,'口徑落差：Shopline 下單口徑未稅 1,580 萬 vs 出貨口徑未稅 1,438 萬，差 143 萬。總額以損益表為準不受影響，但營收認列時點（出貨 vs 付款）須先裁示，否則不同部門引用不同口徑會對不上。',AMBER);
  s.addNotes('這頁給董事會驗證用。四項 ⚠ 是我主動列出、尚未經會計師確認的：對齊係數差額成因、2026 營所稅、資本預算報價、下單與出貨口徑的 143 萬落差。');
});

SLIDES.forEach((fn,i)=>{ if(!ONLY || ONLY===i+1) fn(); });
p.writeFile({ fileName: ONLY ? ('qa'+ONLY+'.pptx') : 'HEIWEI_2027預算_董事會簡報.pptx' })
 .then(async f => { await applyTheme(f, THEME); console.log('produced', f); })
 .catch(e => { console.error('ERROR', e); process.exit(1); });
