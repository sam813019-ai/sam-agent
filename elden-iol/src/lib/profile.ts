export interface ClinicProfile {
  surgeonName: string;
  defaultSIA: number;
  defaultSIAAxis: number;
  keratometrySource: 'K' | 'TK';
  kIndex: 1.3375 | 1.332;
  cylinderConvention: 'positive' | 'negative';
  /**
   * ⚠️ 2026-08-27 起未接線：客戶決定 A Constant / Lens Factor 由醫師在官網自選，
   * 代填不碰這兩欄。欄位保留以免既有設定檔讀取失敗；Task 11 的設定畫面不應為它做 UI。
   */
  preferredLensFamily: string;
  /** 低於此信心值的欄位，UI 強制人工確認 */
  confidenceThreshold: number;
}

export const DEFAULT_PROFILE: ClinicProfile = {
  surgeonName: '',
  defaultSIA: 0.2,
  defaultSIAAxis: 0,
  keratometrySource: 'K',
  kIndex: 1.3375,
  cylinderConvention: 'negative',
  preferredLensFamily: 'JJ_DIU',
  confidenceThreshold: 0.9,
};

export interface SIAPreset {
  sia: number;
  axis: number;
}

/**
 * 客戶（2026-08-27）回報實務上最常用的兩組 SIA 與切口軸位。
 * 是否固定對應眼別尚未確認，故僅作為 UI 快捷鍵，不自動依眼別帶入。
 */
export const COMMON_SIA_PRESETS: SIAPreset[] = [
  { sia: 0.2, axis: 180 },
  { sia: 0.2, axis: 0 },
];

const STORAGE_KEY = 'clinicProfile';

export async function loadProfile(): Promise<ClinicProfile> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<ClinicProfile> | undefined;
  return { ...DEFAULT_PROFILE, ...(stored ?? {}) };
}

export async function saveProfile(profile: ClinicProfile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: profile });
}
