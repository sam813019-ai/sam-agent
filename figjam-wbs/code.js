// ─────────────────────────────────────
//  Sam WBS Builder — FigJam Plugin
//  自動在 FigJam 畫布上建立 WBS 看板
// ─────────────────────────────────────

// ── WBS 資料 ──────────────────────────
const CATS = [
  {
    num:'一', title:'電商平台營運與活動行銷',
    col:'#6366F1', lgt:'#EEF2FF',
    items:[
      { num:'1.1', title:'網站維護與細節優化',
        note:'⏳ 等待陳小葳提供調圖（已等待半年）',
        steps:[
          { n:'每日巡檢',       t:'30分',   s:['確認首頁載入速度','逐一檢查頁面連結','驗證購物車流程','確認商品圖片顯示','RWD跑版檢查'] },
          { n:'問題識別與分類', t:'30分+',  s:['記錄斷鍊跑版錯誤','依嚴重程度分類','評估修正優先順序','建立問題追蹤紀錄'] },
          { n:'執行修正與測試', t:'30分+',  s:['後台修正斷鍊/圖片','CSS版型問題修正','修正後重新測試','確認成功關閉紀錄'] },
          { n:'品牌資訊更新',   t:'30分+',  s:['更新首頁條圖','修正實體據點資訊','確認品牌一致性','更新品牌故事文案'] },
        ]
      },
      { num:'1.2', title:'產品上下架與活動設定',
        steps:[
          { n:'活動策劃',         t:'3天',  s:['確認活動目標','設定活動KPI','選定主打商品','設計優惠機制','撰寫商品文案'] },
          { n:'後台優惠邏輯設定', t:'2天',  s:['建立活動規則','設定折扣門檻','建立優惠碼','設定有效期間','確認庫存充足'] },
          { n:'測試下單流程',     t:'30分', s:['模擬消費者購物路徑','確認折扣觸發','測試各種付款','確認訂單通知'] },
          { n:'正式上線與監控',   t:'30分', s:['確認頁面顯示正確','上線後監控訂單','即時處理異常'] },
        ]
      },
      { num:'1.3', title:'行銷/活動檔期規劃',
        steps:[
          { n:'提報活動主題', t:'3天', s:['調研競品年度策略','分析過往銷售數據','提出年主題構想','確認主打檔期','對齊團隊資源'] },
          { n:'設定折扣門檻', t:'1天', s:['計算各商品毛利空間','設定活動最低折扣底線','規劃會員等級優惠','確認組合包利潤'] },
        ]
      },
      { num:'1.4', title:'素材與視覺規劃',
        steps:[
          { n:'發包美編',     t:'1天', s:['確認設計規格尺寸','撰寫美編Brief','選定設計師','設定交件期限費用'] },
          { n:'出圖與校對',   t:'7天', s:['接收設計初稿','視覺風格校對','文字內容校對','整理修改意見','最終版確認存檔'] },
          { n:'網站素材替換', t:'1天', s:['後台上傳新Banner','替換首頁輪播視覺','確認各裝置顯示','設定上下架日期'] },
        ]
      },
    ]
  },
  {
    num:'二', title:'網紅團購專案管理 KOL/KOC',
    col:'#8B5CF6', lgt:'#F5F3FF',
    items:[
      { num:'2.1', title:'開團接洽與檔期規劃',
        steps:[
          { n:'開發候選名單',     t:'1天', s:['IG/YouTube/TikTok搜尋KOL','評估粉絲數互動率','確認內容風格契合度','建立候選名單','篩選有開團經驗者'] },
          { n:'寄樣作業',         t:'1天', s:['準備試用品組合包','確認寄送地址時間','寄出並記錄追蹤碼','追蹤確認收到回饋'] },
          { n:'洽談合作條件',     t:'3天', s:['商談開團日期時長','確認合作模式','設定分潤比例20~30%','擬定專屬優惠碼','確認發文篇數形式'] },
          { n:'確認合約與開團準備', t:'3天', s:['簽訂合作合約','後台設定優惠碼折扣','準備開團素材包','確認庫存充足'] },
        ]
      },
      { num:'2.2', title:'緊急狀況處理與結算報告',
        steps:[
          { n:'即時通訊監控', t:'1天', s:['每日監控訂單成長曲線','即時回覆消費者詢問','監控庫存水位預防斷貨','追蹤網紅發文互動數據'] },
          { n:'緊急狀況應變', t:'1天', s:['缺貨：通知網紅暫停','物流延誤：聯繫補償','退換貨：依規範處理','追蹤工廠製作交期'] },
          { n:'導出訂單報表', t:'1天', s:['後台下載開團訂單','篩選網紅優惠碼訂單','核對金額退貨扣除','計算分潤基礎'] },
          { n:'績效分析與結案', t:'2天', s:['計算GMV/客單價/轉換率','計算最終分潤金額','評估ROI廣告費vs業績','撰寫結案報告','更新KOL資料庫評分'] },
        ]
      },
    ]
  },
  {
    num:'三', title:'代理制度開發與管理',
    col:'#F59E0B', lgt:'#FFFBEB',
    items:[
      { num:'3.1', title:'制度規劃與規範制定',
        steps:[
          { n:'評估市場行情', t:'1天', s:['調研競品代理架構','分析目標市場通路','確認品牌定位要求','設定代理商目標輪廓'] },
          { n:'制定代理合約', t:'1天', s:['草擬授權範圍','設定合約期限','訂定最低進貨量','確認退換貨條件','法務確認合規性'] },
          { n:'控價守則制定', t:'1天', s:['設定MAP最低零售價','規範線上線下定價','設立違規處理機制','定期巡查市場價格'] },
          { n:'發布與執行',   t:'1天', s:['製作招募說明書','建立申請表單審核','新代理商簽約授權','建立聯絡管理平台'] },
        ]
      },
      { num:'3.2', title:'階級計算與分潤設定',
        steps:[
          { n:'Excel毛利試算', t:'1天',   s:['建立成本結構試算表','模擬不同折扣毛利','計算代理商利潤空間','確認最低毛利底線'] },
          { n:'階級制度設計', t:'1天',   s:['設定代理層級','對應各級折扣訂單量','制定降級保護機制'] },
          { n:'定期檢討調整', t:'1天/季', s:['每季檢視業績達成率','因應成本變動調整','收集意見優化制度'] },
        ]
      },
    ]
  },
  {
    num:'四', title:'產品開發、設計與行政規範',
    col:'#10B981', lgt:'#ECFDF5',
    items:[
      { num:'4.1', title:'新產品設計與規劃',
        steps:[
          { n:'市場調研',     t:'3天',   s:['分析護膚市場趨勢','研究競品功能定價','確認目標客群痛點','評估市場差異化機會','輸出市場調研報告'] },
          { n:'樣品測試',     t:'依工廠', s:['與工廠溝通配方規格','申請第一批樣品','內部試用測試效果','外部用戶回饋測試','整理意見提交修改'] },
          { n:'成本分析',     t:'3天',   s:['計算原料+包材+製造費','加入物流行銷攤銷','模擬不同定價毛利率','確認定價符合市場'] },
          { n:'確認開發與量產準備', t:'3天', s:['通過內部開發審核','確認首批生產數量','簽訂工廠生產合約','啟動包材設計'] },
        ]
      },
      { num:'4.2', title:'視覺與包材製作',
        steps:[
          { n:'設計稿確認', t:'3天',    s:['撰寫包裝設計Brief','與設計師討論風格','確認設計初稿展開圖','核對法規要求','輸出刀模檔'] },
          { n:'廠商詢價',   t:'3天',    s:['聯繫包材供應商','比較材質工藝','確認印刷工藝選項','比較報價MOQ交期'] },
          { n:'打樣校色',   t:'7~14天', s:['送廠製作打樣','顏色比對vs設計稿','確認材質觸感結構','提出修改再次確認','最終簽核授權量產'] },
          { n:'大貨生產入庫', t:'依交期', s:['下訂生產數量','追蹤生產進度','收貨抽驗品質','點收入庫更新系統'] },
        ]
      },
      { num:'4.3', title:'條碼/進銷存/電子發票申請',
        note:'✅ 已完成：條碼與電子發票均已上線',
        steps:[
          { n:'準備公文資料',   t:'1天', s:['備妥公司登記謄本','整理商品申請清單','準備身份證影本','填寫申請表格'] },
          { n:'GS1條碼申請',   t:'3天', s:['申請廠商識別碼','分配EAN-13條碼','下載條碼圖檔','確認印製規格'] },
          { n:'電子發票申請',   t:'3天', s:['向財政部平台申請','選擇加值服務商','完成測試環境驗證','串接至電商後台'] },
          { n:'進銷存系統串接', t:'3天', s:['選定a1進銷存平台','建立商品主檔SKU','串接訂單自動扣庫','設定低庫存預警','協助系統問題維護'] },
        ]
      },
    ]
  },
];

