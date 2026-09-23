# Elden IOL 報告單自動代填擴充功能 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一個 Chrome 擴充功能，讓診所技術員把 IOLMaster 700 報告單照片拖進側邊欄，數值就自動填入 ASCRS Barrett Toric Calculator 頁面，全程零手動鍵入。

**Architecture:** Manifest V3 擴充功能，側邊欄負責上傳與人工確認、content script 負責寫入官網欄位、一支 Vercel Function 呼叫 Claude Vision 做辨識。個資在瀏覽器本機以 Canvas 遮蔽後才上傳。核心商業邏輯（欄位映射、鏡片常數換算）全部是純函式，可獨立測試。

**Tech Stack:** TypeScript、Vite + CRXJS、React 19 + Tailwind 4、Vitest + jsdom、`@anthropic-ai/sdk` + Zod、Vercel Functions

**Spec:** `docs/superpowers/specs/2026-08-26-elden-iol-ocr-autofill-design.md`

## Global Constraints

- 專案根目錄：`elden-iol/`。所有路徑相對於此目錄。
- **絕不自動按下 Calculate。** 任何程式碼都不得觸發官網的計算按鈕。
- **不實作 Barrett 演算法。** 不得寫入任何 IOL 度數計算邏輯。
- **不儲存病患資料。** `chrome.storage` 僅存 `ClinicProfile`；辨識 API 不落地任何資料、不寫日誌。
- Claude 模型一律 `claude-opus-5`，搭配 `thinking: { type: "adaptive" }`。
- 所有金額／度數數值一律用 `number`，不用字串運算，避免浮點字串比較問題。
- 免責聲明文案（逐字，不得改寫）：
  `本工具僅協助資料輸入，計算結果由 ASCRS 官方計算器產生，最終判斷以醫師為準。`
- 樣本真值（Task 5 的驗收基準，來自 `elden-iol/docs/samples/`）：
  Flat K 43.08@96、Steep K 45.58@6、AL 24.49、ACD 3.15、A Constant 119.39、LF 2.09、SIA 0.2@135。

---

### Task 1: 專案骨架與測試環境

