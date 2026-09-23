/**
 * seed-faq.mjs
 * 建立「客服FAQ」工作表並寫入 50 道常見問題（答案欄留空，由美容師填寫）
 * 執行：node scripts/seed-faq.mjs
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
const get = (key) => {
  const match = env.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, 'm'));
  return match ? match[1] : '';
};

const SHEET_ID = get('GOOGLE_SHEET_ID');
const EMAIL    = get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const KEY      = get('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: EMAIL, private_key: KEY },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// ── 50 道常見問題（answer 留空，等美容師填寫）──────────────────────────────
// 格式：[問題, 答案, 分類]
const FAQ_ROWS = [
  // ── 預約 & 到店 ──────────────────────────────────────────────────────────
  ['如何預約療程？有哪些管道？',                           '', '預約與到店'],
  ['可以當天現場直接預約嗎？',                             '', '預約與到店'],
  ['預約後如何取消或改期？',                               '', '預約與到店'],
  ['需要提前多久到店準備？',                               '', '預約與到店'],
  ['停車方便嗎？附近有哪些停車場？',                       '', '預約與到店'],
  ['首次到店需要填寫什麼資料？',                           '', '預約與到店'],
  ['可以帶朋友一起來嗎？有雙人療程嗎？',                   '', '預約與到店'],
  ['遲到的話療程時間會縮短嗎？',                           '', '預約與到店'],

  // ── 療程內容 ──────────────────────────────────────────────────────────────
  ['你們有哪些療程項目？',                                 '', '療程內容'],
  ['一次療程大概需要多長時間？',                           '', '療程內容'],
  ['臉部療程和身體療程有什麼差別？',                       '', '療程內容'],
  ['你們用的是什麼品牌的產品？',                           '', '療程內容'],
  ['可以客製化我的療程嗎？',                               '', '療程內容'],
  ['什麼是導入？什麼是導出？有什麼效果？',                 '', '療程內容'],
  ['有提供背部護理或去角質嗎？',                           '', '療程內容'],
  ['療程中途可以中斷嗎？',                                 '', '療程內容'],
  ['療程有沒有包含按摩？',                                 '', '療程內容'],
  ['一個療程可以同時處理多個問題嗎（如：暗沉＋毛孔）？',   '', '療程內容'],

  // ── 效果 & 適合族群 ───────────────────────────────────────────────────────
  ['做一次療程就能看到效果嗎？',                           '', '效果與族群'],
  ['建議多久做一次療程效果最好？',                         '', '效果與族群'],
  ['敏感肌可以做嗎？',                                     '', '效果與族群'],
  ['懷孕中或哺乳中可以做哪些療程？',                       '', '效果與族群'],
  ['有在吃A酸、杜鵑花酸的人可以做嗎？',                   '', '效果與族群'],
  ['最近剛做完醫美療程，可以接著做嗎？',                   '', '效果與族群'],
  ['男生也可以來做嗎？有適合男生的項目嗎？',               '', '效果與族群'],
  ['幾歲適合開始保養療程？',                               '', '效果與族群'],

  // ── 療程前注意事項 ────────────────────────────────────────────────────────
  ['來之前需要卸妝嗎？',                                   '', '療程前注意'],
  ['有哪些情況不適合做療程？',                             '', '療程前注意'],
  ['療程前飲食有什麼需要注意的嗎？',                       '', '療程前注意'],
  ['當天有曬太陽可以做嗎？',                               '', '療程前注意'],
  ['生理期可以做療程嗎？',                                 '', '療程前注意'],
  ['臉上有痘痘或傷口可以做嗎？',                           '', '療程前注意'],

  // ── 療程後注意事項 ────────────────────────────────────────────────────────
  ['做完療程後皮膚泛紅是正常的嗎？',                       '', '療程後注意'],
  ['做完當天可以化妝嗎？',                                 '', '療程後注意'],
  ['做完後需要注意哪些保養步驟？',                         '', '療程後注意'],
  ['做完療程後皮膚為什麼反而更乾？',                       '', '療程後注意'],
  ['做完後多久可以曬太陽或游泳？',                         '', '療程後注意'],
  ['做完療程後臉上出了幾顆小痘痘，正常嗎？',               '', '療程後注意'],

  // ── 價格 & 付款 ───────────────────────────────────────────────────────────
  ['療程的費用大概是多少？',                               '', '價格與付款'],
  ['有提供療程套組或優惠方案嗎？',                         '', '價格與付款'],
  ['接受哪些付款方式（信用卡、LINE Pay…）？',              '', '價格與付款'],
  ['購買的療程次數可以退費嗎？',                           '', '價格與付款'],
  ['療程次數可以轉讓給朋友或家人嗎？',                     '', '價格與付款'],
  ['首次體驗有優惠嗎？',                                   '', '價格與付款'],

  // ── 會員 & 優惠 ───────────────────────────────────────────────────────────
  ['有會員制度嗎？怎麼加入？有什麼福利？',                 '', '會員與優惠'],
  ['介紹朋友來有優惠嗎？',                                 '', '會員與優惠'],
  ['LINE 官方帳號加入後有什麼好處？',                      '', '會員與優惠'],
  ['生日當月有什麼特別優惠嗎？',                           '', '會員與優惠'],

  // ── 產品選購 ──────────────────────────────────────────────────────────────
  ['你們現場有在賣護膚產品嗎？可以單獨購買嗎？',           '', '產品選購'],
  ['美容師推薦的產品，我在哪裡可以買到？',                 '', '產品選購'],
];

async function ensureSheet(title) {
  // 取得目前所有 sheet 清單
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === title);
  if (!exists) {
    console.log(`  建立新工作表：${title}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  } else {
    console.log(`  工作表已存在：${title}`);
  }
}

async function main() {
  console.log('🔧 確認「客服FAQ」工作表...');
  await ensureSheet('客服FAQ');

  console.log('🧹 清除舊資料...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: '客服FAQ!A1:C200',
  });

  console.log('✍️  寫入標題列與 50 道問題...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: '客服FAQ!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['問題', '答案（美容師填寫）', '分類'],
        ...FAQ_ROWS,
      ],
    },
  });

  console.log(`\n✅ 完成！共寫入 ${FAQ_ROWS.length} 道問題`);
  console.log('📋 請至 Google Sheets「客服FAQ」工作表，由美容師逐一填寫「答案」欄位');
  console.log('   填好後 Bot 會在 30 分鐘內自動更新知識庫（Redis cache 重整後生效）');
}

main().catch(console.error);