// ── Layout 常數 ───────────────────────
const SX = 120;          // 起始 X
const SY = 120;          // 起始 Y
const SEC_W = 980;       // Section 寬度
const SEC_HDR = 64;      // Section header 高度
const SEC_PAD = 20;      // Section 內邊距
const SEC_GAP = 48;      // Section 間距
const WI_HDR = 52;       // WorkItem header 高度
const WI_GAP = 16;       // WorkItem 間距
const STEP_W = 188;      // Step card 寬度
const STEP_H = 218;      // Step card 高度
const STEP_GAP = 22;     // Step card 間距
const ARROW_W = STEP_GAP;
const FLOW_PAD = 16;     // Step flow area padding
const NOTE_H = 36;       // 備注高度

// ── 工具函式 ──────────────────────────
function rgb(hex) {
  return {
    r: parseInt(hex.slice(1,3),16)/255,
    g: parseInt(hex.slice(3,5),16)/255,
    b: parseInt(hex.slice(5,7),16)/255
  };
}
function fill(col, op=1) { return [{ type:'SOLID', color:col, opacity:op }]; }
function noFill()         { return []; }

function rect(parent, x, y, w, h, col, op=1, r=0) {
  const node = figma.createRectangle();
  node.x=x; node.y=y; node.resize(w,h);
  node.fills = fill(col, op);
  if(r) node.cornerRadius = r;
  node.strokes = [];
  parent.appendChild(node);
  return node;
}

