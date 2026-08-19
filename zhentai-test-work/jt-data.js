/* ============================================================
   振太機械 — 共用產品資料 + 三語(中/英/越) i18n 引擎
   兩頁共用：index.html、products.html
   越南文(vi)為機器翻譯，標記「待校對 / chờ hiệu đính」
   ============================================================ */

/* ── 語言狀態（跨頁記憶）── */
window.LANGS = ['zh', 'en', 'vi'];
window.LANG = (function () {
  try { const s = localStorage.getItem('jt_lang'); if (window.LANGS.includes(s)) return s; } catch (e) {}
  return 'zh';
})();
function jtSetLang(l) {
  if (!window.LANGS.includes(l)) return;
  window.LANG = l;
  try { localStorage.setItem('jt_lang', l); } catch (e) {}
  jtApplyI18n();
  document.documentElement.lang = (l === 'zh' ? 'zh-Hant' : l);
  // 重繪產品（若頁面有產品區）
  if (window.jtCurrentSeries && window.jtRenderProducts) window.jtRenderProducts(window.jtCurrentSeries);
}
window.jtSetLang = jtSetLang;

/* ── 取多語值小工具 ── */
function L(obj, key) {
  // obj 形如 {zh:'',en:'',vi:''} 或 {zh:[],en:[],vi:[]}
  if (!obj) return key === undefined ? '' : '';
  return obj[window.LANG] != null ? obj[window.LANG] : obj.zh;
}
window.L = L;

/* ── 靜態 UI 字典（JS 產生的字串）── */
const I18N = {
  desc_title:   { zh: '產品說明 DESCRIPTION', en: 'DESCRIPTION', vi: 'MÔ TẢ SẢN PHẨM' },
  view_set:     { zh: 'VIEW SET', en: 'VIEW SET', vi: 'XEM BỘ' },
  view_3d:      { zh: 'VIEW 3D', en: 'VIEW 3D', vi: 'XEM 3D' },
  view_photo:   { zh: 'VIEW PHOTO', en: 'VIEW PHOTO', vi: 'XEM ẢNH' },
  coming:       { zh: 'COMING SOON', en: 'COMING SOON', vi: 'SẮP RA MẮT' },
  tag_set:      { zh: 'SET', en: 'SET', vi: 'BỘ' },
  tag_360:      { zh: '360°', en: '360°', vi: '360°' },
  tag_photo:    { zh: 'PHOTO', en: 'PHOTO', vi: 'ẢNH' },
  tag_soon:     { zh: '即將上線', en: 'COMING SOON', vi: 'SẮP RA MẮT' },
  inquiry:      { zh: '詢問報價 INQUIRY →', en: 'INQUIRY →', vi: 'BÁO GIÁ →' },
  back_series:  { zh: '← 返回系列', en: '← Back', vi: '← Quay lại' },
  drag_rotate:  { zh: '← 拖曳旋轉 →', en: '← Drag to rotate →', vi: '← Kéo để xoay →' },
  photo_hint:   { zh: '實機照片 · PHOTO', en: 'Actual photo · PHOTO', vi: 'Ảnh thực tế · PHOTO' },
  loading:      { zh: '載入中', en: 'Loading', vi: 'Đang tải' },
  model_prep:   { zh: '360° 模型準備中', en: '360° model coming soon', vi: 'Mô hình 360° sắp có' },
  img_prep:     { zh: '圖片準備中', en: 'Image coming soon', vi: 'Hình ảnh sắp có' },
  no_in_series: { zh: '此系列暫無產品', en: 'No products in this series', vi: 'Chưa có sản phẩm' },
  loading_prod: { zh: 'LOADING PRODUCTS...', en: 'LOADING PRODUCTS...', vi: 'ĐANG TẢI...' },
  series_label: {
    'feeding-orientation': { zh: '送料(選向)系列', en: 'Feeding (Orientation) Series', vi: 'Dòng cấp liệu (định hướng)' },
    'replenishing':        { zh: '補料系列',       en: 'Replenishing Series',          vi: 'Dòng tiếp liệu' },
    'sorting':             { zh: '篩選系列',       en: 'Sorting Series',               vi: 'Dòng sàng lọc' },
    'machinery':           { zh: '機械系列',       en: 'Machinery Series',             vi: 'Dòng cơ khí' },
  },
};
window.I18N = I18N;
window.T = (k) => L(I18N[k]);

/* ── 套用靜態文字（data-zh / data-en / data-vi）── */
function jtApplyI18n() {
  const lang = window.LANG;
  document.querySelectorAll('[data-zh]').forEach(el => {
    const v = el.getAttribute('data-' + lang) || el.getAttribute('data-zh');
    if (v == null) return;
    if (el.dataset.i18nHtml === '1') el.innerHTML = v; else el.textContent = v;
  });
  // placeholder
  document.querySelectorAll('[data-ph-zh]').forEach(el => {
    el.setAttribute('placeholder', el.getAttribute('data-ph-' + lang) || el.getAttribute('data-ph-zh'));
  });
  // 語言鈕 active 狀態
  document.querySelectorAll('[data-lang-btn]').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-lang-btn') === lang));
}
window.jtApplyI18n = jtApplyI18n;

/* ── 系列資料夾（圖片路徑用，恆中文）── */
const IMG_BASE = 'products-img/';
const ROLLER_FRAMES = 'frames_out/';
const FB = 'frames_out/';
const SERIES_FOLDER = {
  'feeding-orientation': '送料(選向)系列',
  'replenishing': '補料系列',
  'sorting': '篩選系列',
  'machinery': '機械系列',
};
window.IMG_BASE = IMG_BASE; window.SERIES_FOLDER = SERIES_FOLDER;
window.imgURL = function (series, rel) { return rel ? IMG_BASE + encodeURI(SERIES_FOLDER[series] + '/' + rel) : null; };