**Files:**
- Create: `elden-iol/package.json`
- Create: `elden-iol/tsconfig.json`
- Create: `elden-iol/vite.config.ts`
- Create: `elden-iol/manifest.config.ts`
- Create: `elden-iol/src/sidepanel/index.html`
- Create: `elden-iol/src/sidepanel/main.tsx`
- Create: `elden-iol/src/background/index.ts`
- Test: `elden-iol/src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `npm test`（Vitest，jsdom 環境）與 `npm run build`（產出可載入的 `dist/`）兩個指令，後續所有任務依賴它們。

- [ ] **Step 1: 建立 `package.json`**

```json
{
  "name": "elden-iol",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0",
    "@types/chrome": "^0.0.287",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 建立 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["src", "api", "*.config.ts"]
}
```

- [ ] **Step 3: 建立 `manifest.config.ts`**

```ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Elden IOL 報告單代填',
  version: '0.1.0',
  description: 'IOLMaster 報告單辨識，自動填入 ASCRS Barrett Toric Calculator',
  permissions: ['storage', 'sidePanel', 'activeTab', 'scripting'],
  host_permissions: ['https://www.ascrs.org/*'],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  action: { default_title: '開啟 IOL 代填面板' },
  content_scripts: [
    {
      matches: ['https://www.ascrs.org/tools/barrett-toric-calculator*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});
```

- [ ] **Step 4: 建立 `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 5: 建立最小的三個進入點**

`src/sidepanel/index.html`：

```html
<!doctype html>
<html lang="zh-Hant">
  <head><meta charset="utf-8" /><title>IOL 代填</title></head>
  <body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

`src/sidepanel/main.tsx`：

```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<div>IOL 代填面板</div>);
```

`src/background/index.ts`：

```ts
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId !== undefined) {
    void chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
```

`src/content/index.ts`（先放空殼，Task 7 才實作）：

```ts
export {};
```

- [ ] **Step 6: 寫煙霧測試 `src/lib/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('測試環境', () => {
  it('jsdom 可用', () => {
    document.body.innerHTML = '<input id="x" value="1" />';
    expect(document.querySelector<HTMLInputElement>('#x')!.value).toBe('1');
  });
});
```

- [ ] **Step 7: 執行測試確認通過**

Run: `cd elden-iol && npm install && npm test`
Expected: PASS，1 passed

- [ ] **Step 8: 執行建置確認產出可載入**

Run: `cd elden-iol && npm run build`
Expected: 產生 `dist/manifest.json`。手動在 `chrome://extensions` 開發人員模式「載入未封裝項目」選 `dist/`，應可成功載入且無錯誤。

- [ ] **Step 9: Commit**

```bash
git add elden-iol/package.json elden-iol/tsconfig.json elden-iol/vite.config.ts \
        elden-iol/manifest.config.ts elden-iol/src
git commit -m "chore(elden-iol): 建立 MV3 擴充功能骨架與 Vitest 測試環境"
```

---

### Task 2: 資料模型與 Zod schema

**Files:**
- Create: `elden-iol/src/lib/schema.ts`
- Test: `elden-iol/src/lib/schema.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `NumericMeasurementSchema`, `TextMeasurementSchema`, `EyeDataSchema`, `RecognitionResultSchema`（Zod）
  - 型別 `NumericMeasurement`, `TextMeasurement`, `EyeData`, `RecognitionResult`（由 Zod 推導，單一真實來源）
  - Task 5、8、10 全部依賴這些型別。

- [ ] **Step 1: 寫失敗的測試 `src/lib/schema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RecognitionResultSchema } from './schema';

const sample = {
  device: 'IOLMaster700',
  reportDate: '2026-07-17',
  warnings: ['OD: Axial length measurements slightly inconsistent. Please check fixation.'],
  overallConfidence: 0.94,
  eyes: [
    {
      laterality: 'OD',
      status: 'Phakic',
      hasData: true,
      al:  { value: 24.49, confidence: 0.97, borderline: true,  rawText: '24.49 mm (!)' },
      acd: { value: 3.15,  confidence: 0.98, borderline: false, rawText: '3.15 mm' },
      lt:  { value: 4.99,  confidence: 0.96, borderline: false, rawText: '4.99 mm' },
      wtw: { value: 11.6,  confidence: 0.93, borderline: true,  rawText: '11.6 mm (!)' },
      k1:     { value: 43.08, confidence: 0.97, borderline: false, rawText: '43.08 D' },
      k1Axis: { value: 96,    confidence: 0.97, borderline: false, rawText: '96°' },
      k2:     { value: 45.58, confidence: 0.97, borderline: false, rawText: '45.58 D' },
      k2Axis: { value: 6,     confidence: 0.97, borderline: false, rawText: '6°' },
      tk1:     { value: 43.0,  confidence: 0.95, borderline: false, rawText: '43.00 D' },
      tk1Axis: { value: 95,    confidence: 0.95, borderline: false, rawText: '95°' },
      tk2:     { value: 45.53, confidence: 0.95, borderline: false, rawText: '45.53 D' },
      tk2Axis: { value: 5,     confidence: 0.95, borderline: false, rawText: '5°' },
      targetRefraction: { value: 0, confidence: 0.99, borderline: false, rawText: '+0.00 D' },
      lensModel:  { value: 'AMO Tecnic 1 ZCB00-1', confidence: 0.9, borderline: false, rawText: 'AMO Tecnic 1 ZCB00-1' },
      aConstant:  { value: 119.3, confidence: 0.96, borderline: false, rawText: 'A const.: 119.30' },
    },
  ],
};

describe('RecognitionResultSchema', () => {
  it('接受樣本報告單的辨識結果', () => {
    const parsed = RecognitionResultSchema.parse(sample);
    expect(parsed.eyes[0]!.al.value).toBe(24.49);
    expect(parsed.warnings).toHaveLength(1);
  });

  it('缺少 warnings 欄位時拒絕（警告是必要欄位，不得省略）', () => {
    const { warnings, ...withoutWarnings } = sample;
    expect(() => RecognitionResultSchema.parse(withoutWarnings)).toThrow();
  });

  it('信心值超出 0–1 範圍時拒絕', () => {
    const bad = structuredClone(sample);
    bad.eyes[0]!.al.confidence = 1.5;
    expect(() => RecognitionResultSchema.parse(bad)).toThrow();
  });

  it('未測量的欄位允許 value 為 null', () => {
    const bad = structuredClone(sample);
    bad.eyes[0]!.tk1.value = null as unknown as number;
    expect(() => RecognitionResultSchema.parse(bad)).not.toThrow();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/schema.test.ts`
Expected: FAIL — `Failed to resolve import "./schema"`

- [ ] **Step 3: 安裝 zod 並實作 `src/lib/schema.ts`**

Run: `cd elden-iol && npm install zod`

```ts
import { z } from 'zod';

const measurement = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    borderline: z.boolean(),
    rawText: z.string(),
  });

export const NumericMeasurementSchema = measurement(z.number());
export const TextMeasurementSchema = measurement(z.string());

export const EyeDataSchema = z.object({
  laterality: z.enum(['OD', 'OS']),
  status: z.enum(['Phakic', 'Pseudophakic', 'Aphakic', 'unknown']),
  hasData: z.boolean(),
  al: NumericMeasurementSchema,
  acd: NumericMeasurementSchema,
  lt: NumericMeasurementSchema,
  wtw: NumericMeasurementSchema,
  k1: NumericMeasurementSchema,
  k1Axis: NumericMeasurementSchema,
  k2: NumericMeasurementSchema,
  k2Axis: NumericMeasurementSchema,
  tk1: NumericMeasurementSchema,
  tk1Axis: NumericMeasurementSchema,
  tk2: NumericMeasurementSchema,
  tk2Axis: NumericMeasurementSchema,
  targetRefraction: NumericMeasurementSchema,
  lensModel: TextMeasurementSchema,
  aConstant: NumericMeasurementSchema,
});

export const RecognitionResultSchema = z.object({
  device: z.enum(['IOLMaster700', 'unknown']),
  reportDate: z.string().nullable(),
  eyes: z.array(EyeDataSchema),
  warnings: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});

export type NumericMeasurement = z.infer<typeof NumericMeasurementSchema>;
export type TextMeasurement = z.infer<typeof TextMeasurementSchema>;
export type EyeData = z.infer<typeof EyeDataSchema>;
export type RecognitionResult = z.infer<typeof RecognitionResultSchema>;
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/schema.test.ts`
Expected: PASS，4 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/lib/schema.ts elden-iol/src/lib/schema.test.ts elden-iol/package.json
git commit -m "feat(elden-iol): 定義辨識結果 Zod schema 與型別"
```

---

### Task 3: 鏡片常數對照表

**Files:**
- Create: `elden-iol/src/lib/lens-constants.ts`
- Test: `elden-iol/src/lib/lens-constants.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `interface ToricLensFamily { id: string; label: string; aConstant: number; lensFactor: number; toricPowers: string[] }`
  - `normalizeLensModel(raw: string): string | null`
  - `lookupToricFamily(nonToricModel: string): ToricLensFamily | null`
  - `getFamilyById(id: string): ToricLensFamily | null`
  - `TORIC_FAMILIES: ToricLensFamily[]`
  - Task 5 用它把報告單常數換成散光片常數；Task 9 用 `TORIC_FAMILIES` 做設定下拉選單。

- [ ] **Step 1: 寫失敗的測試 `src/lib/lens-constants.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeLensModel, lookupToricFamily, getFamilyById, TORIC_FAMILIES } from './lens-constants';

describe('normalizeLensModel', () => {
  it('從 OCR 的完整字串抽出型號代碼', () => {
    expect(normalizeLensModel('AMO Tecnic 1 ZCB00-1')).toBe('ZCB00-1');
  });

  it('容忍 OCR 把 Tecnis 讀成 Tecnic 的誤差', () => {
    expect(normalizeLensModel('AMO Tecnis 1 ZCB00')).toBe('ZCB00');
  });

  it('忽略大小寫與多餘空白', () => {
    expect(normalizeLensModel('  amo  tecnis  zcb00-1  ')).toBe('ZCB00-1');
  });

  it('認不出型號時回 null', () => {
    expect(normalizeLensModel('某個不存在的鏡片')).toBeNull();
  });
});

describe('lookupToricFamily', () => {
  it('ZCB00-1 對應到 J&J DIU 散光片系列，常數為 119.39 / 2.09', () => {
    const family = lookupToricFamily('ZCB00-1')!;
    expect(family.id).toBe('JJ_DIU');
    expect(family.aConstant).toBe(119.39);
    expect(family.lensFactor).toBe(2.09);
  });

  it('接受未正規化的原始字串', () => {
    expect(lookupToricFamily('AMO Tecnic 1 ZCB00-1')!.id).toBe('JJ_DIU');
  });

  it('沒有對應時回 null', () => {
    expect(lookupToricFamily('UNKNOWN99')).toBeNull();
  });
});

describe('DIU 系列', () => {
  it('包含樣本用到的 DIU375', () => {
    expect(getFamilyById('JJ_DIU')!.toricPowers).toContain('DIU375');
  });

  it('TORIC_FAMILIES 至少有一個項目供設定畫面選擇', () => {
    expect(TORIC_FAMILIES.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/lens-constants.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/lib/lens-constants.ts`**

```ts
export interface ToricLensFamily {
  id: string;
  label: string;
  aConstant: number;
  lensFactor: number;
  toricPowers: string[];
}

export const TORIC_FAMILIES: ToricLensFamily[] = [
  {
    id: 'JJ_DIU',
    label: 'J&J Tecnis Toric II (DIU)',
    aConstant: 119.39,
    lensFactor: 2.09,
    toricPowers: ['DIU150', 'DIU225', 'DIU300', 'DIU375', 'DIU450', 'DIU525', 'DIU600'],
  },
];

/** 非散光片型號 → 對應的散光片系列 id */
const NON_TORIC_TO_TORIC: Record<string, string> = {
  ZCB00: 'JJ_DIU',
  'ZCB00-1': 'JJ_DIU',
};

/** 已知型號代碼，長的排前面，避免 ZCB00 先命中而吃掉 ZCB00-1 */
const KNOWN_MODEL_CODES = Object.keys(NON_TORIC_TO_TORIC).sort((a, b) => b.length - a.length);

export function normalizeLensModel(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const code of KNOWN_MODEL_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export function getFamilyById(id: string): ToricLensFamily | null {
  return TORIC_FAMILIES.find((f) => f.id === id) ?? null;
}

export function lookupToricFamily(model: string): ToricLensFamily | null {
  const code = normalizeLensModel(model);
  if (code === null) return null;
  const familyId = NON_TORIC_TO_TORIC[code];
  return familyId === undefined ? null : getFamilyById(familyId);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/lens-constants.test.ts`
Expected: PASS，9 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/lib/lens-constants.ts elden-iol/src/lib/lens-constants.test.ts
git commit -m "feat(elden-iol): 鏡片型號正規化與散光片常數對照表"
```

---

### Task 4: 診所設定檔

**Files:**
- Create: `elden-iol/src/lib/profile.ts`
- Test: `elden-iol/src/lib/profile.test.ts`

**Interfaces:**
- Consumes: `TORIC_FAMILIES`（Task 3）
- Produces:
  - `interface ClinicProfile`（欄位見下方實作）
  - `DEFAULT_PROFILE: ClinicProfile`
  - `loadProfile(): Promise<ClinicProfile>`
  - `saveProfile(p: ClinicProfile): Promise<void>`
  - Task 5 消費 `ClinicProfile`；Task 9 提供編輯介面。

- [ ] **Step 1: 寫失敗的測試 `src/lib/profile.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from './profile';

let store: Record<string, unknown> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
      },
    },
  });
});

describe('ClinicProfile', () => {
  it('第一次載入時回傳預設值', async () => {
    const p = await loadProfile();
    expect(p).toEqual(DEFAULT_PROFILE);
  });

  it('存檔後再讀回相同內容', async () => {
    const custom = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭', defaultSIA: 0.2, defaultSIAAxis: 135 };
    await saveProfile(custom);
    expect(await loadProfile()).toEqual(custom);
  });

  it('已存的舊設定缺欄位時，用預設值補齊', async () => {
    store['clinicProfile'] = { surgeonName: '只有這個欄位' };
    const p = await loadProfile();
    expect(p.surgeonName).toBe('只有這個欄位');
    expect(p.kIndex).toBe(DEFAULT_PROFILE.kIndex);
  });

  it('預設不儲存任何病患資料欄位', () => {
    expect(Object.keys(DEFAULT_PROFILE)).not.toContain('patientName');
    expect(Object.keys(DEFAULT_PROFILE)).not.toContain('patientId');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/profile.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/lib/profile.ts`**

```ts
export interface ClinicProfile {
  surgeonName: string;
  defaultSIA: number;
  defaultSIAAxis: number;
  keratometrySource: 'K' | 'TK';
  kIndex: 1.3375 | 1.332;
  cylinderConvention: 'positive' | 'negative';
  preferredLensFamily: string;
  /** 低於此信心值的欄位，UI 強制人工確認 */
  confidenceThreshold: number;
}

export const DEFAULT_PROFILE: ClinicProfile = {
  surgeonName: '',
  defaultSIA: 0.2,
  defaultSIAAxis: 135,
  keratometrySource: 'K',
  kIndex: 1.3375,
  cylinderConvention: 'negative',
  preferredLensFamily: 'JJ_DIU',
  confidenceThreshold: 0.9,
};

const STORAGE_KEY = 'clinicProfile';

export async function loadProfile(): Promise<ClinicProfile> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<ClinicProfile> | undefined;
  return { ...DEFAULT_PROFILE, ...(stored ?? {}) };
}

export async function saveProfile(profile: ClinicProfile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: profile });
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/profile.test.ts`
Expected: PASS，4 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/lib/profile.ts elden-iol/src/lib/profile.test.ts
git commit -m "feat(elden-iol): 診所設定檔讀寫與預設值補齊"
```

---

### Task 5: 核心欄位映射 ⭐

這是整個產品的價值核心。報告單到官網不是一對一搬運，此任務實作全部轉換規則。

**Files:**
- Create: `elden-iol/src/lib/mapping.ts`
- Test: `elden-iol/src/lib/mapping.test.ts`

**Interfaces:**
- Consumes: `EyeData`（Task 2）、`ClinicProfile`（Task 4）、`lookupToricFamily` / `getFamilyById`（Task 3）
- Produces:
  - `interface FormValues`（文字欄位，見實作）
  - `interface FormOptions { kIndex: 1.3375 | 1.332; cylinderConvention: 'positive' | 'negative' }`
  - `interface Substitution { field: keyof FormValues; from: string; to: string; reason: string }`
  - `interface MappingResult { values: FormValues; options: FormOptions; substitutions: Substitution[]; blockers: string[] }`
  - `mapToFormValues(eye: EyeData, profile: ClinicProfile, today: Date): MappingResult`
  - `formatDate(d: Date): string`
  - Task 7 消費 `FormValues` / `FormOptions` 寫入頁面；Task 10 顯示 `substitutions` 與 `blockers`。

- [ ] **Step 1: 寫失敗的測試 `src/lib/mapping.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mapToFormValues, formatDate } from './mapping';
import { DEFAULT_PROFILE } from './profile';
import type { EyeData, NumericMeasurement, TextMeasurement } from './schema';

const num = (value: number | null, borderline = false): NumericMeasurement =>
  ({ value, confidence: 0.97, borderline, rawText: String(value ?? '---') });
const text = (value: string | null): TextMeasurement =>
  ({ value, confidence: 0.9, borderline: false, rawText: value ?? '---' });

/** 樣本報告單的右眼資料 */
const sampleEye = (): EyeData => ({
  laterality: 'OD',
  status: 'Phakic',
  hasData: true,
  al: num(24.49, true),
  acd: num(3.15),
  lt: num(4.99),
  wtw: num(11.6, true),
  k1: num(43.08), k1Axis: num(96),
  k2: num(45.58), k2Axis: num(6),
  tk1: num(43.0), tk1Axis: num(95),
  tk2: num(45.53), tk2Axis: num(5),
  targetRefraction: num(0),
  lensModel: text('AMO Tecnic 1 ZCB00-1'),
  aConstant: num(119.3),
});

const profile = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭', defaultSIA: 0.2, defaultSIAAxis: 135 };
const sampleDate = new Date(2026, 6, 17); // 2026-07-17

describe('formatDate', () => {
  it('輸出官網使用的 DD/MM/YYYY 格式', () => {
    expect(formatDate(new Date(2026, 6, 17))).toBe('17/07/2026');
  });

  it('個位數的日與月補零', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
  });
});

describe('mapToFormValues — 樣本報告單', () => {
  it('產出與 barrett_toric_result_sample.jpg 完全一致的輸入值', () => {
    const { values } = mapToFormValues(sampleEye(), profile, sampleDate);
    expect(values).toEqual({
      patientName: '',
      patientId: '',
      surgeonName: '中慈 Dr彭',
      date: '17/07/2026',
      flatK: 43.08,
      flatKAxis: 96,
      steepK: 45.58,
      steepKAxis: 6,
      al: 24.49,
      acd: 3.15,
      aConstant: 119.39,
      lensFactor: 2.09,
      sia: 0.2,
      siaAxis: 135,
    });
  });

  it('沒有任何阻斷問題', () => {
    expect(mapToFormValues(sampleEye(), profile, sampleDate).blockers).toEqual([]);
  });

  it('記錄 A Constant 從報告單值換成散光片值的替換說明', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile, sampleDate);
    const aConst = substitutions.find((s) => s.field === 'aConstant')!;
    expect(aConst.from).toBe('119.3');
    expect(aConst.to).toBe('119.39');
    expect(aConst.reason).toContain('DIU');
  });

  it('記錄 SIA 來自設定檔而非報告單', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile, sampleDate);
    expect(substitutions.some((s) => s.field === 'sia')).toBe(true);
  });
});

describe('mapToFormValues — flat/steep 判定', () => {
  it('依數值大小判定平陡，不信任 K1/K2 的編號順序', () => {
    const eye = sampleEye();
    // 故意顛倒：K1 放陡的、K2 放平的
    eye.k1 = num(45.58); eye.k1Axis = num(6);
    eye.k2 = num(43.08); eye.k2Axis = num(96);
    const { values } = mapToFormValues(eye, profile, sampleDate);
    expect(values.flatK).toBe(43.08);
    expect(values.flatKAxis).toBe(96);
    expect(values.steepK).toBe(45.58);
    expect(values.steepKAxis).toBe(6);
  });
});

describe('mapToFormValues — K / TK 來源切換', () => {
  it('設定為 TK 時改用 TK1/TK2', () => {
    const { values } = mapToFormValues(sampleEye(), { ...profile, keratometrySource: 'TK' }, sampleDate);
    expect(values.flatK).toBe(43.0);
    expect(values.flatKAxis).toBe(95);
    expect(values.steepK).toBe(45.53);
    expect(values.steepKAxis).toBe(5);
  });

  it('設定為 TK 但報告單沒有 TK 值時，回報阻斷而不靜默改用 K', () => {
    const eye = sampleEye();
    eye.tk1 = num(null); eye.tk2 = num(null);
    const { blockers } = mapToFormValues(eye, { ...profile, keratometrySource: 'TK' }, sampleDate);
    expect(blockers.some((b) => b.includes('TK'))).toBe(true);
  });
});

describe('mapToFormValues — 阻斷情境', () => {
  it('沒有資料的眼睛回報阻斷', () => {
    const eye = { ...sampleEye(), hasData: false, status: 'Pseudophakic' as const };
    expect(mapToFormValues(eye, profile, sampleDate).blockers.length).toBeGreaterThan(0);
  });

  it('AL 缺失時回報阻斷', () => {
    const eye = sampleEye();
    eye.al = num(null);
    expect(mapToFormValues(eye, profile, sampleDate).blockers.some((b) => b.includes('AL'))).toBe(true);
  });

  it('鏡片型號認不出來時回報阻斷，並且不亂猜常數', () => {
    const eye = sampleEye();
    eye.lensModel = text('某個沒見過的鏡片');
    const { blockers } = mapToFormValues(eye, profile, sampleDate);
    expect(blockers.some((b) => b.includes('鏡片'))).toBe(true);
  });
});

describe('mapToFormValues — 選項', () => {
  it('K Index 與正負柱鏡取自設定檔', () => {
    const { options } = mapToFormValues(sampleEye(), profile, sampleDate);
    expect(options.kIndex).toBe(1.3375);
    expect(options.cylinderConvention).toBe('negative');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/mapping.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/lib/mapping.ts`**

```ts
import type { EyeData, NumericMeasurement } from './schema';
import type { ClinicProfile } from './profile';
import { lookupToricFamily, getFamilyById } from './lens-constants';

export interface FormValues {
  patientName: string;
  patientId: string;
  surgeonName: string;
  date: string;
  flatK: number;
  flatKAxis: number;
  steepK: number;
  steepKAxis: number;
  al: number;
  acd: number;
  aConstant: number;
  lensFactor: number;
  sia: number;
  siaAxis: number;
}

export interface FormOptions {
  kIndex: 1.3375 | 1.332;
  cylinderConvention: 'positive' | 'negative';
}

export interface Substitution {
  field: keyof FormValues;
  from: string;
  to: string;
  reason: string;
}

export interface MappingResult {
  values: FormValues;
  options: FormOptions;
  substitutions: Substitution[];
  blockers: string[];
}

export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** 依角膜屈光度大小判定平／陡，不信任 K1/K2 的編號順序 */
function orderKeratometry(
  a: NumericMeasurement, aAxis: NumericMeasurement,
  b: NumericMeasurement, bAxis: NumericMeasurement,
) {
  const av = a.value;
  const bv = b.value;
  if (av === null || bv === null) return null;
  return av <= bv
    ? { flat: av, flatAxis: aAxis.value, steep: bv, steepAxis: bAxis.value }
    : { flat: bv, flatAxis: bAxis.value, steep: av, steepAxis: aAxis.value };
}

export function mapToFormValues(
  eye: EyeData,
  profile: ClinicProfile,
  today: Date,
): MappingResult {
  const blockers: string[] = [];
  const substitutions: Substitution[] = [];

  if (!eye.hasData) {
    blockers.push(`${eye.laterality} 這隻眼沒有量測資料（狀態：${eye.status}），無法代填。`);
  }

  // --- 角膜屈光度 ---
  const useTK = profile.keratometrySource === 'TK';
  const pair = useTK
    ? orderKeratometry(eye.tk1, eye.tk1Axis, eye.tk2, eye.tk2Axis)
    : orderKeratometry(eye.k1, eye.k1Axis, eye.k2, eye.k2Axis);

  if (pair === null) {
    blockers.push(
      useTK
        ? '設定為使用 TK（含後表面），但報告單沒有 TK 值。請改用 K 或重新量測。'
        : '報告單缺少 K1/K2 角膜屈光度。',
    );
  }
  if (pair !== null && (pair.flatAxis === null || pair.steepAxis === null)) {
    blockers.push('角膜屈光度缺少軸位。');
  }

  // --- 眼軸與前房 ---
  if (eye.al.value === null) blockers.push('報告單缺少 AL（眼軸長）。');
  if (eye.acd.value === null) blockers.push('報告單缺少 ACD（前房深度）。');

  // --- 鏡片常數：報告單印的是非散光片，官網要散光片 ---
  const raw = eye.lensModel.value;
  let family = raw === null ? null : lookupToricFamily(raw);
  if (family === null) family = getFamilyById(profile.preferredLensFamily);

  if (family === null) {
    blockers.push(`認不出鏡片型號「${raw ?? '(未讀到)'}」，且設定檔的預設散光片系列無效。`);
  } else if (raw !== null && lookupToricFamily(raw) === null) {
    blockers.push(`認不出報告單上的鏡片型號「${raw}」，已改用設定檔的預設系列 ${family.label}，請人工確認。`);
  }

  if (family !== null && eye.aConstant.value !== null && eye.aConstant.value !== family.aConstant) {
    substitutions.push({
      field: 'aConstant',
      from: String(eye.aConstant.value),
      to: String(family.aConstant),
      reason: `報告單上的常數屬於非散光片；官網需使用 ${family.label} 的散光片常數`,
    });
  }

  // --- SIA：報告單沒有這個欄位 ---
  substitutions.push({
    field: 'sia',
    from: '(報告單無此欄位)',
    to: `${profile.defaultSIA} D @ ${profile.defaultSIAAxis}°`,
    reason: '手術誘發散光取自診所設定檔',
  });

  const values: FormValues = {
    patientName: '',
    patientId: '',
    surgeonName: profile.surgeonName,
    date: formatDate(today),
    flatK: pair?.flat ?? 0,
    flatKAxis: pair?.flatAxis ?? 0,
    steepK: pair?.steep ?? 0,
    steepKAxis: pair?.steepAxis ?? 0,
    al: eye.al.value ?? 0,
    acd: eye.acd.value ?? 0,
    aConstant: family?.aConstant ?? 0,
    lensFactor: family?.lensFactor ?? 0,
    sia: profile.defaultSIA,
    siaAxis: profile.defaultSIAAxis,
  };

  return {
    values,
    options: { kIndex: profile.kIndex, cylinderConvention: profile.cylinderConvention },
    substitutions,
    blockers,
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/mapping.test.ts`
Expected: PASS，13 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/lib/mapping.ts elden-iol/src/lib/mapping.test.ts
git commit -m "feat(elden-iol): 報告單到官網的欄位映射與常數換算"
```

---

### Task 6: 本機個資遮蔽

**Files:**
- Create: `elden-iol/src/lib/redact.ts`
- Test: `elden-iol/src/lib/redact.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `interface Region { x: number; y: number; w: number; h: number }`（相對比例 0–1）
  - `IOLMASTER_PII_REGIONS: Region[]`
  - `redactImage(source: CanvasImageSource, width: number, height: number, regions: Region[]): HTMLCanvasElement`
  - `canvasToBase64Jpeg(canvas: HTMLCanvasElement): string`（不含 `data:` 前綴）
  - Task 9 在上傳前呼叫。

- [ ] **Step 1: 寫失敗的測試 `src/lib/redact.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { redactImage, canvasToBase64Jpeg, IOLMASTER_PII_REGIONS } from './redact';

function whiteCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  return c;
}

function pixelAt(c: HTMLCanvasElement, x: number, y: number): [number, number, number] {
  const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!];
}

describe('redactImage', () => {
  it('把指定區塊塗黑', () => {
    const src = whiteCanvas(100, 100);
    const out = redactImage(src, 100, 100, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }]);
    expect(pixelAt(out, 15, 15)).toEqual([0, 0, 0]);
  });

  it('區塊以外的像素保持原樣', () => {
    const src = whiteCanvas(100, 100);
    const out = redactImage(src, 100, 100, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }]);
    expect(pixelAt(out, 90, 90)).toEqual([255, 255, 255]);
  });

  it('沒有指定區塊時原圖不變', () => {
    const src = whiteCanvas(50, 50);
    const out = redactImage(src, 50, 50, []);
    expect(pixelAt(out, 25, 25)).toEqual([255, 255, 255]);
  });

  it('輸出尺寸與輸入一致', () => {
    const out = redactImage(whiteCanvas(120, 80), 120, 80, IOLMASTER_PII_REGIONS);
    expect(out.width).toBe(120);
    expect(out.height).toBe(80);
  });
});

describe('IOLMASTER_PII_REGIONS', () => {
  it('至少定義一個遮蔽區塊', () => {
    expect(IOLMASTER_PII_REGIONS.length).toBeGreaterThan(0);
  });

  it('所有區塊座標都在 0–1 範圍內', () => {
    for (const r of IOLMASTER_PII_REGIONS) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
    }
  });
});

describe('canvasToBase64Jpeg', () => {
  it('回傳不含 data URI 前綴的字串', () => {
    const b64 = canvasToBase64Jpeg(whiteCanvas(10, 10));
    expect(b64.startsWith('data:')).toBe(false);
    expect(b64.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/redact.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 安裝 canvas 後端並實作 `src/lib/redact.ts`**

jsdom 本身沒有 canvas 實作，需要安裝 `canvas` 套件讓 `getContext('2d')` 可用：

Run: `cd elden-iol && npm install -D canvas`

```ts
export interface Region {
  /** 全部為相對比例 0–1，以便對任何解析度的照片都適用 */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * IOLMaster 700 報告單上含個資的區塊。
 * 報告單本身不印病患姓名，但技術員常在紙上手寫姓名／病歷號，
 * 且頁首頁尾可能有院所浮水印，故連同保守遮蔽。
 * 座標需以真實樣本校準，調整後務必重跑 Task 12 的黃金測試集。
 */
export const IOLMASTER_PII_REGIONS: Region[] = [
  { x: 0, y: 0, w: 1, h: 0.05 },       // 頁首手寫區
  { x: 0, y: 0.95, w: 1, h: 0.05 },    // 頁尾院所資訊
];

export function redactImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  regions: Region[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('無法取得 2D canvas context');

  ctx.drawImage(source, 0, 0, width, height);
  ctx.fillStyle = '#000000';
  for (const r of regions) {
    ctx.fillRect(
      Math.round(r.x * width),
      Math.round(r.y * height),
      Math.round(r.w * width),
      Math.round(r.h * height),
    );
  }
  return canvas;
}

export function canvasToBase64Jpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/redact.test.ts`
Expected: PASS，7 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/lib/redact.ts elden-iol/src/lib/redact.test.ts elden-iol/package.json
git commit -m "feat(elden-iol): 上傳前於本機遮蔽個資區塊"
```

---

### Task 7: 欄位定位與寫值（含 ASCRS 選擇器表與 fixture）

**Files:**
- Create: `elden-iol/src/content/selectors.ts`
- Create: `elden-iol/src/content/fill.ts`
- Create: `elden-iol/src/content/fixtures/ascrs-form.html`
- Test: `elden-iol/src/content/fill.test.ts`

**Interfaces:**
- Consumes: `FormValues`, `FormOptions`（Task 5）
- Produces:
  - `interface FieldLocator { id?: string; labelPattern: RegExp }`
  - `ASCRS_FIELD_MAP: Record<keyof FormValues, FieldLocator>`
  - `setNativeValue(el, value: string): void`
  - `fireInputEvents(el: Element): void`
  - `locateField(locator: FieldLocator, root: Document): HTMLInputElement | null`
  - `fillForm(values: FormValues, root: Document): FillReport`
  - `interface FillOutcome { field: string; ok: boolean; reason?: string }`
  - `interface FillReport { filled: number; total: number; failures: FillOutcome[] }`
  - Task 11 從 side panel 透過訊息呼叫 `fillForm`。

**設計說明：** 以「標籤文字」為主要定位手段，`id` 為選用的加速路徑。
探測腳本（`elden-iol/tools/ascrs-probe.js`）跑出真實 id 之後，只需把 `id` 補進
`ASCRS_FIELD_MAP` 即可，`labelPattern` 永遠留著當官網改版時的後備。

- [ ] **Step 1: 建立 fixture `src/content/fixtures/ascrs-form.html`**

模仿 ASCRS 計算器的表單結構（欄位標籤取自 `barrett_toric_result_sample.jpg`）：

```html
<div id="calculator">
  <div><label for="pt-name">Patient</label><input id="pt-name" type="text" /></div>
  <div><label for="pt-id">ID</label><input id="pt-id" type="text" /></div>
  <div><label for="surg">Surgeon</label><input id="surg" type="text" /></div>
  <div><label for="dt">Date</label><input id="dt" type="text" /></div>
  <div><label for="fk">Flat K</label><input id="fk" type="text" /></div>
  <div><label for="fka">Flat K Axis</label><input id="fka" type="text" /></div>
  <div><label for="sk">Steep K</label><input id="sk" type="text" /></div>
  <div><label for="ska">Steep K Axis</label><input id="ska" type="text" /></div>
  <div><label for="axl">AL</label><input id="axl" type="text" /></div>
  <div><label for="acd">ACD</label><input id="acd" type="text" /></div>
  <div><label for="aconst">A Constant</label><input id="aconst" type="text" /></div>
  <div><label for="lf">LF</label><input id="lf" type="text" /></div>
  <div><label for="sia">Induced Astigmatism (SIA)</label><input id="sia" type="text" /></div>
  <div><label for="siaax">SIA Degrees</label><input id="siaax" type="text" /></div>
  <button id="calc-btn">Calculate</button>
</div>
```

- [ ] **Step 2: 寫失敗的測試 `src/content/fill.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setNativeValue, fireInputEvents, locateField, fillForm } from './fill';
import { ASCRS_FIELD_MAP } from './selectors';
import type { FormValues } from '../lib/mapping';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(here, 'fixtures/ascrs-form.html'), 'utf8');

const sampleValues: FormValues = {
  patientName: '', patientId: '',
  surgeonName: '中慈 Dr彭', date: '17/07/2026',
  flatK: 43.08, flatKAxis: 96,
  steepK: 45.58, steepKAxis: 6,
  al: 24.49, acd: 3.15,
  aConstant: 119.39, lensFactor: 2.09,
  sia: 0.2, siaAxis: 135,
};

beforeEach(() => { document.body.innerHTML = fixture; });

describe('locateField', () => {
  it('用標籤文字找到欄位（不依賴 id）', () => {
    const el = locateField({ labelPattern: /^Flat K$/ }, document);
    expect(el?.id).toBe('fk');
  });

  it('id 存在時優先使用 id', () => {
    const el = locateField({ id: 'acd', labelPattern: /^完全不會命中的東西$/ }, document);
    expect(el?.id).toBe('acd');
  });

  it('id 失效時退回標籤文字', () => {
    const el = locateField({ id: 'id-已經被官網改掉', labelPattern: /^ACD$/ }, document);
    expect(el?.id).toBe('acd');
  });

  it('兩種都找不到時回 null', () => {
    expect(locateField({ labelPattern: /^不存在$/ }, document)).toBeNull();
  });

  it('Flat K 的樣式不會誤命中 Flat K Axis', () => {
    expect(locateField(ASCRS_FIELD_MAP.flatK, document)?.id).toBe('fk');
    expect(locateField(ASCRS_FIELD_MAP.flatKAxis, document)?.id).toBe('fka');
  });
});

describe('setNativeValue', () => {
  it('寫入一般 input', () => {
    const el = document.querySelector<HTMLInputElement>('#axl')!;
    setNativeValue(el, '24.49');
    expect(el.value).toBe('24.49');
  });

  it('繞過框架覆寫的 setter（模擬 React 受控元件）', () => {
    const el = document.querySelector<HTMLInputElement>('#axl')!;
    // 模擬框架在實例上蓋掉 value setter
    let intercepted = '';
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: () => intercepted,
      set: (v: string) => { intercepted = `框架吃掉了:${v}`; },
    });
    setNativeValue(el, '24.49');
    // 原生 setter 應該直接寫進去，不經過框架的攔截
    expect(intercepted).not.toContain('框架吃掉了');
  });
});

describe('fireInputEvents', () => {
  it('派發 input 與 change 事件', () => {
    const el = document.querySelector<HTMLInputElement>('#axl')!;
    const seen: string[] = [];
    el.addEventListener('input', () => seen.push('input'));
    el.addEventListener('change', () => seen.push('change'));
    fireInputEvents(el);
    expect(seen).toContain('input');
    expect(seen).toContain('change');
  });
});

describe('fillForm', () => {
  it('填滿全部欄位', () => {
    const report = fillForm(sampleValues, document);
    expect(report.failures).toEqual([]);
    expect(report.filled).toBe(report.total);
  });

  it('數值正確寫入畫面', () => {
    fillForm(sampleValues, document);
    expect(document.querySelector<HTMLInputElement>('#fk')!.value).toBe('43.08');
    expect(document.querySelector<HTMLInputElement>('#ska')!.value).toBe('6');
    expect(document.querySelector<HTMLInputElement>('#aconst')!.value).toBe('119.39');
    expect(document.querySelector<HTMLInputElement>('#sia')!.value).toBe('0.2');
  });

  it('絕不觸發 Calculate 按鈕', () => {
    let clicked = false;
    document.querySelector('#calc-btn')!.addEventListener('click', () => { clicked = true; });
    fillForm(sampleValues, document);
    expect(clicked).toBe(false);
  });

  it('欄位不存在時記錄失敗而非拋錯', () => {
    document.querySelector('#aconst')!.remove();
    document.querySelector('label[for="aconst"]')!.remove();
    const report = fillForm(sampleValues, document);
    expect(report.failures.some((f) => f.field === 'aConstant')).toBe(true);
    expect(report.filled).toBeLessThan(report.total);
  });

  it('空字串欄位（病患姓名）不算失敗', () => {
    const report = fillForm(sampleValues, document);
    expect(report.failures.some((f) => f.field === 'patientName')).toBe(false);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/content/fill.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 4: 實作 `src/content/selectors.ts`**

```ts
import type { FormValues } from '../lib/mapping';

export interface FieldLocator {
  /** 探測腳本跑出真實 id 後填入；留空則只用標籤文字定位 */
  id?: string;
  /** 後備定位手段：比對欄位的標籤文字。官網改版時仍能運作 */
  labelPattern: RegExp;
}

export const ASCRS_FIELD_MAP: Record<keyof FormValues, FieldLocator> = {
  patientName: { labelPattern: /^Patient$/i },
  patientId:   { labelPattern: /^ID$/i },
  surgeonName: { labelPattern: /^Surgeon$/i },
  date:        { labelPattern: /^Date$/i },
  flatK:       { labelPattern: /^Flat K$/i },
  flatKAxis:   { labelPattern: /^Flat K Axis$/i },
  steepK:      { labelPattern: /^Steep K$/i },
  steepKAxis:  { labelPattern: /^Steep K Axis$/i },
  al:          { labelPattern: /^AL$/i },
  acd:         { labelPattern: /^ACD$/i },
  aConstant:   { labelPattern: /^A Constant$/i },
  lensFactor:  { labelPattern: /^LF$/i },
  sia:         { labelPattern: /^Induced Astigmatism \(SIA\)$/i },
  siaAxis:     { labelPattern: /^SIA Degrees$/i },
};
```

- [ ] **Step 5: 實作 `src/content/fill.ts`**

```ts
import type { FormValues } from '../lib/mapping';
import { ASCRS_FIELD_MAP, type FieldLocator } from './selectors';

export interface FillOutcome {
  field: string;
  ok: boolean;
  reason?: string;
}

export interface FillReport {
  filled: number;
  total: number;
  failures: FillOutcome[];
}

/**
 * 直接呼叫原生 value setter，繞過 React / Vue 在實例上覆寫的 setter。
 * 這是讓受控元件接受程式化寫入的標準手法。
 */
export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const instanceSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;

  if (nativeSetter !== undefined && instanceSetter !== nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
}

/** 派發各家框架會監聽的事件，讓它們同步內部 state */
export function fireInputEvents(el: Element): void {
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

export function locateField(locator: FieldLocator, root: Document): HTMLInputElement | null {
  if (locator.id !== undefined) {
    const byId = root.getElementById(locator.id);
    if (byId instanceof HTMLInputElement) return byId;
  }

  for (const label of Array.from(root.querySelectorAll('label'))) {
    if (!locator.labelPattern.test(label.textContent?.trim() ?? '')) continue;

    const forId = label.getAttribute('for');
    if (forId !== null) {
      const target = root.getElementById(forId);
      if (target instanceof HTMLInputElement) return target;
    }
    const nested = label.querySelector('input');
    if (nested instanceof HTMLInputElement) return nested;
  }
  return null;
}

export function fillForm(values: FormValues, root: Document): FillReport {
  const failures: FillOutcome[] = [];
  let filled = 0;

  const entries = Object.entries(ASCRS_FIELD_MAP) as [keyof FormValues, FieldLocator][];

  for (const [field, locator] of entries) {
    const el = locateField(locator, root);
    if (el === null) {
      failures.push({ field, ok: false, reason: '在頁面上找不到這個欄位' });
      continue;
    }
    setNativeValue(el, String(values[field]));
    fireInputEvents(el);
    filled += 1;
  }

  return { filled, total: entries.length, failures };
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/content/fill.test.ts`
Expected: PASS，13 passed

- [ ] **Step 7: Commit**

```bash
git add elden-iol/src/content
git commit -m "feat(elden-iol): 欄位定位與繞過受控元件的寫值機制"
```

---

### Task 8: 辨識 API（Claude Vision）

**Files:**
- Create: `elden-iol/api/recognize.ts`
- Create: `elden-iol/api/prompt.ts`
- Create: `elden-iol/vercel.json`
- Test: `elden-iol/api/prompt.test.ts`
- Test: `elden-iol/api/recognize.integration.test.ts`

**Interfaces:**
- Consumes: `RecognitionResultSchema`（Task 2）
- Produces:
  - HTTP `POST /api/recognize`，body `{ imageBase64: string, mediaType: string }`
  - 回應 `RecognitionResult`（200）或 `{ error: string }`（4xx/5xx）
  - `buildExtractionPrompt(): string`
  - Task 9 的 side panel 呼叫此端點。

- [ ] **Step 1: 寫失敗的測試 `api/prompt.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt } from './prompt';

describe('buildExtractionPrompt', () => {
  const prompt = buildExtractionPrompt();

  it('要求同時抓取警告訊息，而不只是數字', () => {
    expect(prompt).toContain('warnings');
    expect(prompt).toMatch(/警告|warning/i);
  });

  it('明確說明 (!) 標記代表 borderline', () => {
    expect(prompt).toContain('(!)');
    expect(prompt).toContain('borderline');
  });

  it('說明 Pseudophakic 眼可能整欄為 ---', () => {
    expect(prompt).toContain('Pseudophakic');
    expect(prompt).toContain('---');
  });

  it('要求逐欄回報信心值與原始文字', () => {
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('rawText');
  });

  it('明確禁止猜測看不清楚的數值', () => {
    expect(prompt).toMatch(/不要猜|勿猜|null/);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run api/prompt.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `api/prompt.ts`**

```ts
export function buildExtractionPrompt(): string {
  return `你正在讀取一張 ZEISS IOLMaster 700 的「IOL calculation」生物量測報告單照片。
請把上面的數值抽取成結構化資料，供人工水晶體度數計算使用。

這是醫療資料，讀錯會導致病患被植入錯誤的人工水晶體，因此：

1. **看不清楚的欄位，value 一律填 null，絕對不要猜測、不要推算、不要用常見值代替。**
   信心值 (confidence) 誠實反映你的把握程度。

2. **rawText 必須逐字記錄你在圖上看到的原始文字**（含單位與符號），
   例如 "24.49 mm (!)"、"43.08 D"、"---"。這是給人工比對用的，不要美化或正規化。

3. **borderline 欄位**：報告單會在數值旁印一個 (!) 驚嘆號標記，代表該量測值處於臨界範圍。
   看到 (!) 就把該欄位的 borderline 設為 true。

4. **warnings 陣列必須抓取報告單上所有的文字警告**，
   通常印在頁面最上方、旁邊有一個大驚嘆號圖示，
   例如 "OD: Axial length measurements slightly inconsistent. Please check fixation."
   逐字照抄英文原文。沒有警告就給空陣列。這個欄位絕對不能省略。

5. **版面**：報告單左半邊是 OD（右眼），右半邊是 OS（左眼）。
   若某一眼的狀態 (LS) 是 Pseudophakic（已植入人工水晶體），
   該眼通常整欄都是 --- 沒有數值，此時 hasData 設為 false，各欄位 value 填 null。

6. **欄位對照**：
   - AL = 眼軸長 (mm)
   - ACD = 前房深度 (mm)
   - LT = 水晶體厚度 (mm)
   - WTW = 角膜橫徑 (mm)
   - K1 / K2 = 角膜前表面兩主徑線屈光度 (D)，各自帶一個軸位 (度)
   - TK1 / TK2 = Total K，含角膜後表面的量測值 (D)，各自帶軸位
   - targetRefraction = Target ref. 目標屈光度 (D)
   - lensModel = 計算所用的人工水晶體型號字串，逐字照抄（例如 "AMO Tecnic 1 ZCB00-1"）
   - aConstant = 該型號的 A const. 數值

7. 軸位一律以度為單位的整數（0–180）。度數一律保留報告單上的小數位數。

8. overallConfidence 反映你對整張報告單判讀的整體把握程度。

9. device：確認是 IOLMaster 700 就填 "IOLMaster700"，否則填 "unknown"。
   reportDate 取報告單上的 "Report dated" 日期，格式 YYYY-MM-DD；讀不到就填 null。`;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run api/prompt.test.ts`
Expected: PASS，5 passed

- [ ] **Step 5: 實作 `api/recognize.ts`**

Run: `cd elden-iol && npm install @anthropic-ai/sdk`

```ts
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { RecognitionResultSchema } from '../src/lib/schema';
import { buildExtractionPrompt } from './prompt';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const client = new Anthropic();

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export async function POST(request: Request): Promise<Response> {
  let payload: { imageBase64?: unknown; mediaType?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: '請求內容不是合法的 JSON' }, 400);
  }

  const { imageBase64, mediaType } = payload;

  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return json({ error: '缺少 imageBase64' }, 400);
  }
  if (typeof mediaType !== 'string' || !ALLOWED_MEDIA_TYPES.includes(mediaType as never)) {
    return json({ error: `mediaType 必須是 ${ALLOWED_MEDIA_TYPES.join(' / ')}` }, 400);
  }
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return json({ error: '圖片過大，請壓縮後再上傳（上限 8 MB）' }, 413);
  }

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { format: zodOutputFormat(RecognitionResultSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 },
            },
            { type: 'text', text: buildExtractionPrompt() },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ error: '模型拒絕處理這張圖片，請確認上傳的是報告單' }, 422);
    }
    if (response.parsed_output === null) {
      return json({ error: '辨識結果無法解析，請重試或改用清晰一點的照片' }, 502);
    }

    return json(response.parsed_output, 200);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: '辨識服務忙碌中，請稍後再試' }, 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return json({ error: '無法連線到辨識服務，請檢查網路' }, 503);
    }
    return json({ error: '辨識失敗，請重試' }, 500);
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
```

- [ ] **Step 6: 建立 `vercel.json`**

```json
{
  "functions": {
    "api/recognize.ts": { "maxDuration": 120 }
  }
}
```

- [ ] **Step 7: 寫整合測試 `api/recognize.integration.test.ts`**

此測試會真的呼叫 Claude API，沒有 `ANTHROPIC_API_KEY` 時自動跳過。

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST } from './recognize';

const here = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.join(here, '../docs/samples/iolmaster700_report_sample.jpg');
const hasKey = typeof process.env['ANTHROPIC_API_KEY'] === 'string';

describe.skipIf(!hasKey)('POST /api/recognize（真實呼叫 Claude）', () => {
  it('從樣本報告單抽出正確的右眼數值', async () => {
    const imageBase64 = fs.readFileSync(samplePath).toString('base64');
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
      }),
    );
    expect(res.status).toBe(200);

    const result = await res.json();
    const od = result.eyes.find((e: { laterality: string }) => e.laterality === 'OD');

    expect(od.al.value).toBeCloseTo(24.49, 2);
    expect(od.acd.value).toBeCloseTo(3.15, 2);
    expect(od.k1.value).toBeCloseTo(43.08, 2);
    expect(od.k2.value).toBeCloseTo(45.58, 2);
    expect(od.k1Axis.value).toBe(96);
    expect(od.k2Axis.value).toBe(6);
  }, 120_000);

  it('抓到眼軸不一致的警告訊息', async () => {
    const imageBase64 = fs.readFileSync(samplePath).toString('base64');
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
      }),
    );
    const result = await res.json();
    expect(result.warnings.join(' ')).toMatch(/[Aa]xial length/);
  }, 120_000);

  it('把 AL 的 (!) 標記為 borderline', async () => {
    const imageBase64 = fs.readFileSync(samplePath).toString('base64');
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
      }),
    );
    const result = await res.json();
    const od = result.eyes.find((e: { laterality: string }) => e.laterality === 'OD');
    expect(od.al.borderline).toBe(true);
  }, 120_000);
});

describe('POST /api/recognize — 輸入驗證（不需 API key）', () => {
  it('缺少 imageBase64 時回 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        body: JSON.stringify({ mediaType: 'image/jpeg' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('不支援的 mediaType 回 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: 'abc', mediaType: 'image/gif' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 8: 執行測試**

Run: `cd elden-iol && npx vitest run api/`
Expected: 沒設 `ANTHROPIC_API_KEY` 時 PASS，7 passed（3 skipped）

- [ ] **Step 9: 設定金鑰後執行整合測試**

Run: `cd elden-iol && ANTHROPIC_API_KEY=<key> npx vitest run api/recognize.integration.test.ts`
Expected: PASS，5 passed。**若任何一項失敗，先調整 `prompt.ts` 再繼續**——
辨識準確率是整個產品的地基，不能帶著已知的錯誤往下做。

- [ ] **Step 10: Commit**

```bash
git add elden-iol/api elden-iol/vercel.json elden-iol/package.json
git commit -m "feat(elden-iol): Claude Vision 辨識 API 與抽取提示詞"
```

---

### Task 9: 側邊欄 — 上傳、遮蔽與辨識

**Files:**
- Create: `elden-iol/src/sidepanel/api.ts`
- Create: `elden-iol/src/sidepanel/components/Dropzone.tsx`
- Create: `elden-iol/src/sidepanel/components/Disclaimer.tsx`
- Modify: `elden-iol/src/sidepanel/main.tsx`
- Create: `elden-iol/src/sidepanel/App.tsx`
- Test: `elden-iol/src/sidepanel/api.test.ts`

**Interfaces:**
- Consumes: `redactImage`, `canvasToBase64Jpeg`, `IOLMASTER_PII_REGIONS`（Task 6）、`RecognitionResultSchema`（Task 2）
- Produces:
  - `recognizeImage(file: File): Promise<RecognitionResult>`（含遮蔽 → 上傳 → 驗證回應）
  - `RECOGNIZE_ENDPOINT: string`
  - `<Dropzone onFile={...} />`、`<Disclaimer />`
  - Task 10 接手 `RecognitionResult` 顯示確認畫面。

- [ ] **Step 1: 寫失敗的測試 `src/sidepanel/api.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recognizeImage } from './api';