function txt(parent, x, y, str, size, style, col, maxW=0) {
  const node = figma.createText();
  node.fontName = { family:'Inter', style };
  node.fontSize = size;
  node.fills = fill(col);
  if(maxW>0) { node.textAutoResize='WIDTH_AND_HEIGHT'; node.resize(maxW, 40); node.textAutoResize='HEIGHT'; }
  node.x=x; node.y=y;
  node.characters = str;
  parent.appendChild(node);
  return node;
}

function border(node, col, w=1.5, op=1) {
  node.strokes = [{ type:'SOLID', color:col, opacity:op }];
  node.strokeWeight = w;
  node.strokeAlign = 'INSIDE';
}

// ── WI 高度計算 ───────────────────────
function wiHeight(item) {
  const h = WI_HDR + FLOW_PAD + STEP_H + FLOW_PAD;
  return h + (item.note ? NOTE_H + 8 : 0);
}

// ── Step Card 繪製 ────────────────────
function drawStep(parent, sx, sy, step, stepIdx, catCol, catLgt) {
  // 卡片背景
  const card = figma.createRectangle();
  card.x=sx; card.y=sy; card.resize(STEP_W, STEP_H);
  card.fills = fill(rgb(catLgt));
  card.cornerRadius = 10;
  border(card, rgb(catCol), 1.5, 0.35);
  parent.appendChild(card);

  // Header bar
  const hdr = figma.createRectangle();
  hdr.x=sx; hdr.y=sy; hdr.resize(STEP_W, 46);
  hdr.fills = fill(rgb(catCol));
  hdr.topLeftRadius = 10; hdr.topRightRadius = 10;
  parent.appendChild(hdr);

  // 步驟圓形數字
  const circle = figma.createEllipse();
  circle.x=sx+8; circle.y=sy+13; circle.resize(20,20);
  circle.fills = fill({r:1,g:1,b:1}, 0.22);
  parent.appendChild(circle);

  txt(parent, sx+13, sy+15, String(stepIdx+1), 10, 'Bold', {r:1,g:1,b:1});

  // 步驟名稱
  txt(parent, sx+34, sy+12, step.n, 12, 'Bold', {r:1,g:1,b:1}, STEP_W-34-50);

  // 工時 badge
  const tw = step.t.length*6.5+14;
  const tx = sx + STEP_W - tw - 6;
  const timeBg = figma.createRectangle();
  timeBg.x=tx; timeBg.y=sy+14; timeBg.resize(tw,18);
  timeBg.fills = fill({r:1,g:1,b:1}, 0.22);
  timeBg.cornerRadius = 9;
  parent.appendChild(timeBg);
  txt(parent, tx+6, sy+16, step.t, 10, 'Medium', {r:1,g:1,b:1});

  // Sub-items
  let subY = sy+52;
  for(let i=0; i<Math.min(step.s.length,6); i++) {
    const dot = figma.createEllipse();
    dot.x = sx+10; dot.y = subY+5; dot.resize(5,5);
    dot.fills = fill(rgb(catCol), 0.7);
    parent.appendChild(dot);
    txt(parent, sx+20, subY, step.s[i], 11, 'Regular', rgb('#475569'), STEP_W-28);
    subY += 26;
  }
}