/* ── 產品資料（zh/en 原有，vi 機器翻譯待校對）── */
const JT_DATA = [
  // ① 送料(選向)系列
  { no:1, series:'feeding-orientation', zh:'整組振動送料機系列', en:'VIBRATORY FEEDER SERIES', vi:'Hệ thống máy cấp liệu rung trọn bộ', img:['整組振動送料機系列.png'] },
  { no:2, series:'feeding-orientation', zh:'螺絲整列選向送料機', en:'VIBRATORY BOWL FEEDER FOR GENERAL SCREW', vi:'Máy cấp liệu rung định hướng cho ốc vít', img:['螺絲整列選向送料機.png'] },
  { no:3, series:'feeding-orientation', zh:'華司墊片整列選向送料機', en:'VIBRATORY BOWL FEEDER FOR WASHER', vi:'Máy cấp liệu rung định hướng cho long đền', img:['華司墊片整列選向送料機.png'] },
  { no:4, series:'feeding-orientation', zh:'特殊螺絲整列選向送料機', en:'VIBRATORY BOWL FEEDER FOR SPECIAL SCREW', vi:'Máy cấp liệu rung định hướng cho ốc vít đặc biệt', img:['特殊螺絲整列選向送料機.png'] },
  { no:5, series:'feeding-orientation', zh:'內四角孔、內六角孔 選向振動送料機', en:'VIBRATORY BOWL FEEDER FOR SQUARE / HEX SOCKET', vi:'Máy cấp liệu rung định hướng cho lỗ vuông/lục giác trong', img:['內四角孔、內六角孔 選向振動送料機.png'] },
  { no:6, series:'feeding-orientation', zh:'螺母選向送料機', en:'VIBRATORY BOWL FEEDER-NUT ORIENTATION', vi:'Máy cấp liệu rung định hướng cho đai ốc', img:['螺母選向送料機.png'] },
  { no:7, series:'feeding-orientation', zh:'雙頭牙兩端自動選向機', en:'DOUBLE ENDED STUD ORIENTATION MACHINE', vi:'Máy định hướng tự động hai đầu cho bu lông hai đầu ren', img:['雙頭牙兩端自動選向機.png'] },
  { no:8, series:'feeding-orientation', zh:'渦電流送料裝置', en:'FEEDING DEVICE FOR EDDY CURRENT INSPECTION MACHINE', vi:'Thiết bị cấp liệu cho máy kiểm tra dòng xoáy', img:['渦電流送料裝置.png'], frames:FB+'eddy-current/' },
  { no:9, series:'feeding-orientation', zh:'長管、長套筒兩端自動選別定向機', en:'AUTOMATIC TWO SIDES ORIENTATION MACHINE FOR LONG TUBE & LONG SOCKET', vi:'Máy định hướng tự động hai đầu cho ống dài / tuýp dài', img:['長管、長套筒兩端自動選別定向機.png'] },
  { no:10, series:'feeding-orientation', zh:'離心式送料機', en:'CENTRIFUGAL FEEDER', vi:'Máy cấp liệu ly tâm', img:['離心式送料機.png'] },
  { no:11, series:'feeding-orientation', zh:'履帶式送料整列機', en:'ARRAYING FEEDER', vi:'Máy cấp liệu xếp hàng kiểu băng tải', img:['履帶式送料整列機.png'] },
  { no:12, series:'feeding-orientation', zh:'層斗式送料機', en:'STEP FEEDER', vi:'Máy cấp liệu kiểu bậc thang', img:['層斗式送料機 A.png','層斗式送料機 B.png'] },
  { no:13, series:'feeding-orientation', zh:'層斗式送料選向機', en:'STEP FEEDER WITH ORIENTATION DEVICE', vi:'Máy cấp liệu định hướng kiểu bậc thang', img:['層斗式送料選向機.png'] },
  { no:14, series:'feeding-orientation', zh:'直線送料機系列', en:'LINEAR FEEDER', vi:'Dòng máy cấp liệu thẳng', items:[
    { zh:'JL-0 / JL-1 / JL-2', en:'JL-0 / JL-1 / JL-2', vi:'JL-0 / JL-1 / JL-2', img:['直線送料機系列/JL-0  JL-1  JL-2.png'], frames:FB+'jl-0/' },
    { zh:'ML-2', en:'ML-2', vi:'ML-2', img:['直線送料機系列/ML-2.png'], frames:FB+'ml-2/' },
    { zh:'補料桶用 ML-3', en:'ML-3 For Hopper', vi:'ML-3 (cho thùng tiếp liệu)', img:['直線送料機系列/補料桶用 ML-3 For Hopper.png'], frames:FB+'ml-3/' },
    { zh:'STL-12', en:'STL-12', vi:'STL-12', img:['直線送料機系列/STL-12.png'], frames:FB+'stl-12/' },
    { zh:'STL-6 / STL-7', en:'STL-6 / STL-7', vi:'STL-6 / STL-7', img:['直線送料機系列/STL-6  STL-7.png'], frames:FB+'stl-6/' },
    { zh:'ML-8', en:'ML-8', vi:'ML-8', img:['直線送料機系列/ML-8.png'], frames:FB+'ml-8/' },
  ]},
  { no:15, series:'feeding-orientation', zh:'配件系列', en:'ACCESSORIES SERIES', vi:'Dòng phụ kiện', items:[
    { zh:'感應器', en:'Sensor', vi:'Cảm biến', img:['配件系列A/感應器 Sensor.png'] },
    { zh:'雙頭感應器', en:'Double Head Sensor', vi:'Cảm biến đầu kép', img:['配件系列A/雙頭感應器 Double Head Sensor.png'] },
    { zh:'光纖反射感應器', en:'Optical Reflection Type Sensor', vi:'Cảm biến phản xạ quang', img:['配件系列A/光纖反射感應器.png'] },
    { zh:'光纖對照感應器', en:'Optical Compare Type Sensor', vi:'Cảm biến đối chiếu quang', img:['配件系列A/光纖對照感應器.png'] },
    { zh:'光電對照式感應器', en:'Micro-sized Square Photo Sensor', vi:'Cảm biến quang điện đối chiếu', img:['配件系列A/光電對照式感應器.png'] },
    { zh:'警示燈', en:'Warning Lamp', vi:'Đèn cảnh báo', img:['配件系列A/警示燈.png'] },
    { zh:'補料桶用感應器', en:'Sensor for Hopper', vi:'Cảm biến cho thùng tiếp liệu', img:['配件系列A/補料桶用感應器.png'] },
    { zh:'馬達', en:'Motor', vi:'Motor', img:['配件系列A/馬達 Motor.png'] },
  ]},
  { no:16, series:'feeding-orientation', zh:'控制器配件', en:'CONTROLLER ACCESSORIES', vi:'Phụ kiện bộ điều khiển', items:[
    { zh:'智能穩壓變頻控制器', en:'INTELLIGENCE FREQUENCY CONVERSION CONTROLLER', vi:'Bộ điều khiển biến tần ổn áp thông minh', img:['控制器配件/智能穩壓變頻控制器.png'] },
    { zh:'數字變頻控制器', en:'FREQUENCY CONVERSION CONTROLLER', vi:'Bộ điều khiển biến tần số', img:['控制器配件/數字變頻控制器.png'] },
    { zh:'數字調壓控制器', en:'GENERAL CONTROLLER', vi:'Bộ điều khiển điều áp số', img:['控制器配件/數字調壓控制器.png'] },
    { zh:'微電腦控制器 (CT-T)', en:'MICRO-COMPUTER CONTROLLER', vi:'Bộ điều khiển vi tính (CT-T)', img:['控制器配件/微電腦控制器(CT-T.png'] },
    { zh:'微調控制器 (CT-N)', en:'GENERAL CONTROLLER', vi:'Bộ điều khiển tinh chỉnh (CT-N)', img:['控制器配件/微調控制器(CT-N).png'] },
    { zh:'補料桶控制器 NA-9013', en:'HOPPER CONTROLLER', vi:'Bộ điều khiển thùng tiếp liệu NA-9013', img:['控制器配件/補料桶控制器 NA-9013.png'] },
    { zh:'微調控制器 (NA-9004)', en:'GENERAL CONTROLLER', vi:'Bộ điều khiển tinh chỉnh (NA-9004)', img:['控制器配件/微調控制器(NA-9004).png'] },
    { zh:'全波控制器 (NA-9006)', en:'FULL WAVE TYPE CONTROLLER', vi:'Bộ điều khiển toàn sóng (NA-9006)', img:['控制器配件/全波控制器(NA-9006).png'] },
  ]},
  { no:17, series:'feeding-orientation', zh:'振動盤配套設備範例', en:'VIBRATORY BOWL EQUIPPED EXAMPLE', vi:'Ví dụ thiết bị đồng bộ với mâm rung', items:[
    { zh:'螺絲自動搓牙機', en:'AUTOMATIC THREAD ROLLING MACHINE', vi:'Máy cán ren ốc vít tự động', img:['振動盤配套設備範例/螺絲自動搓牙機.png'] },
    { zh:'螺絲夾尾機', en:'SCREW FORMING MACHINE', vi:'Máy kẹp đuôi ốc vít', img:['振動盤配套設備範例/螺絲夾尾機.png'] },
    { zh:'螺絲螺帽光學檢測機', en:'FASTENER OPTICAL SORTING MACHINE', vi:'Máy kiểm tra quang học ốc vít & đai ốc', img:['振動盤配套設備範例/螺絲螺帽光學檢測機.png'] },
    { zh:'直立攻牙機', en:'VERTICAL SINGLE SPINDLE TAPPING MACHINE', vi:'Máy taro đứng', img:['振動盤配套設備範例/直立攻牙機.png'] },
    { zh:'螺絲割尾機', en:'SCREW POINT CUTTING MACHINE', vi:'Máy cắt đuôi ốc vít', img:['振動盤配套設備範例/螺絲割尾機.png'] },
    { zh:'螺絲華司自動組合機', en:'SCREW AND WASHER ASSEMBLY MACHINE', vi:'Máy lắp ráp ốc vít & long đền tự động', img:['振動盤配套設備範例/螺絲華司自動組合機.png'] },
    { zh:'螺絲羅拉篩選機', en:'ROLLER SORTING MACHINE', vi:'Máy sàng lọc trục lăn ốc vít', img:['振動盤配套設備範例/螺絲羅拉篩選機.png'] },
    { zh:'雙軸攻牙機', en:'TWO-SPINDLE TAPPING MACHINE', vi:'Máy taro 2 trục', img:['振動盤配套設備範例/雙軸攻牙機.png'] },
  ]},
  { no:18, series:'feeding-orientation', zh:'研磨機整組送料系列', en:'GRINDING FEEDING SYSTEM', vi:'Hệ thống cấp liệu trọn bộ cho máy mài', img:['研磨機整組送料系列.png'] },
  { no:19, series:'feeding-orientation', zh:'車床整組送料系列', en:'LATHE MACHINE FEEDING SYSTEM', vi:'Hệ thống cấp liệu trọn bộ cho máy tiện', img:['車床整組送料系列.png'] },
  { no:20, series:'feeding-orientation', zh:'隔音箱', en:'SOUND PROOF CASE', vi:'Hộp cách âm', img:['隔音箱.png'], frames:FB+'soundproof-case/' },

  // ② 補料系列
  { no:1, series:'replenishing', zh:'升降式自動定量上料機', en:'AUTOMATIC ELEVATOR CONVEYOR', vi:'Máy nâng cấp liệu định lượng tự động', img:['升降式自動定量上料機.png'], frames:FB+'elevator-conveyor/' },
  { no:2, series:'replenishing', zh:'填充式上料機', en:'FILLING FEEDER', vi:'Máy cấp liệu kiểu nạp đầy', img:['填充式上料機.png','填充式上料機B.png'], frames:FB+'filling-feeder/' },
  { no:3, series:'replenishing', zh:'磁力式上料機', en:'MAGNETIC FEEDER', vi:'Máy cấp liệu kiểu từ tính', img:['磁力式上料機.png'], frames:FB+'magnetic-feeder/' },
  { no:4, series:'replenishing', zh:'提升機 + 兩段式補料', en:'LIFTER + TWO STAGE HOPPER', vi:'Máy nâng + tiếp liệu hai cấp', img:['提升機+兩段式補料.png'], frames:FB+'lifter-two-stage/' },
  { no:5, series:'replenishing', zh:'料桶翻料機', en:'LIFTING AND TILT LOADER', vi:'Máy lật thùng liệu', img:['料桶翻料機.png'], frames:FB+'tilt-loader/' },
  { no:6, series:'replenishing', zh:'自動上料平台系統', en:'AUTOMATIC FEEDING PLATFORM SYSTEM', vi:'Hệ thống bàn cấp liệu tự động', videoUrl:'https://www.youtube.com/watch?v=K41fcM5649o', items:[
    { zh:'模式一 · 全自動上料平台', en:'Mode 1: Fully Automatic Feeding Platform', vi:'Chế độ 1 · Bàn cấp liệu tự động', img:['自動上料平台系統/模式一 A.png','自動上料平台系統/模式一 B.png'], video:'自動上料平台系統/自動上料平台各別影片/模式1.mp4' },
    { zh:'模式二 · 全自動雙層交換上料平台', en:'Mode 2: Fully Automatic Dual-Layer Exchange Feeding Platform', vi:'Chế độ 2 · Bàn cấp liệu trao đổi hai tầng', img:['自動上料平台系統/模式二A.png','自動上料平台系統/模式二B.png'], video:'自動上料平台系統/自動上料平台各別影片/模式2.mp4' },
    { zh:'模式三 · 全自動雙層雙軌交換上料平台', en:'Mode 3: Fully Automatic Dual-Layer, Dual-Track Exchange Feeding Platform', vi:'Chế độ 3 · Bàn cấp liệu trao đổi hai tầng hai ray', img:['自動上料平台系統/模式3.png'], video:'自動上料平台系統/自動上料平台各別影片/模式3.mp4' },
  ]},
  { no:7, series:'replenishing', zh:'平送式補料桶', en:'LINEAR FEEDER TYPE HOPPER', vi:'Thùng tiếp liệu kiểu cấp thẳng', img:['平送式補料桶.png'], frames:FB+'linear-hopper/' },
  { no:8, series:'replenishing', zh:'活動連接式補料桶', en:'CONNECTABLE TYPE HOPPERS', vi:'Thùng tiếp liệu kiểu nối linh hoạt', img:['活動連接式補料桶.png'], frames:FB+'connectable-hopper/' },
  { no:9, series:'replenishing', zh:'偏心馬達補料桶', en:'ECCENTRIC ROTATING MASS VIBRATION MOTOR TYPE HOPPER', vi:'Thùng tiếp liệu motor lệch tâm', img:['偏心馬達補料桶.png'], frames:FB+'eccentric-hopper/' },

  // ③ 篩選系列
  { no:1, series:'sorting', zh:'平送式鐵屑、油水分離機', en:'LINEAR FEEDER TYPE IRON SCRAP SEPARATOR', vi:'Máy tách phoi sắt & dầu nước kiểu cấp thẳng', img:['平送式鐵屑、油水分離機.png','平送式鐵屑、油水分離機B.png'], frames:FB+'linear-scrap-sep/' },
  { no:2, series:'sorting', zh:'磁力式鐵屑、油水分離機', en:'MAGNETIC TYPE IRON SCRAP SEPARATOR', vi:'Máy tách phoi sắt & dầu nước kiểu từ tính', img:['磁力式鐵屑、油水分離機.png','磁力式鐵屑、油水分離機B.png'], frames:FB+'magnetic-scrap-sep/' },
  { no:3, series:'sorting', zh:'離心甩油鐵屑分離機', en:'CENTRIFUGAL OIL REMOVING IRON SCRAP SEPARATOR', vi:'Máy tách phoi sắt vẩy dầu ly tâm', img:['離心甩油鐵屑分離機.png'], frames:FB+'centrifugal-scrap-sep/' },
  { no:4, series:'sorting', zh:'羅拉篩選機', en:'ROLLER SORTING MACHINE', vi:'Máy sàng lọc trục lăn', items:[
    { zh:'羅拉篩選機 (兩軸)', en:'Two-Axis Roller Sorting Machine', vi:'Máy sàng lọc trục lăn (2 trục)', img:['羅拉篩選機/羅拉篩選機(兩軸).png'] },
    { zh:'羅拉篩選機 (四軸)', en:'Four-Axis Roller Sorting Machine', vi:'Máy sàng lọc trục lăn (4 trục)', img:['羅拉篩選機/羅拉篩選機(四軸).png'], frames:FB+'roller-4axis/' },
  ]},
  { no:5, series:'sorting', zh:'輸送機 (附檢測功能)', en:'CONVEYOR (WITH QUALITY CHECK BIN)', vi:'Băng tải (kèm khay kiểm tra chất lượng)', img:['輸送機(附檢測功能).png'] },

  // ④ 機械系列
  { no:1, series:'machinery', zh:'螺絲華司組合機', en:'SCREW & WASHER ASSEMBLY MACHINE', vi:'Máy lắp ráp ốc vít & long đền', img:['螺絲華司組合機.png'] },
  { no:2, series:'machinery', zh:'金屬刻字機', en:'METAL LETTER ENGRAVING MACHINE', vi:'Máy khắc chữ kim loại', img:['金屬刻字機.png'] },
  { no:3, series:'machinery', zh:'金屬滾花機', en:'METAL KNURLING MACHINE', vi:'Máy lăn nhám kim loại', img:['金屬滾花機.png'] },
  { no:4, series:'machinery', zh:'金屬刻字、滾花機 (一機兩用)', en:'METAL LETTER ENGRAVING & KNURLING MACHINE (TWO-IN-ONE)', vi:'Máy khắc chữ & lăn nhám kim loại (2 trong 1)', img:['金屬刻字、滾花機(一機兩用).png'] },
  { no:5, series:'machinery', zh:'矯直機', en:'STRAIGHTENING MACHINE', vi:'Máy nắn thẳng', img:['矯直機.png'], frames:FB+'straightening/' },
];
JT_DATA.forEach((p, i) => { p._i = i; });
window.JT_DATA = JT_DATA;

