import type { Region } from './redact';

/**
 * 一組記住的遮罩位置。以「使用者自己取的名字」為鍵，而不是自動判斷機型 ——
 * 上傳前我們還不知道這是哪一台機器的報告（要辨識完才知道），
 * 而遮蔽必須發生在辨識之前。
 *
 * 只存座標，不存任何影像。
 */
export interface MaskPreset {
  name: string;
  regions: Region[];
}

const STORAGE_KEY = 'maskPresets';

export async function loadPresets(): Promise<MaskPreset[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as MaskPreset[] | undefined;
  return stored ?? [];
}

export async function savePreset(preset: MaskPreset): Promise<void> {
  const all = await loadPresets();
  const index = all.findIndex((p) => p.name === preset.name);
  if (index >= 0) all[index] = preset;
  else all.push(preset);
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
}

export async function deletePreset(name: string): Promise<void> {
  const all = (await loadPresets()).filter((p) => p.name !== name);
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
}