const validResult = {
  device: 'IOLMaster700',
  reportDate: '2026-07-17',
  warnings: [],
  overallConfidence: 0.95,
  eyes: [],
};

// 遮蔽邏輯已在 Task 6 完整測過；這裡把它換掉，讓本測試專注在上傳與回應驗證。
// （jsdom 的 createImageBitmap 產物餵不進 canvas 的 drawImage，硬接會失敗。）
vi.mock('../lib/redact', () => ({
  IOLMASTER_PII_REGIONS: [{ x: 0, y: 0, w: 1, h: 0.05 }],
  redactImage: vi.fn(() => ({ __redacted: true })),
  canvasToBase64Jpeg: vi.fn(() => 'REDACTED_BASE64'),
}));

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100 })));
});

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

// 註：vi.mock 會被提升到檔案最上方，因此上面的 mock 對本檔全部測試都生效。

const fakeFile = () => new File([new Uint8Array([1, 2, 3])], 'r.jpg', { type: 'image/jpeg' });

describe('recognizeImage', () => {
  it('回傳通過 schema 驗證的辨識結果', async () => {
    mockFetch(validResult);
    await expect(recognizeImage(fakeFile())).resolves.toMatchObject({ device: 'IOLMaster700' });
  });

  it('上傳的是遮蔽後的圖，不是原檔', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify(validResult), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await recognizeImage(fakeFile());
    const body = JSON.parse(spy.mock.calls[0]![1]!.body as string);
    // 送出的是 canvasToBase64Jpeg 的產物（遮蔽後），不是原始檔案內容
    expect(body.imageBase64).toBe('REDACTED_BASE64');
    expect(body.imageBase64.startsWith('data:')).toBe(false);
    expect(body.mediaType).toBe('image/jpeg');
  });

  it('伺服器回錯誤時，把錯誤訊息拋出來給 UI 顯示', async () => {
    mockFetch({ error: '辨識服務忙碌中，請稍後再試' }, 429);
    await expect(recognizeImage(fakeFile())).rejects.toThrow('辨識服務忙碌中');
  });

  it('回應不符合 schema 時拋錯，不讓壞資料流進 UI', async () => {
    mockFetch({ device: 'IOLMaster700' }, 200); // 缺 warnings 等必要欄位
    await expect(recognizeImage(fakeFile())).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/sidepanel/api.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/sidepanel/api.ts`**

```ts
import { RecognitionResultSchema, type RecognitionResult } from '../lib/schema';
import { redactImage, canvasToBase64Jpeg, IOLMASTER_PII_REGIONS } from '../lib/redact';

export const RECOGNIZE_ENDPOINT = 'https://elden-iol.vercel.app/api/recognize';

export async function recognizeImage(file: File): Promise<RecognitionResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = redactImage(bitmap, bitmap.width, bitmap.height, IOLMASTER_PII_REGIONS);
  const imageBase64 = canvasToBase64Jpeg(canvas);

  const response = await fetch(RECOGNIZE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : '辨識失敗，請重試';
    throw new Error(message);
  }

  return RecognitionResultSchema.parse(payload);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/sidepanel/api.test.ts`
Expected: PASS，4 passed

- [ ] **Step 5: 實作 `src/sidepanel/components/Disclaimer.tsx`**

```tsx
export function Disclaimer() {
  return (
    <p className="text-xs text-slate-500 border-t border-slate-200 pt-2 mt-4">
      本工具僅協助資料輸入，計算結果由 ASCRS 官方計算器產生，最終判斷以醫師為準。
    </p>
  );
}
```

- [ ] **Step 6: 實作 `src/sidepanel/components/Dropzone.tsx`**

```tsx
import { useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function Dropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file !== undefined) onFile(file);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); }}
      className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
        ${dragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => take(e.target.files)}
      />
      <span className="text-sm text-slate-600">
        把報告單照片拖進來，或點擊選擇檔案
      </span>
    </label>
  );
}
```

- [ ] **Step 7: 實作 `src/sidepanel/App.tsx`（本任務先做到辨識完成）**

```tsx
import { useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Disclaimer } from './components/Disclaimer';
import { recognizeImage } from './api';
import type { RecognitionResult } from '../lib/schema';