// ── 箭頭文字 ─────────────────────────
function drawArrow(parent, x, y, catCol) {
  txt(parent, x+4, y+STEP_H/2-12, '→', 20, 'Bold', rgb(catCol), 0);
}

// ── WorkItem 繪製 ─────────────────────
function drawWorkItem(page, wiX, wiY, item, catCol, catLgt) {
  const wiW = SEC_W - SEC_PAD*2;
  const wiH = wiHeight(item);

  // Card 背景
  const wiCard = figma.createRectangle();
  wiCard.x=wiX; wiCard.y=wiY; wiCard.resize(wiW, wiH);
  wiCard.fills = fill({r:1,g:1,b:1});
  wiCard.cornerRadius = 12;
  border(wiCard, rgb('#E2E8F0'));
  page.appendChild(wiCard);

  // Header 背景
  const wiHdrBg = figma.createRectangle();
  wiHdrBg.x=wiX; wiHdrBg.y=wiY; wiHdrBg.resize(wiW, WI_HDR);
  wiHdrBg.fills = fill(rgb('#F8FAFC'));
  wiHdrBg.topLeftRadius = 12; wiHdrBg.topRightRadius = 12;
  page.appendChild(wiHdrBg);

  // 左側 accent bar
  const accent = figma.createRectangle();
  accent.x=wiX; accent.y=wiY; accent.resize(4, WI_HDR);
  accent.fills = fill(rgb(catCol));
  accent.topLeftRadius = 12;
  page.appendChild(accent);

  // num badge
  txt(page, wiX+16, wiY+17, item.num, 12, 'Bold', rgb(catCol));

  // title
  txt(page, wiX+52, wiY+17, item.title, 14, 'Bold', rgb('#1E293B'));

  // Step cards
  const stepAreaY = wiY + WI_HDR + FLOW_PAD;
  for(let i=0; i<item.steps.length; i++) {
    const sx = wiX + FLOW_PAD + i*(STEP_W+STEP_GAP);
    drawStep(page, sx, stepAreaY, item.steps[i], i, catCol, catLgt);
    if(i < item.steps.length-1) {
      drawArrow(page, sx+STEP_W+2, stepAreaY, catCol);
    }
  }

  // Note
  if(item.note) {
    const noteY = wiY + WI_HDR + FLOW_PAD + STEP_H + FLOW_PAD;
    const noteBg = figma.createRectangle();
    noteBg.x = wiX+FLOW_PAD; noteBg.y = noteY;
    noteBg.resize(wiW - FLOW_PAD*2, NOTE_H);
    noteBg.fills = fill(rgb('#F8FAFC'));
    noteBg.cornerRadius = 6;
    page.appendChild(noteBg);

    const noteAccent = figma.createRectangle();
    noteAccent.x = wiX+FLOW_PAD; noteAccent.y = noteY;
    noteAccent.resize(3, NOTE_H);
    noteAccent.fills = fill(rgb(catCol));
    noteAccent.topLeftRadius = 6; noteAccent.bottomLeftRadius = 6;
    page.appendChild(noteAccent);

    txt(page, wiX+FLOW_PAD+12, noteY+10, item.note, 11, 'Regular', rgb('#64748B'), wiW-FLOW_PAD*2-20);
  }
}

