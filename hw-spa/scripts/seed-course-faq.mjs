/**
 * seed-course-faq.mjs
 * 建立「課程FAQ」工作表並寫入 50 道課程專屬問題（答案欄留空，由美容師填寫）
 * 執行：node scripts/seed-course-faq.mjs
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

// ── 50 道課程專屬問題（answer 留空，等美容師填寫）─────────────────────────
// 格式：[問題, 答案, 分類]
const FAQ_ROWS = [
  // ── 臉部療程 ──────────────────────────────────────────────────────────────
  ['AQUATIC 潔淨保濕課程，跟一般的臉部保濕有什麼不同？',              '', '臉部療程'],
  ['BABOR 課程用的是正品進口嗎？在哪個國家製造？',                     '', '臉部療程'],
  ['SOTHYS 水彈力課程做完會有美白效果嗎？能維持多久？',               '', '臉部療程'],
  ['苦杏仁代謝課程會讓皮膚脫皮嗎？脫皮期間要注意什麼？',             '', '臉部療程'],
  ['喚顏海藻微晶課程，「微晶」是什麼？會傷皮膚嗎？',                 '', '臉部療程'],
  ['水光注顏課程跟醫美水光針有什麼差別？',                             '', '臉部療程'],
  ['水光注顏課程 $8,000–$18,000 差距很大，現場怎麼評估定價？',        '', '臉部療程'],
  ['撥筋活氧明亮課程，「撥筋」做起來會痛嗎？',                         '', '臉部療程'],
  ['微電流小V臉課程，效果可以維持多久？需要定期做嗎？',               '', '臉部療程'],
  ['微電流做的時候臉會有麻麻的感覺嗎？',                               '', '臉部療程'],
  ['HW 記憶面膜是什麼材質？跟一般面膜有什麼不同？',                   '', '臉部療程'],
  ['全台首創記憶面膜，這個技術是你們自己研發的嗎？',                   '', '臉部療程'],
  ['奈米水素水小氣泡課程，小氣泡清完後毛孔會縮小嗎？',               '', '臉部療程'],
  ['小氣泡課程適合有粉刺的人嗎？做完當天粉刺會清乾淨嗎？',           '', '臉部療程'],
  ['韓國音波課程跟 HIFU 超聲刀一樣嗎？有什麼差別？',                  '', '臉部療程'],
  ['音波課程做完需要修復期嗎？做完能直接上班嗎？',                     '', '臉部療程'],
  ['客製化課程，第一次怎麼諮詢？需要付費嗎？',                         '', '臉部療程'],
  ['同一天可以同時做臉部療程加除毛嗎？',                               '', '臉部療程'],

  // ── 身體療程 ──────────────────────────────────────────────────────────────
  ['前胸後背放鬆紓壓課程，做完背痘會改善嗎？',                         '', '身體療程'],
  ['從頭到腳全身舒暢課程，包含哪些部位？有沒有不包含的地方？',         '', '身體療程'],
  ['疏經儀淋巴循環課程，做完水腫能消多少？效果能持續多久？',           '', '身體療程'],
  ['G5 推推脂課程，跟一般按摩有什麼不一樣？可以瘦哪些部位？',         '', '身體療程'],
  ['全身去角質課程，去完角質可以直接上保養品嗎？',                     '', '身體療程'],
  ['美背／美臀淨暇課程，背部的痘疤也能處理嗎？',                       '', '身體療程'],
  ['美胸 UPUP 課程，真的能讓胸部變大嗎？還是只有緊緻效果？',          '', '身體療程'],
  ['孕婦 SPA 課程，幾週以上的孕婦才能做？有哪些部位不能按？',         '', '身體療程'],
  ['孕婦 SPA 使用的產品安全嗎？有成分說明嗎？',                        '', '身體療程'],
  ['GIRL\'S 私密課程，是什麼樣的護理？需要事先準備什麼嗎？',          '', '身體療程'],
  ['私密課程環境私密嗎？會由女性美容師操作嗎？',                       '', '身體療程'],
  ['身體課程跟臉部課程可以同一天一起做嗎？要預留多少時間？',           '', '身體療程'],

  // ── 冰肌除毛 ──────────────────────────────────────────────────────────────
  ['冰肌除毛跟雷射除毛有什麼不同？哪個效果比較持久？',                 '', '冰肌除毛'],
  ['冰肌除毛做幾次才能達到永久效果？',                                 '', '冰肌除毛'],
  ['除毛前需要自己先剃毛嗎？還是到店直接做？',                         '', '冰肌除毛'],
  ['除毛前有沒有什麼禁忌（不能曬太陽、不能吃某些藥）？',              '', '冰肌除毛'],
  ['比基尼線除毛跟 VIO 全除有什麼差別？哪個比較推薦？',               '', '冰肌除毛'],
  ['除毛過程會很痛嗎？「冰肌」是指有冷卻功能嗎？',                     '', '冰肌除毛'],
  ['除完毛後皮膚會紅腫嗎？需要多久恢復？',                             '', '冰肌除毛'],
  ['腿毛很硬很粗，冰肌除毛適合嗎？',                                   '', '冰肌除毛'],
  ['除毛課程之間需要間隔多久才能再做一次？',                           '', '冰肌除毛'],
  ['男生可以做除毛嗎？有男性專屬項目嗎？',                             '', '冰肌除毛'],

  // ── 加購項目 ──────────────────────────────────────────────────────────────
  ['清粉刺加購，清完之後毛孔會變大嗎？',                               '', '加購項目'],
  ['特殊安瓶加購，$500–$800 的差別在哪裡？怎麼選擇適合我的？',        '', '加購項目'],
  ['女性暖宮調理，是用什麼方式暖宮？儀器還是手法？',                   '', '加購項目'],
  ['暖宮調理對生理痛有幫助嗎？',                                       '', '加購項目'],
  ['頭部放鬆加購，15 分鐘跟 30 分鐘差在哪裡？哪個比較推薦？',         '', '加購項目'],
  ['被動式律動儀塑身，跟一般運動相比效果如何？',                       '', '加購項目'],
  ['金絲遠紅外線太空艙，裡面是躺著還是坐著？會悶熱嗎？',             '', '加購項目'],
  ['遠紅外線太空艙有禁忌症嗎（心臟病、高血壓）？',                    '', '加購項目'],
  ['全身體膜，用的是什麼成分的體膜？有美白效果嗎？',                   '', '加購項目'],
  ['加購項目一定要搭配主療程才能做嗎？可以單獨預約嗎？',               '', '加購項目'],
];

async function ensureSheet(title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === title);
  if (!exists) {
    console.log(`  建立新工作表：${title}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  } else {
    console.log(`  工作表已存在：${title}`);
  }
}

async function main() {
  console.log('🔧 確認「課程FAQ」工作表...');
  await ensureSheet('課程FAQ');

  console.log('🧹 清除舊資料...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: '課程FAQ!A1:C200',
  });

  console.log('✍️  寫入標題列與 50 道課程問題...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: '課程FAQ!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['問題', '答案（美容師填寫）', '分類'],
        ...FAQ_ROWS,
      ],
    },
  });

  console.log(`\n✅ 完成！共寫入 ${FAQ_ROWS.length} 道課程問題`);
  console.log('📋 請至 Google Sheets「課程FAQ」工作表，由美容師逐一填寫「答案」欄位');
  console.log('   填好後 Bot 會在 30 分鐘內自動更新知識庫');
}

main().catch(console.error);
