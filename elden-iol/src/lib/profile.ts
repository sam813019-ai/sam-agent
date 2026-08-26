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