export function App() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await recognizeImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '辨識失敗，請重試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 font-sans">
      <h1 className="text-base font-semibold mb-3">IOL 報告單代填</h1>
      <Dropzone onFile={(f) => { void handleFile(f); }} disabled={busy} />
      {busy && <p className="mt-3 text-sm text-slate-600">辨識中…</p>}
      {error !== null && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}
      {result !== null && (
        <p className="mt-3 text-sm text-emerald-700">
          已辨識，共讀到 {result.eyes.length} 隻眼的資料。
        </p>
      )}
      <Disclaimer />
    </div>
  );
}
```

- [ ] **Step 8: 更新 `src/sidepanel/main.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

建立 `src/sidepanel/index.css`：

```css
@import "tailwindcss";
```

- [ ] **Step 9: 把 API 網域加進 manifest**

在 `manifest.config.ts` 的 `host_permissions` 加入 `'https://elden-iol.vercel.app/*'`。

- [ ] **Step 10: 執行全部測試與建置**

Run: `cd elden-iol && npm test && npm run build`
Expected: 全部 PASS，`dist/` 建置成功

- [ ] **Step 11: Commit**

```bash
git add elden-iol/src/sidepanel elden-iol/manifest.config.ts
git commit -m "feat(elden-iol): 側邊欄上傳、本機遮蔽與辨識串接"
```