// ── Section 繪製 ──────────────────────
function drawSection(page, secY, cat) {
  const c = rgb(cat.col);
  const cl = rgb(cat.lgt);

  // Calculate section height
  let contentH = 0;
  for(let i=0; i<cat.items.length; i++) {
    contentH += wiHeight(cat.items[i]) + (i>0 ? WI_GAP : 0);
  }
  const secH = SEC_HDR + SEC_PAD + contentH + SEC_PAD;

  // Section frame background
  const secBg = figma.createRectangle();
  secBg.x=SX; secBg.y=secY; secBg.resize(SEC_W, secH);
  secBg.fills = fill(cl);
  secBg.cornerRadius = 18;
  border(secBg, c, 2, 0.3);
  page.appendChild(secBg);

  // Section header bar
  const secHdr = figma.createRectangle();
  secHdr.x=SX; secHdr.y=secY; secHdr.resize(SEC_W, SEC_HDR);
  secHdr.fills = fill(c);
  secHdr.topLeftRadius = 18; secHdr.topRightRadius = 18;
  page.appendChild(secHdr);

  // num badge
  const numBg = figma.createRectangle();
  numBg.x=SX+20; numBg.y=secY+18; numBg.resize(28,28);
  numBg.fills = fill({r:1,g:1,b:1}, 0.22);
  numBg.cornerRadius = 6;
  page.appendChild(numBg);
  txt(page, SX+26, secY+20, cat.num, 13, 'Bold', {r:1,g:1,b:1});

  // title
  txt(page, SX+58, secY+20, cat.title, 18, 'Bold', {r:1,g:1,b:1});

  // Work items
  let wiY = secY + SEC_HDR + SEC_PAD;
  for(const item of cat.items) {
    drawWorkItem(page, SX + SEC_PAD, wiY, item, cat.col, cat.lgt);
    wiY += wiHeight(item) + WI_GAP;
  }

  return secH;
}

// ── 主程式 ────────────────────────────
async function main() {
  try {
    // 載入字體
    await Promise.all([
      figma.loadFontAsync({ family:'Inter', style:'Regular' }),
      figma.loadFontAsync({ family:'Inter', style:'Medium' }),
      figma.loadFontAsync({ family:'Inter', style:'Bold' }),
    ]);

    const page = figma.currentPage;

    // 主標題
    txt(page, SX, SY-70, 'Sam 工作內容 — WBS 工作分解結構', 28, 'Bold', rgb('#1E293B'));
    txt(page, SX, SY-36, '4 大類別  ·  11 工作項目  ·  37 執行步驟  ·  100+ 細部動作', 14, 'Regular', rgb('#64748B'));

    // 繪製各 Section
    let curY = SY;
    for(const cat of CATS) {
      const h = drawSection(page, curY, cat);
      curY += h + SEC_GAP;
    }

    // 置中視角
    figma.viewport.scrollAndZoomIntoView(page.children);

    figma.notify('✅ WBS 看板已建立完成！共 4 大類別、11 工作項目', { timeout: 4000 });
    figma.closePlugin();

  } catch(e) {
    figma.notify('❌ 錯誤：' + e.message, { error: true });
    console.error(e);
    figma.closePlugin();
  }
}

main();
