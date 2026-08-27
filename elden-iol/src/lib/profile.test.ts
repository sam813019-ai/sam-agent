import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_PROFILE, COMMON_SIA_PRESETS, loadProfile, saveProfile } from './profile';

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

  it('SIA 預設軸位與官網預設一致（0），不是憑空編的值', () => {
    expect(DEFAULT_PROFILE.defaultSIA).toBe(0.2);
    expect(DEFAULT_PROFILE.defaultSIAAxis).toBe(0);
  });

  it('提供客戶實務上兩組常用 SIA 快捷（0.2@180 與 0.2@0）', () => {
    expect(COMMON_SIA_PRESETS).toEqual([
      { sia: 0.2, axis: 180 },
      { sia: 0.2, axis: 0 },
    ]);
  });

  it('預設不儲存任何病患資料欄位', () => {
    expect(Object.keys(DEFAULT_PROFILE)).not.toContain('patientName');
    expect(Object.keys(DEFAULT_PROFILE)).not.toContain('patientId');
  });
});