---

### Task 10: 側邊欄 — 確認畫面與安全關卡 ⭐

**Files:**
- Create: `elden-iol/src/sidepanel/components/WarningBanner.tsx`
- Create: `elden-iol/src/sidepanel/components/EyeSelector.tsx`
- Create: `elden-iol/src/sidepanel/components/ReviewTable.tsx`
- Modify: `elden-iol/src/sidepanel/App.tsx`
- Test: `elden-iol/src/sidepanel/components/ReviewTable.test.tsx`
- Test: `elden-iol/src/sidepanel/components/WarningBanner.test.tsx`

**Interfaces:**
- Consumes: `RecognitionResult`, `EyeData`（Task 2）、`MappingResult`（Task 5）、`ClinicProfile`（Task 4）
- Produces:
  - `<WarningBanner warnings={string[]} borderlineFields={string[]} />`
  - `<EyeSelector eyes={EyeData[]} selected={number|null} onSelect={(i)=>void} />`
  - `<ReviewTable eye={EyeData} mapping={MappingResult} threshold={number} onConfirm={()=>void} />`
  - Task 12 接上「填入」按鈕。

- [ ] **Step 1: 安裝測試工具**

Run: `cd elden-iol && npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event`

在 `vite.config.ts` 的 `test` 區塊加入 `setupFiles: ['./src/test-setup.ts']`，並建立 `src/test-setup.ts`：

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: 寫失敗的測試 `src/sidepanel/components/WarningBanner.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WarningBanner } from './WarningBanner';

describe('WarningBanner', () => {
  it('顯示報告單上的文字警告', () => {
    render(<WarningBanner warnings={['OD: Axial length measurements slightly inconsistent.']} borderlineFields={[]} />);
    expect(screen.getByText(/Axial length/)).toBeInTheDocument();
  });

  it('列出所有 borderline 欄位', () => {
    render(<WarningBanner warnings={[]} borderlineFields={['AL', 'WTW']} />);
    expect(screen.getByText(/AL/)).toBeInTheDocument();
    expect(screen.getByText(/WTW/)).toBeInTheDocument();
  });

  it('警告不得被摺疊隱藏——沒有 details/summary 元素', () => {
    const { container } = render(
      <WarningBanner warnings={['某個警告']} borderlineFields={[]} />,
    );
    expect(container.querySelector('details')).toBeNull();
  });

  it('完全沒有警告時不渲染任何東西', () => {
    const { container } = render(<WarningBanner warnings={[]} borderlineFields={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/sidepanel/components/WarningBanner.test.tsx`