/* ── 產品說明（zh 整理自手冊；en 手冊英文；vi 機器翻譯待校對）── */
const JT_DESC = {
  '整組振動送料機系列': {
    zh:['整組振動送料系統，含振動送料機、自動補料桶、直線送料機與固定架','自動補料桶為節省人工而設計，出料量可用控制器調整','感應到振動盤沒料時自動補料；直線送料機銜接軌道避免卡料'],
    en:['Complete vibratory feeding system: bowl feeder, auto hopper, linear feeder and frame','Auto hopper saves labor; feeding volume adjustable by controller','Auto replenishes when the bowl runs empty; linear feeder bridges the track to avoid jamming'],
    vi:['Hệ thống cấp liệu rung trọn bộ: mâm rung, thùng tiếp liệu tự động, máy cấp liệu thẳng và khung','Thùng tiếp liệu tự động giúp tiết kiệm nhân công; lượng cấp điều chỉnh bằng bộ điều khiển','Tự động tiếp liệu khi mâm hết liệu; máy cấp liệu thẳng nối ray tránh kẹt liệu']
  },
  '螺絲整列選向送料機': {
    zh:['標準螺絲整列選向振動送料機','機型、螺絲外徑/長度、出口高度與斜度等規格可依客戶需求訂製'],
    en:['Standard vibratory bowl feeder for screw orientation','Model, screw diameter/length, outlet height and angle can be customized'],
    vi:['Máy cấp liệu rung định hướng ốc vít tiêu chuẩn','Kiểu máy, đường kính/chiều dài ốc, chiều cao và độ nghiêng đầu ra có thể tùy chỉnh']
  },
  '華司墊片整列選向送料機': {
    zh:['適用平面墊片、彈簧墊片的整列選向送料','墊片外徑/厚度等規格可依客戶需求訂製'],
    en:['Vibratory feeding for plain and spring washers','Washer diameter/thickness can be customized'],
    vi:['Cấp liệu định hướng cho long đền phẳng và long đền lò xo','Đường kính/độ dày long đền có thể tùy chỉnh']
  },
  '特殊螺絲整列選向送料機': {
    zh:['針對頭型大、尾部短小的特殊螺絲設計','另可依工件提供客製化振動盤'],
    en:['Designed for special screws with big head and short body','Customized bowl available per component'],
    vi:['Thiết kế cho ốc vít đặc biệt đầu lớn, thân ngắn','Có thể làm mâm rung tùy chỉnh theo chi tiết']
  },
  '內四角孔、內六角孔 選向振動送料機': {
    zh:['專為內四角孔、內六角孔工件設計的選向振動送料機'],
    en:['Vibratory bowl feeder for square / hex socket components'],
    vi:['Máy cấp liệu rung định hướng cho chi tiết lỗ vuông / lục giác trong']
  },
  '螺母選向送料機': {
    zh:['專為螺母（螺帽）整列選向設計的振動送料機'],
    en:['Vibratory bowl feeder for nut orientation'],
    vi:['Máy cấp liệu rung định hướng cho đai ốc']
  },
  '雙頭牙兩端自動選向機': {
    zh:['解決兩端工件無法自動選向、需人工排料的難題','更換治具即可對應不同規格工件，操作簡易','可直接變換工件方向、一機兩用，適用各種二次加工機','小型：60–100 支/分，工件 25–120mm；大型：30–60 支/分，120–250mm'],
    en:['Solves the problem of double-ended parts that need manual sorting','Just change the fixture for different specs; easy to operate','Changes part orientation directly, two uses in one; fits various secondary machines','Small: 60–100 pcs/min, 25–120mm; Large: 30–60 pcs/min, 120–250mm'],
    vi:['Giải quyết chi tiết hai đầu không thể tự định hướng, phải xếp tay','Chỉ cần đổi đồ gá cho quy cách khác nhau; vận hành dễ dàng','Đổi hướng chi tiết trực tiếp, một máy hai công dụng; phù hợp nhiều máy gia công','Loại nhỏ: 60–100 cái/phút, 25–120mm; Loại lớn: 30–60 cái/phút, 120–250mm']
  },
  '渦電流送料裝置': {
    zh:['配置於渦電流篩選機上','對不同規格工件只需依牙徑更換轉盤'],
    en:['Equipped on eddy-current inspection machines','Just change the turntable by thread diameter for different specs'],
    vi:['Lắp trên máy kiểm tra dòng xoáy','Chỉ cần đổi mâm xoay theo đường kính ren cho quy cách khác nhau']
  },
  '長管、長套筒兩端自動選別定向機': {
    zh:['解決長管/長套筒兩端無法自動選向、需人工排料的難題','更換治具即可對應不同規格，操作簡易','可變換工件方向、一機兩用；最快 30 支/分，工件最長至 100mm'],
    en:['Solves manual sorting of long tube / socket double ends','Change fixture for different specs; easy operation','Changes orientation, two uses in one; up to 30 pcs/min, parts up to 100mm'],
    vi:['Giải quyết ống dài / tuýp dài hai đầu phải xếp tay','Đổi đồ gá cho quy cách khác nhau; vận hành dễ','Đổi hướng, một máy hai công dụng; tối đa 30 cái/phút, chi tiết đến 100mm']
  },
  '離心式送料機': {
    zh:['適用普通螺栓整列出料，可給篩選機或搓絲機配套供料','懸掛式出料，頭下長度需為頭部外徑 1.5 倍以上','須配套自動供料裝置控制儲料量，以發揮最佳狀態'],
    en:['For ordinary bolt alignment; supplies sorting or thread-rolling machines','Suspended discharge; underhead length must be ≥1.5× head diameter','Needs an auto-supply device to control storage for best performance'],
    vi:['Dùng cho bu lông thường; cấp cho máy sàng lọc hoặc cán ren','Xả kiểu treo; chiều dài dưới đầu phải ≥1.5 lần đường kính đầu','Cần thiết bị cấp tự động kiểm soát lượng trữ để đạt hiệu quả tốt nhất']
  },
  '履帶式送料整列機': {
    zh:['針對圓形薄狀物料導向、排向出料','出口可配置左/右；輸送層階梯依物料大小設計','琴鍵式防漏（專利），薄型物料亦可輸送','專利輸送層帶無內鏈、一體成型，操作穩定','雙向感應：滿料延遲停止、滿料延遲啟動，配合主機調整'],
    en:['Orients and arranges round, thin parts to the exit','Left/right exit available; conveyor steps designed by part size','Key-type leak prevention (patented); even thin parts conveyed','Patented chainless one-piece belt; stable operation','Two-way sensing: full-load delayed stop & start, syncs with main machine'],
    vi:['Định hướng và sắp xếp chi tiết tròn, mỏng ra đầu ra','Có đầu ra trái/phải; bậc băng tải thiết kế theo kích thước chi tiết','Chống rơi kiểu phím đàn (bằng sáng chế); chi tiết mỏng vẫn tải được','Băng tải liền khối không xích trong (bằng sáng chế); vận hành ổn định','Cảm biến hai chiều: dừng/khởi động trễ khi đầy, đồng bộ máy chính']
  },
  '層斗式送料機': {
    zh:['降低噪音、不怕油，適合大工件上料'],
    en:['Low noise, oil-resistant, suitable for large parts'],
    vi:['Giảm tiếng ồn, không sợ dầu, phù hợp chi tiết lớn']
  },
  '層斗式送料選向機': {
    zh:['解決兩端工件無法自動選別、需人工排料的難題','更換治具即可對應不同規格，操作簡易','自動選向送料，適用工件範圍更廣','可配合自動數控車床等各種二次加工機'],
    en:['Solves manual sorting of double-ended parts','Change fixture for different specs; easy operation','Auto orientation feeding for a wider range of parts','Works with CNC lathes and various secondary machines'],
    vi:['Giải quyết chi tiết hai đầu phải xếp tay','Đổi đồ gá cho quy cách khác nhau; vận hành dễ','Cấp liệu định hướng tự động cho nhiều loại chi tiết hơn','Kết hợp máy tiện CNC và nhiều máy gia công khác']
  },
  '直線送料機系列': {
    zh:['可搭配篩選機、組合機、研磨機、刻字機、補料桶等使用','可依客戶需求定做','機型：JL-0/JL-1/JL-2、ML-2、ML-3（補料桶用）、STL-6/STL-7、STL-12、ML-8'],
    en:['Pairs with sorting, assembly, grinding, engraving machines and hoppers','Customizable on request','Models: JL-0/JL-1/JL-2, ML-2, ML-3 (for hopper), STL-6/STL-7, STL-12, ML-8'],
    vi:['Kết hợp máy sàng lọc, lắp ráp, mài, khắc chữ và thùng tiếp liệu','Có thể đặt làm theo yêu cầu','Kiểu: JL-0/JL-1/JL-2, ML-2, ML-3 (cho thùng), STL-6/STL-7, STL-12, ML-8']
  },
  '配件系列': {
    zh:['各式感應器、警示燈、馬達與控制器配件，搭配振動送料系統使用'],
    en:['Sensors, warning lamps, motors and controller accessories for feeding systems'],
    vi:['Cảm biến, đèn cảnh báo, motor và phụ kiện bộ điều khiển cho hệ thống cấp liệu']
  },
  '控制器配件': {
    zh:['智能穩壓變頻、數字變頻、數字調壓、微電腦(CT-T)、微調(CT-N/NA-9004)、補料桶(NA-9013)、全波(NA-9006)等控制器'],
    en:['Controllers: smart voltage-stabilizing inverter, digital inverter, digital regulator, micro-computer (CT-T), fine-tune (CT-N/NA-9004), hopper (NA-9013), full-wave (NA-9006)'],
    vi:['Bộ điều khiển: biến tần ổn áp thông minh, biến tần số, điều áp số, vi tính (CT-T), tinh chỉnh (CT-N/NA-9004), thùng tiếp liệu (NA-9013), toàn sóng (NA-9006)']
  },
  '振動盤配套設備範例': {
    zh:['振動盤可配套之設備範例：搓牙機、夾尾機、光學檢測機、攻牙機、割尾機、華司組合機、羅拉篩選機等'],
    en:['Example equipment paired with bowl feeders: thread rolling, forming, optical inspection, tapping, point cutting, washer assembly, roller sorting machines'],
    vi:['Ví dụ thiết bị đồng bộ mâm rung: máy cán ren, kẹp đuôi, kiểm tra quang học, taro, cắt đuôi, lắp long đền, sàng lọc trục lăn']
  },
  '研磨機整組送料系列': {
    zh:['研磨機整組自動送料系統，整合振動送料與補料，提升研磨加工效率'],
    en:['Complete auto-feeding system for grinding machines, integrating vibratory feeding and replenishing'],
    vi:['Hệ thống cấp liệu tự động trọn bộ cho máy mài, tích hợp cấp liệu rung và tiếp liệu']
  },
  '車床整組送料系列': {
    zh:['車床整組自動送料系統，整合振動送料與補料，供應車床加工件'],
    en:['Complete auto-feeding system for lathes, integrating vibratory feeding and replenishing'],
    vi:['Hệ thống cấp liệu tự động trọn bộ cho máy tiện, tích hợp cấp liệu rung và tiếp liệu']
  },
  '隔音箱': {
    zh:['可降低生產噪音','透明板設計便於觀察振動盤運轉情況'],
    en:['Reduces production noise','Transparent panel for easy observation of bowl operation'],
    vi:['Giảm tiếng ồn sản xuất','Tấm trong suốt giúp dễ quan sát mâm rung vận hành']
  },
  '升降式自動定量上料機': {
    zh:['利用定量上料系統將零件自動送入振動盤（任何廠牌皆可）','適用各種工件，特別適合無天車、堆高機或高處上料','省時省力、操作簡單、安全性高、低噪音、高效率','新型專利機種'],
    en:['Quantitative system auto-feeds parts into any brand of bowl feeder','For various parts; ideal where no crane or forklift is available, or high feeding','Saves time and labor; simple, safe, low-noise, high-efficiency','Newly patented model'],
    vi:['Hệ thống định lượng tự động nạp chi tiết vào mâm rung (mọi hãng)','Cho nhiều loại chi tiết; lý tưởng nơi không có cẩu/xe nâng hoặc cấp trên cao','Tiết kiệm thời gian & nhân công; đơn giản, an toàn, ít ồn, hiệu suất cao','Kiểu máy mới được cấp bằng sáng chế']
  },
  '填充式上料機': {
    zh:['填充輸送式上料機，可節省大量人力；同時可運送不同種類零件','輸送履帶階梯依物料大小設計','漏斗填料符合人體工學，首創國內最低填料口設置','專利輸送履帶無內鏈、一體成型，操作穩定','滿料停止、空料啟動全自動填充控制'],
    en:['Filling-conveyor feeder saves much labor; conveys various parts at once','Conveyor steps designed by part size','Ergonomic funnel filling; first lowest filling port in Taiwan','Patented chainless one-piece belt; stable operation','Full-auto control: stop when full, start when empty'],
    vi:['Máy cấp liệu nạp đầy tiết kiệm nhiều nhân công; tải nhiều loại chi tiết cùng lúc','Bậc băng tải thiết kế theo kích thước chi tiết','Phễu nạp theo công thái học; cửa nạp thấp nhất đầu tiên tại Đài Loan','Băng tải liền khối không xích (bằng sáng chế); vận hành ổn định','Điều khiển tự động: dừng khi đầy, chạy khi hết liệu']
  },
  '磁力式上料機': {
    zh:['適用磁鐵可吸的金屬（鐵、鎳、鈷及其合金或特定鋼材）','穩定輸送或補料','出口高度不限，可訂製'],
    en:['For magnetic metals (iron, nickel, cobalt and their alloys or certain steels)','Stable conveying or replenishing','Outlet height unlimited, customizable'],
    vi:['Cho kim loại nhiễm từ (sắt, niken, coban và hợp kim hoặc thép nhất định)','Vận chuyển hoặc tiếp liệu ổn định','Chiều cao đầu ra không giới hạn, có thể tùy chỉnh']
  },
  '提升機 + 兩段式補料': {
    zh:['主要針對長螺桿工件自動上料，最長可達 300mm','解決長工件易卡料的問題'],
    en:['Auto-feeds long screw parts up to 300mm','Solves jamming of long parts'],
    vi:['Tự động cấp chi tiết bu lông dài đến 300mm','Giải quyết kẹt liệu của chi tiết dài']
  },
  '料桶翻料機': {
    zh:['利用機械動力進行翻料，取代人工，安全高效完成重物升降翻轉','降低人力成本、降低工傷風險','提升效率與產能'],
    en:['Uses mechanical power to tip material, replacing manual work to lift and turn heavy loads safely','Reduces labor cost and injury risk','Improves efficiency and productivity'],
    vi:['Dùng lực cơ khí để lật liệu, thay sức người nâng và lật vật nặng an toàn','Giảm chi phí nhân công và rủi ro chấn thương','Nâng cao hiệu suất và năng suất']
  },
  '自動上料平台系統': {
    zh:['以自動上料取代傳統人工，依預設程序精準完成物料輸送與上料','大幅降低人工時間成本與錯誤率，提升生產效益'],
    en:['Replaces manual feeding; precisely conveys and loads material per preset program','Greatly cuts labor time and error rate, boosting productivity'],
    vi:['Thay cấp liệu thủ công; vận chuyển và nạp liệu chính xác theo chương trình cài sẵn','Giảm mạnh thời gian nhân công và tỷ lệ lỗi, tăng hiệu quả sản xuất']
  },
  '模式一 · 全自動上料平台': {
    zh:['單層送料平台','依預設程序精準完成物料輸送與上料，降低人工時間成本與錯誤率'],
    en:['Single-layer feeding platform','Precisely conveys and loads per preset program, cutting labor time and errors'],
    vi:['Bàn cấp liệu một tầng','Vận chuyển và nạp liệu chính xác theo chương trình, giảm thời gian và lỗi']
  },
  '模式二 · 全自動雙層交換上料平台': {
    zh:['雙層交換送料平台','一桶完成上料後同步回收空桶並進行下一輪，減少等待、提升生產節奏'],
    en:['Dual-layer exchange feeding platform','Recovers the empty hopper and starts the next round simultaneously, reducing wait time'],
    vi:['Bàn cấp liệu trao đổi hai tầng','Thu hồi thùng rỗng và bắt đầu lượt tiếp theo đồng thời, giảm thời gian chờ']
  },
  '模式三 · 全自動雙層雙軌交換上料平台': {
    zh:['雙層雙軌交換送料平台','雙軌設計進一步提升連續上料與回收效率'],
    en:['Dual-layer, dual-track exchange feeding platform','Dual-track design further improves continuous feeding and recovery'],
    vi:['Bàn cấp liệu trao đổi hai tầng hai ray','Thiết kế hai ray nâng cao hơn nữa việc cấp liệu và thu hồi liên tục']
  },
  '平送式補料桶': {
    zh:['平送（直線送料）式補料桶，穩定供料給振動盤'],
    en:['Linear-feeder type hopper, stably supplies the bowl feeder'],
    vi:['Thùng tiếp liệu kiểu cấp thẳng, cấp liệu ổn định cho mâm rung']
  },
  '活動連接式補料桶': {
    zh:['活動連接式補料桶，可彈性串接擴充供料'],
    en:['Connectable hopper, flexibly linked to expand supply'],
    vi:['Thùng tiếp liệu kiểu nối, liên kết linh hoạt để mở rộng cấp liệu']
  },
  '偏心馬達補料桶': {
    zh:['偏心馬達驅動式補料桶','可附柴油清洗循環系統'],
    en:['Eccentric-motor driven hopper','Optional diesel cleaning circulation system'],
    vi:['Thùng tiếp liệu dẫn động motor lệch tâm','Có thể kèm hệ thống tuần hoàn rửa dầu diesel']
  },
  '平送式鐵屑、油水分離機': {
    zh:['減少螺絲成品含油量，將鐵屑與油水分離，降低生產成本','可依螺絲/產品大小長度自由調整尺寸','防螺絲傷牙、節省油水、過濾油渣，延長機台壽命','免除人工排屑，降低人力成本','已榮獲多項發明專利'],
    en:['Reduces oil on finished screws; separates scrap and oil-water, cutting cost','Size adjustable to screw / product dimensions','Prevents thread damage, saves oil-water, filters sludge, extends machine life','Eliminates manual chip removal, lowers labor cost','Holder of multiple invention patents'],
    vi:['Giảm dầu trên ốc thành phẩm; tách phoi và dầu nước, giảm chi phí','Kích thước điều chỉnh theo kích cỡ ốc/sản phẩm','Tránh hỏng ren, tiết kiệm dầu nước, lọc cặn, kéo dài tuổi thọ máy','Loại bỏ gạt phoi thủ công, giảm chi phí nhân công','Đã đạt nhiều bằng sáng chế']
  },
  '磁力式鐵屑、油水分離機': {
    zh:['精準分離混在螺絲中的鐵屑，減少人工清理','磁力傾斜式提升下料，進一步減少含油量','分離出的油可回流循環使用','不同規格只需更換篩網','已榮獲多項專利'],
    en:['Precisely separates scrap mixed in screws, reducing manual cleaning','Magnetic tilting lift further reduces oil content','Separated oil can recirculate','Just change the screen for different specs','Holder of multiple patents'],
    vi:['Tách chính xác phoi lẫn trong ốc, giảm vệ sinh thủ công','Nâng nghiêng từ tính giảm thêm lượng dầu','Dầu tách ra có thể tuần hoàn tái sử dụng','Chỉ cần đổi lưới sàng cho quy cách khác nhau','Đã đạt nhiều bằng sáng chế']
  },
  '離心甩油鐵屑分離機': {
    zh:['螺絲與鐵屑進入離心桶脫油，以離心力分離油與鐵屑，油可回流循環','脫油後再倒入分離桶進一步分離螺絲與鐵屑','可依工件尺寸調整、依外徑更換分離盤'],
    en:['Screws and scrap enter the centrifuge for de-oiling; oil can recirculate','After de-oiling, poured into a separator to further separate screws and scrap','Adjustable by part size; change the separating disc by diameter'],
    vi:['Ốc và phoi vào thùng ly tâm tách dầu; dầu có thể tuần hoàn','Sau tách dầu, đổ vào thùng phân tách để tách tiếp ốc và phoi','Điều chỉnh theo kích thước; đổi đĩa phân tách theo đường kính']
  },
  '羅拉篩選機': {
    zh:['針對螺絲頭部大小、墊片與螺母厚薄篩選','圓桿外徑尺寸可依客戶要求訂做'],
    en:['Sorts by screw head size, washer and nut thickness','Roller diameter customizable on request'],
    vi:['Sàng lọc theo kích thước đầu ốc, độ dày long đền và đai ốc','Đường kính trục lăn có thể đặt làm theo yêu cầu']
  },
  '羅拉篩選機 (兩軸)': {
    zh:['兩軸羅拉篩選機','針對頭部大小、墊片、螺母厚薄篩選；外徑可依客戶要求訂做'],
    en:['Two-axis roller sorting machine','Sorts by head size, washer/nut thickness; diameter customizable'],
    vi:['Máy sàng lọc trục lăn 2 trục','Sàng theo kích thước đầu, độ dày long đền/đai ốc; đường kính tùy chỉnh']
  },
  '羅拉篩選機 (四軸)': {
    zh:['四軸羅拉篩選機，篩選效率更高','針對頭部大小、墊片、螺母厚薄篩選；外徑可依客戶要求訂做'],
    en:['Four-axis roller sorting machine, higher sorting efficiency','Sorts by head size, washer/nut thickness; diameter customizable'],
    vi:['Máy sàng lọc trục lăn 4 trục, hiệu suất cao hơn','Sàng theo kích thước đầu, độ dày long đền/đai ốc; đường kính tùy chỉnh']
  },
  '輸送機 (附檢測功能)': {
    zh:['可同時送料及檢測','能在檢料桶批次抽驗不良品，提升品質'],
    en:['Conveys and inspects at the same time','Batch-checks defects in the quality bin to improve quality'],
    vi:['Vừa vận chuyển vừa kiểm tra','Kiểm tra theo lô phế phẩm trong khay, nâng cao chất lượng']
  },
  '螺絲華司組合機': {
    zh:['螺絲與華司自動組合機','螺絲規格、長度、出料速度等參數可依客戶需求訂製'],
    en:['Automatic screw & washer assembly machine','Screw spec, length and speed customizable'],
    vi:['Máy lắp ráp ốc vít & long đền tự động','Quy cách, chiều dài, tốc độ ốc có thể tùy chỉnh']
  },
  '金屬刻字機': {
    zh:['轉盤速度以變頻控制器調整，控制器可隨操作人員移動','6 位數計數器，可設定需求數量','字模活動式高低調整，長套/短套通用','馬達齒輪硬式傳動（非皮帶）','可搭配振動送料與自動補料桶，送料平穩、選向準確'],
    en:['Turntable speed via inverter; movable controller','6-digit counter with target quantity','Adjustable letter mold height, long/short sleeve compatible','Hard gear drive (not belt)','Pairs with vibratory feeding and auto hopper for stable, accurate feeding'],
    vi:['Tốc độ mâm xoay bằng biến tần; bộ điều khiển di động','Bộ đếm 6 chữ số, đặt số lượng mục tiêu','Khuôn chữ điều chỉnh cao thấp, dùng chung ống dài/ngắn','Truyền động bánh răng cứng (không dùng dây đai)','Kết hợp cấp liệu rung và thùng tự động, cấp liệu ổn định, định hướng chính xác']
  },
  '金屬滾花機': {
    zh:['專為滾花開發；齒輪花、網狀花通用，節省設備成本','模具附壓力活動式高低調整與緩衝，防止花模/字模損壞','6 位數計數器、轉盤齒輪減速、特殊鋼材','可搭配振動盤自動選向送料與自動補料桶','生產速度：每分鐘 100–250 顆'],
    en:['Developed for knurling; gear & mesh patterns compatible, saving cost','Molds with cushioned height adjustment to prevent mold damage','6-digit counter, geared turntable, special steel','Pairs with auto-orientation feeding and auto hopper','Speed: 100–250 pcs/min'],
    vi:['Phát triển cho lăn nhám; hoa văn bánh răng & lưới dùng chung, tiết kiệm chi phí','Khuôn có điều chỉnh cao thấp giảm chấn, tránh hỏng khuôn','Bộ đếm 6 chữ số, mâm xoay giảm tốc bánh răng, thép đặc biệt','Kết hợp cấp liệu định hướng tự động và thùng tự động','Tốc độ: 100–250 cái/phút']
  },
  '金屬刻字、滾花機 (一機兩用)': {
    zh:['套筒滾溝、刻字、滾花一次完成，省去兩道工序與兩台設備','滾花款式（齒輪花、網狀花）通用，適用現有長套/短套模具','模具附壓力高低調整與緩衝；6 位數計數器','可搭配振動盤自動選向送料與自動補料桶','生產速度：每分鐘 100–250 顆'],
    en:['Grooving, engraving and knurling of sleeves in one pass; saves two steps and machines','Gear/mesh knurl patterns compatible with existing long/short sleeve molds','Cushioned height-adjust molds; 6-digit counter','Pairs with auto-orientation feeding and auto hopper','Speed: 100–250 pcs/min'],
    vi:['Tạo rãnh, khắc chữ và lăn nhám tuýp trong một lượt; bớt hai công đoạn và hai máy','Hoa văn bánh răng/lưới dùng chung khuôn ống dài/ngắn hiện có','Khuôn điều chỉnh cao thấp giảm chấn; bộ đếm 6 chữ số','Kết hợp cấp liệu định hướng tự động và thùng tự động','Tốc độ: 100–250 cái/phút']
  },
  '矯直機': {
    zh:['適合熱處理後成品彎曲矯直加工','適用各種鋼材、銅、鋁、不鏽鋼、鈦合金等棒材','加工範圍：長度 60–300mm、直徑 Ø3–Ø8mm','精度及品質均可提升'],
    en:['Straightens parts bent after heat treatment','For steel, copper, aluminum, stainless steel, titanium alloy bars','Range: length 60–300mm, diameter Ø3–Ø8mm','Improves precision and quality'],
    vi:['Nắn thẳng chi tiết bị cong sau xử lý nhiệt','Cho thanh thép, đồng, nhôm, inox, hợp kim titan','Phạm vi: dài 60–300mm, đường kính Ø3–Ø8mm','Nâng cao độ chính xác và chất lượng']
  },
};
window.JT_DESC = JT_DESC;
