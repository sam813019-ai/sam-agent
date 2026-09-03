import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadPresets, savePreset, deletePreset, type MaskPreset } from './mask-presets';

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

const preset = (name: string): MaskPreset => ({
  name,
  regions: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.1 }],
});

describe('遮罩版面記憶', () => {
  it('第一次載入時是空的', async () => {
    expect(await loadPresets()).toEqual([]);
  });

  it('存檔後讀得回來', async () => {
    await savePreset(preset('IOLMaster 700'));
    expect(await loadPresets()).toEqual([preset('IOLMaster 700')]);
  });

  it('同名再存是覆寫而不是新增一筆', async () => {
    await savePreset(preset('IOLMaster 700'));
    await savePreset({ name: 'IOLMaster 700', regions: [{ x: 0, y: 0, w: 1, h: 0.5 }] });
    const all = await loadPresets();
    expect(all).toHaveLength(1);
    expect(all[0]!.regions[0]!.h).toBe(0.5);
  });

  it('不同名字各自保存', async () => {
    await savePreset(preset('IOLMaster 700'));
    await savePreset(preset('NIDEK AL-Scan'));
    expect((await loadPresets()).map((p) => p.name)).toEqual(['IOLMaster 700', 'NIDEK AL-Scan']);
  });

  it('可以刪除某一組', async () => {
    await savePreset(preset('A'));
    await savePreset(preset('B'));
    await deletePreset('A');
    expect((await loadPresets()).map((p) => p.name)).toEqual(['B']);
  });

  it('存的是遮罩座標，絕不含影像內容', async () => {
    await savePreset(preset('IOLMaster 700'));
    const raw = JSON.stringify(store);
    expect(raw).not.toContain('base64');
    expect(raw).not.toContain('data:image');
  });
});