Expected: FAIL — 找不到模組

- [ ] **Step 4: 實作 `src/sidepanel/components/WarningBanner.tsx`**

```tsx
interface Props {
  warnings: string[];
  borderlineFields: string[];
}

export function WarningBanner({ warnings, borderlineFields }: Props) {
  if (warnings.length === 0 && borderlineFields.length === 0) return null;

  return (
    <div className="mt-3 border-2 border-red-400 bg-red-50 rounded p-3">
      <p className="text-sm font-bold text-red-800 mb-2">⚠️ 儀器警告，請先確認</p>
      {warnings.map((w) => (
        <p key={w} className="text-sm text-red-800 mb-1">{w}</p>
      ))}
      {borderlineFields.length > 0 && (
        <p className="text-sm text-red-800">
          臨界值 (!) 欄位：{borderlineFields.join('、')}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/sidepanel/components/WarningBanner.test.tsx`
Expected: PASS，4 passed

- [ ] **Step 6: 寫失敗的測試 `src/sidepanel/components/ReviewTable.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewTable } from './ReviewTable';
import { mapToFormValues } from '../../lib/mapping';
import { DEFAULT_PROFILE } from '../../lib/profile';
import type { EyeData, NumericMeasurement, TextMeasurement } from '../../lib/schema';

const num = (value: number | null, confidence = 0.97): NumericMeasurement =>
  ({ value, confidence, borderline: false, rawText: String(value ?? '---') });
const text = (value: string): TextMeasurement =>
  ({ value, confidence: 0.9, borderline: false, rawText: value });

const eye = (over: Partial<EyeData> = {}): EyeData => ({
  laterality: 'OD', status: 'Phakic', hasData: true,
  al: num(24.49), acd: num(3.15), lt: num(4.99), wtw: num(11.6),
  k1: num(43.08), k1Axis: num(96), k2: num(45.58), k2Axis: num(6),
  tk1: num(43.0), tk1Axis: num(95), tk2: num(45.53), tk2Axis: num(5),
  targetRefraction: num(0),
  lensModel: text('AMO Tecnic 1 ZCB00-1'),
  aConstant: num(119.3),
  ...over,
});

const profile = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭' };
const today = new Date(2026, 6, 17);

function setup(e: EyeData, onConfirm = vi.fn()) {
  const mapping = mapToFormValues(e, profile, today);
  render(<ReviewTable eye={e} mapping={mapping} threshold={0.9} onConfirm={onConfirm} />);
  return { onConfirm };
}

describe('ReviewTable', () => {
  it('同時顯示模型讀到的原始文字與轉換後的值（同一列出現兩次）', () => {
    setup(eye());
    // rawText 欄與「將填入」欄都應顯示 24.49
    expect(screen.getAllByText('24.49').length).toBeGreaterThanOrEqual(2);
  });

  it('顯示 A Constant 的替換說明，讓使用者知道數字為何和紙上不同', () => {
    setup(eye());
    const note = screen.getByTestId('substitution-aConstant');
    expect(note.textContent).toContain('119.3');
    expect(note.textContent).toContain('119.39');
  });

  it('低於信心門檻的欄位標記為需確認', () => {
    setup(eye({ al: num(24.49, 0.5) }));
    expect(screen.getByTestId('low-confidence-al')).toBeInTheDocument();
  });

  it('有低信心欄位且未逐一確認時，填入按鈕停用', () => {
    setup(eye({ al: num(24.49, 0.5) }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
  });

  it('逐一確認低信心欄位後，填入按鈕啟用', async () => {
    setup(eye({ al: num(24.49, 0.5) }));
    await userEvent.click(screen.getByTestId('confirm-al'));
    expect(screen.getByRole('button', { name: /填入/ })).toBeEnabled();
  });

  it('全部欄位信心都夠時，填入按鈕直接可用', () => {
    setup(eye());
    expect(screen.getByRole('button', { name: /填入/ })).toBeEnabled();
  });

  it('有阻斷問題時，填入按鈕停用並顯示原因', () => {
    setup(eye({ al: num(null) }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
    expect(screen.getByText(/缺少 AL/)).toBeInTheDocument();
  });

  it('按下填入時呼叫 onConfirm', async () => {
    const { onConfirm } = setup(eye());
    await userEvent.click(screen.getByRole('button', { name: /填入/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('按鈕文字明確表示不會自動計算', () => {
    setup(eye());
    expect(screen.getByRole('button', { name: /填入/ }).textContent).toMatch(/不會|不自動/);
  });
});
```

- [ ] **Step 7: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/sidepanel/components/ReviewTable.test.tsx`
Expected: FAIL — 找不到模組

- [ ] **Step 8: 實作 `src/sidepanel/components/ReviewTable.tsx`**

```tsx
import { useState } from 'react';
import type { EyeData, NumericMeasurement } from '../../lib/schema';
import type { MappingResult, FormValues } from '../../lib/mapping';

interface Props {
  eye: EyeData;
  mapping: MappingResult;
  threshold: number;
  onConfirm: () => void;
}

interface Row {
  key: string;
  label: string;
  source: NumericMeasurement;
  target: keyof FormValues;
}

export function ReviewTable({ eye, mapping, threshold, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const rows: Row[] = [
    { key: 'al', label: 'AL 眼軸長', source: eye.al, target: 'al' },
    { key: 'acd', label: 'ACD 前房深度', source: eye.acd, target: 'acd' },
    { key: 'k1', label: 'K1', source: eye.k1, target: 'flatK' },
    { key: 'k2', label: 'K2', source: eye.k2, target: 'steepK' },
  ];

  const lowConfidence = rows.filter((r) => r.source.confidence < threshold);
  const allConfirmed = lowConfidence.every((r) => confirmed.has(r.key));
  const blocked = mapping.blockers.length > 0;
  const canFill = allConfirmed && !blocked;

  const toggle = (key: string) => {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-1">欄位</th>
            <th className="py-1">紙上讀到</th>
            <th className="py-1">將填入</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const low = r.source.confidence < threshold;
            return (
              <tr
                key={r.key}
                className={low && !confirmed.has(r.key) ? 'bg-amber-50' : ''}
                data-testid={low ? `low-confidence-${r.key}` : undefined}
              >
                <td className="py-1">{r.label}</td>
                <td className="py-1 font-mono text-xs text-slate-600">{r.source.rawText}</td>
                <td className="py-1 font-mono">
                  {String(mapping.values[r.target])}
                  {low && (
                    <button
                      type="button"
                      data-testid={`confirm-${r.key}`}
                      onClick={() => toggle(r.key)}
                      className="ml-2 text-xs underline text-amber-800"
                    >
                      {confirmed.has(r.key) ? '已確認' : '我已核對'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {mapping.substitutions.map((s) => (
        <p
          key={s.field}
          data-testid={`substitution-${s.field}`}
          className="mt-2 text-xs text-sky-800 bg-sky-50 rounded p-2"
        >
          {s.field}：{s.from} → {s.to}（{s.reason}）
        </p>
      ))}

      {mapping.blockers.map((b) => (
        <p key={b} className="mt-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded p-2">
          {b}
        </p>
      ))}

      <button
        type="button"
        disabled={!canFill}
        onClick={onConfirm}
        className="mt-4 w-full rounded bg-sky-600 text-white py-2 text-sm font-medium disabled:bg-slate-300"
      >
        填入計算器（不會自動計算）
      </button>
    </div>
  );
}
```

- [ ] **Step 9: 實作 `src/sidepanel/components/EyeSelector.tsx`**

```tsx
import type { EyeData } from '../../lib/schema';

interface Props {
  eyes: EyeData[];
  selected: number | null;
  onSelect: (index: number) => void;
}

export function EyeSelector({ eyes, selected, onSelect }: Props) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium mb-1">請確認要代填哪一隻眼</p>
      <div className="flex gap-2">
        {eyes.map((eye, i) => (
          <button
            key={eye.laterality}
            type="button"
            disabled={!eye.hasData}
            onClick={() => onSelect(i)}
            className={`flex-1 rounded border py-2 text-sm
              ${selected === i ? 'border-sky-600 bg-sky-50 font-medium' : 'border-slate-300'}
              disabled:opacity-40`}
          >
            {eye.laterality}（{eye.laterality === 'OD' ? '右眼' : '左眼'}）
            {!eye.hasData && <span className="block text-xs">無資料</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/sidepanel/`
Expected: PASS，17 passed

- [ ] **Step 11: Commit**

```bash
git add elden-iol/src/sidepanel elden-iol/vite.config.ts elden-iol/src/test-setup.ts elden-iol/package.json
git commit -m "feat(elden-iol): 確認畫面、警告橫幅與眼別選擇的安全關卡"
```

---

### Task 11: 設定畫面

**Files:**
- Create: `elden-iol/src/sidepanel/components/ProfileForm.tsx`
- Test: `elden-iol/src/sidepanel/components/ProfileForm.test.tsx`

**Interfaces:**
- Consumes: `ClinicProfile`, `DEFAULT_PROFILE`（Task 4）、`TORIC_FAMILIES`（Task 3）
- Produces: `<ProfileForm profile={ClinicProfile} onSave={(p: ClinicProfile) => void} />`

- [ ] **Step 1: 寫失敗的測試 `src/sidepanel/components/ProfileForm.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';
import { DEFAULT_PROFILE } from '../../lib/profile';

describe('ProfileForm', () => {
  it('顯示目前的醫師名稱', () => {
    render(<ProfileForm profile={{ ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭' }} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/醫師/)).toHaveValue('中慈 Dr彭');
  });

  it('可以改 SIA 值並存檔', async () => {
    const onSave = vi.fn();
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={onSave} />);
    const sia = screen.getByLabelText(/SIA 度數/);
    await userEvent.clear(sia);
    await userEvent.type(sia, '0.3');
    await userEvent.click(screen.getByRole('button', { name: /儲存/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ defaultSIA: 0.3 }));
  });

  it('可以在 K 與 TK 之間切換', async () => {
    const onSave = vi.fn();
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByLabelText(/角膜屈光度來源/), 'TK');
    await userEvent.click(screen.getByRole('button', { name: /儲存/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ keratometrySource: 'TK' }));
  });

  it('沒有任何病患資料輸入欄位', () => {
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/病患姓名/)).toBeNull();
    expect(screen.queryByLabelText(/病歷號/)).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/sidepanel/components/ProfileForm.test.tsx`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/sidepanel/components/ProfileForm.tsx`**

```tsx
import { useState } from 'react';
import type { ClinicProfile } from '../../lib/profile';
import { TORIC_FAMILIES } from '../../lib/lens-constants';

interface Props {
  profile: ClinicProfile;
  onSave: (profile: ClinicProfile) => void;
}

export function ProfileForm({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<ClinicProfile>(profile);

  const set = <K extends keyof ClinicProfile>(key: K, value: ClinicProfile[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="mt-4 space-y-3 text-sm"
      onSubmit={(e) => { e.preventDefault(); onSave(draft); }}
    >
      <div>
        <label htmlFor="surgeon" className="block mb-1">醫師名稱</label>
        <input
          id="surgeon" type="text" value={draft.surgeonName}
          onChange={(e) => set('surgeonName', e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1"
        />
      </div>

      <div>
        <label htmlFor="sia" className="block mb-1">SIA 度數 (D)</label>
        <input
          id="sia" type="number" step="0.01" value={draft.defaultSIA}
          onChange={(e) => set('defaultSIA', Number(e.target.value))}
          className="w-full border border-slate-300 rounded px-2 py-1"
        />
      </div>

      <div>
        <label htmlFor="siaAxis" className="block mb-1">SIA 軸位 (度)</label>
        <input
          id="siaAxis" type="number" step="1" value={draft.defaultSIAAxis}
          onChange={(e) => set('defaultSIAAxis', Number(e.target.value))}
          className="w-full border border-slate-300 rounded px-2 py-1"
        />
      </div>

      <div>
        <label htmlFor="ksource" className="block mb-1">角膜屈光度來源</label>
        <select
          id="ksource" value={draft.keratometrySource}
          onChange={(e) => set('keratometrySource', e.target.value as 'K' | 'TK')}
          className="w-full border border-slate-300 rounded px-2 py-1"
        >
          <option value="K">K（前表面）</option>
          <option value="TK">TK（含後表面）</option>
        </select>
      </div>

      <div>
        <label htmlFor="lens" className="block mb-1">預設散光片系列</label>
        <select
          id="lens" value={draft.preferredLensFamily}
          onChange={(e) => set('preferredLensFamily', e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1"
        >
          {TORIC_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="w-full rounded bg-slate-700 text-white py-2">
        儲存設定
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/sidepanel/components/ProfileForm.test.tsx`
Expected: PASS，4 passed

- [ ] **Step 5: Commit**

```bash
git add elden-iol/src/sidepanel/components/ProfileForm.tsx elden-iol/src/sidepanel/components/ProfileForm.test.tsx
git commit -m "feat(elden-iol): 診所設定編輯畫面"
```

---

### Task 12: 串接與端到端驗證

**Files:**
- Create: `elden-iol/src/content/index.ts`（取代 Task 1 的空殼）
- Create: `elden-iol/src/lib/messages.ts`
- Modify: `elden-iol/src/sidepanel/App.tsx`
- Modify: `elden-iol/src/background/index.ts`
- Test: `elden-iol/src/lib/messages.test.ts`

**Interfaces:**
- Consumes: 前面所有任務
- Produces:
  - `type FillRequest = { type: 'FILL_FORM'; values: FormValues; options: FormOptions }`
  - `type FillResponse = { type: 'FILL_RESULT'; report: FillReport }`
  - `sendFillRequest(values, options): Promise<FillReport>`

- [ ] **Step 1: 寫失敗的測試 `src/lib/messages.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendFillRequest } from './messages';
import type { FormValues, FormOptions } from './mapping';

const values: FormValues = {
  patientName: '', patientId: '', surgeonName: '中慈 Dr彭', date: '17/07/2026',
  flatK: 43.08, flatKAxis: 96, steepK: 45.58, steepKAxis: 6,
  al: 24.49, acd: 3.15, aConstant: 119.39, lensFactor: 2.09, sia: 0.2, siaAxis: 135,
};
const options: FormOptions = { kIndex: 1.3375, cylinderConvention: 'negative' };

beforeEach(() => vi.restoreAllMocks());

describe('sendFillRequest', () => {
  it('把訊息送到目前作用中的 ASCRS 分頁', async () => {
    const sendMessage = vi.fn(async () => ({ type: 'FILL_RESULT', report: { filled: 14, total: 14, failures: [] } }));
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [{ id: 7, url: 'https://www.ascrs.org/tools/barrett-toric-calculator' }]),
        sendMessage,
      },
    });
    const report = await sendFillRequest(values, options);
    expect(sendMessage).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'FILL_FORM' }));
    expect(report.filled).toBe(14);
  });

  it('找不到 ASCRS 分頁時，給出可行動的錯誤訊息', async () => {
    vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => []), sendMessage: vi.fn() } });
    await expect(sendFillRequest(values, options)).rejects.toThrow(/Barrett Toric Calculator/);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd elden-iol && npx vitest run src/lib/messages.test.ts`
Expected: FAIL — 找不到模組

- [ ] **Step 3: 實作 `src/lib/messages.ts`**

```ts
import type { FormValues, FormOptions } from './mapping';
import type { FillReport } from '../content/fill';

export interface FillRequest {
  type: 'FILL_FORM';
  values: FormValues;
  options: FormOptions;
}

export interface FillResponse {
  type: 'FILL_RESULT';
  report: FillReport;
}

const ASCRS_URL_PATTERN = 'https://www.ascrs.org/tools/barrett-toric-calculator*';

export async function sendFillRequest(
  values: FormValues,
  options: FormOptions,
): Promise<FillReport> {
  const tabs = await chrome.tabs.query({ url: ASCRS_URL_PATTERN });
  const tab = tabs[0];

  if (tab?.id === undefined) {
    throw new Error('請先在另一個分頁打開 ASCRS Barrett Toric Calculator，再按填入。');
  }

  const request: FillRequest = { type: 'FILL_FORM', values, options };
  const response = (await chrome.tabs.sendMessage(tab.id, request)) as FillResponse;
  return response.report;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd elden-iol && npx vitest run src/lib/messages.test.ts`
Expected: PASS，2 passed

- [ ] **Step 5: 實作 `src/content/index.ts`**

```ts
import { fillForm } from './fill';
import type { FillRequest, FillResponse } from '../lib/messages';

chrome.runtime.onMessage.addListener((message: FillRequest, _sender, sendResponse) => {
  if (message.type !== 'FILL_FORM') return false;

  const report = fillForm(message.values, document);
  const response: FillResponse = { type: 'FILL_RESULT', report };
  sendResponse(response);
  return true;
});
```

- [ ] **Step 6: 更新 `src/sidepanel/App.tsx` 串起完整流程**

```tsx
import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Disclaimer } from './components/Disclaimer';
import { WarningBanner } from './components/WarningBanner';
import { EyeSelector } from './components/EyeSelector';
import { ReviewTable } from './components/ReviewTable';
import { ProfileForm } from './components/ProfileForm';
import { recognizeImage } from './api';
import { loadProfile, saveProfile, DEFAULT_PROFILE, type ClinicProfile } from '../lib/profile';
import { mapToFormValues } from '../lib/mapping';
import { sendFillRequest } from '../lib/messages';
import type { RecognitionResult } from '../lib/schema';

export function App() {
  const [profile, setProfile] = useState<ClinicProfile>(DEFAULT_PROFILE);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [eyeIndex, setEyeIndex] = useState<number | null>(null);

  useEffect(() => { void loadProfile().then(setProfile); }, []);

  const handleFile = async (file: File) => {
    setBusy(true); setError(null); setStatus(null); setResult(null); setEyeIndex(null);
    try {
      setResult(await recognizeImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '辨識失敗，請重試');
    } finally {
      setBusy(false);
    }
  };

  const handleFill = async () => {
    if (result === null || eyeIndex === null) return;
    const eye = result.eyes[eyeIndex];
    if (eye === undefined) return;
    const mapping = mapToFormValues(eye, profile, new Date());
    try {
      const report = await sendFillRequest(mapping.values, mapping.options);
      setStatus(
        report.failures.length === 0
          ? `已填入 ${report.filled} 個欄位。請自行核對後按下官網的 Calculate。`
          : `填入 ${report.filled}/${report.total} 個欄位，${report.failures.length} 個失敗，請手動補上。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '填入失敗');
    }
  };

  const selectedEye = eyeIndex === null ? null : result?.eyes[eyeIndex] ?? null;

  return (
    <div className="p-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">IOL 報告單代填</h1>
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="text-xs underline">
          {showSettings ? '返回' : '設定'}
        </button>
      </div>

      {showSettings ? (
        <ProfileForm
          profile={profile}
          onSave={(p) => { setProfile(p); void saveProfile(p); setShowSettings(false); }}
        />
      ) : (
        <>
          <Dropzone onFile={(f) => { void handleFile(f); }} disabled={busy} />
          {busy && <p className="mt-3 text-sm text-slate-600">辨識中…</p>}

          {error !== null && (
            <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>
          )}
          {status !== null && (
            <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">{status}</p>
          )}

          {result !== null && (
            <>
              <WarningBanner
                warnings={result.warnings}
                borderlineFields={
                  selectedEye === null
                    ? []
                    : Object.entries(selectedEye)
                        .filter(([, v]) => typeof v === 'object' && v !== null && 'borderline' in v && v.borderline)
                        .map(([k]) => k.toUpperCase())
                }
              />
              <EyeSelector eyes={result.eyes} selected={eyeIndex} onSelect={setEyeIndex} />
              {selectedEye !== null && (
                <ReviewTable
                  eye={selectedEye}
                  mapping={mapToFormValues(selectedEye, profile, new Date())}
                  threshold={profile.confidenceThreshold}
                  onConfirm={() => { void handleFill(); }}
                />
              )}
            </>
          )}
        </>
      )}

      <Disclaimer />
    </div>
  );
}
```

- [ ] **Step 7: 執行全部測試**

Run: `cd elden-iol && npm test`
Expected: 全部 PASS

- [ ] **Step 8: 建置並手動端到端驗證**

Run: `cd elden-iol && npm run build`

手動步驟（無法自動化，必須人工執行）：
1. `chrome://extensions` 載入 `dist/`
2. 新分頁開 `https://www.ascrs.org/tools/barrett-toric-calculator`，等 Cloudflare 過、切到 Toric IOL 頁籤
3. 在該分頁的 Console 貼上 `elden-iol/tools/ascrs-probe.js`，把輸出的真實欄位 id 補進 `src/content/selectors.ts` 的 `FieldLocator.id`
4. 再貼上 `elden-iol/tools/ascrs-filltest.js`，確認寫值不會被框架還原；若被還原，調整 `fireInputEvents` 的事件組合
5. 重新 `npm run build` 並在 `chrome://extensions` 按重新載入
6. 點擴充功能圖示開側邊欄，設定醫師名稱與 SIA 0.2 @ 135
7. 拖入 `elden-iol/docs/samples/iolmaster700_report_sample.jpg`
8. 確認警告橫幅顯示眼軸不一致警告、AL 與 WTW 標為臨界值
9. 選 OD，確認 A Constant 顯示 `119.3 → 119.39` 的替換說明
10. 按「填入計算器」，切到 ASCRS 分頁核對欄位

**驗收標準：** 官網欄位須為 Flat K 43.08@96、Steep K 45.58@6、AL 24.49、ACD 3.15、
A Constant 119.39、LF 2.09、SIA 0.2@135，且 **Calculate 未被自動觸發**。
手動按下 Calculate 後，結果應為 **17.5 D / DIU375 / 軸位 7°**，
與 `elden-iol/docs/samples/barrett_toric_result_sample.jpg` 一致。

- [ ] **Step 9: Commit**

```bash
git add elden-iol/src
git commit -m "feat(elden-iol): 串接側邊欄與 content script，完成端到端流程"
```

---

### Task 13: 黃金測試集

**前置條件：** 需要 Elden 提供 10–20 張去識別化的真實報告單。**在拿到樣本前不要開始這個任務。**

**Files:**
- Create: `elden-iol/tests/golden/README.md`
- Create: `elden-iol/tests/golden/cases/<case-id>.json`（每張報告單一個人工標註檔）
- Test: `elden-iol/tests/golden/accuracy.test.ts`

**Interfaces:**
- Consumes: `POST /api/recognize`（Task 8）
- Produces: 逐欄辨識正確率報告，作為專案品質的唯一客觀指標。

- [ ] **Step 1: 建立標註格式說明 `tests/golden/README.md`**

```markdown
# 黃金測試集

每個案例兩個檔案：
- `images/<case-id>.jpg` — 去識別化的報告單照片（**不進版控**，見 .gitignore）
- `cases/<case-id>.json` — 人工標註的正確值

標註檔格式：

{
  "caseId": "case-001",
  "device": "IOLMaster700",
  "expectedWarnings": ["OD: Axial length measurements slightly inconsistent."],
  "eyes": [
    { "laterality": "OD", "hasData": true,
      "al": 24.49, "acd": 3.15, "k1": 43.08, "k1Axis": 96, "k2": 45.58, "k2Axis": 6 }
  ]
}

只標註 Barrett Toric Calculator 實際會用到的欄位。
```

在 `elden-iol/.gitignore` 加入 `tests/golden/images/`——真實報告單即使去識別化也不進版控。

- [ ] **Step 2: 寫準確率測試 `tests/golden/accuracy.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST } from '../../api/recognize';

const here = path.dirname(fileURLToPath(import.meta.url));
const casesDir = path.join(here, 'cases');
const imagesDir = path.join(here, 'images');
const hasKey = typeof process.env['ANTHROPIC_API_KEY'] === 'string';
const caseFiles = fs.existsSync(casesDir)
  ? fs.readdirSync(casesDir).filter((f) => f.endsWith('.json'))
  : [];

interface GoldenEye {
  laterality: 'OD' | 'OS';
  hasData: boolean;
  al?: number; acd?: number;
  k1?: number; k1Axis?: number; k2?: number; k2Axis?: number;
}
interface GoldenCase {
  caseId: string;
  expectedWarnings: string[];
  eyes: GoldenEye[];
}

const NUMERIC_FIELDS = ['al', 'acd', 'k1', 'k1Axis', 'k2', 'k2Axis'] as const;

describe.skipIf(!hasKey || caseFiles.length === 0)('黃金測試集辨識準確率', () => {
  let totalFields = 0;
  let correctFields = 0;

  for (const file of caseFiles) {
    const golden = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf8')) as GoldenCase;

    it(`${golden.caseId} 每個欄位都正確`, async () => {
      const imageBase64 = fs
        .readFileSync(path.join(imagesDir, `${golden.caseId}.jpg`))
        .toString('base64');
      const res = await POST(
        new Request('http://localhost/api/recognize', {
          method: 'POST',
          body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
        }),
      );
      expect(res.status).toBe(200);
      const actual = await res.json();

      for (const goldenEye of golden.eyes) {
        const eye = actual.eyes.find(
          (e: { laterality: string }) => e.laterality === goldenEye.laterality,
        );
        expect(eye, `找不到 ${goldenEye.laterality}`).toBeDefined();
        expect(eye.hasData).toBe(goldenEye.hasData);
        if (!goldenEye.hasData) continue;

        for (const field of NUMERIC_FIELDS) {
          const expectedValue = goldenEye[field];
          if (expectedValue === undefined) continue;
          totalFields += 1;
          const ok = Math.abs(eye[field].value - expectedValue) < 0.005;
          if (ok) correctFields += 1;
          expect(
            eye[field].value,
            `${golden.caseId} ${goldenEye.laterality}.${field}`,
          ).toBeCloseTo(expectedValue, 2);
        }
      }

      for (const warning of golden.expectedWarnings) {
        const key = warning.slice(0, 25);
        expect(actual.warnings.join(' '), `漏掉警告：${warning}`).toContain(key);
      }
    }, 120_000);
  }

  it('整體逐欄正確率達 99% 以上', () => {
    expect(correctFields / totalFields).toBeGreaterThanOrEqual(0.99);
  });
});
```

- [ ] **Step 3: 標註至少 10 個案例**

把 Elden 提供的報告單放進 `tests/golden/images/`，逐張人工比對建立對應的 `cases/*.json`。
**標註必須由人工完成，不得用模型自己的輸出當作正確答案。**

- [ ] **Step 4: 執行準確率測試**

Run: `cd elden-iol && ANTHROPIC_API_KEY=<key> npx vitest run tests/golden/`
Expected: 逐欄正確率 ≥ 99%。未達標時調整 `api/prompt.ts` 再重跑，
並把調整前後的正確率記錄在 `tests/golden/README.md`。

- [ ] **Step 5: Commit**

```bash
git add elden-iol/tests/golden/README.md elden-iol/tests/golden/cases \
        elden-iol/tests/golden/accuracy.test.ts elden-iol/.gitignore
git commit -m "test(elden-iol): 黃金測試集與辨識準確率門檻"
```
