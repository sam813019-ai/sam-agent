import { useState } from 'react';
import { COMMON_SIA_PRESETS, type ClinicProfile } from '../../lib/profile';

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
        <p className="mb-1">常用 SIA</p>
        <div className="flex gap-2 mb-2">
          {COMMON_SIA_PRESETS.map((p) => (
            <button
              key={`${p.sia}-${p.axis}`}
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, defaultSIA: p.sia, defaultSIAAxis: p.axis }))}
              className={`flex-1 rounded border py-1 text-xs
                ${draft.defaultSIA === p.sia && draft.defaultSIAAxis === p.axis
                  ? 'border-sky-600 bg-sky-50 font-medium'
                  : 'border-slate-300'}`}
            >
              {p.sia} D @ {p.axis}°
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          切口軸位每位醫師、每隻眼可能不同，這裡設的是預設值，代填前仍可在確認畫面調整。
        </p>
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

      {/*
        刻意不提供「預設散光片系列」下拉。
        客戶 2026-08-27 決定 A Constant 與 Lens Factor 由醫師在官網的 IOL Model 自選，
        代填不碰那兩欄，因此設定檔的 preferredLensFamily 目前沒有作用。
      */}

      <button type="submit" className="w-full rounded bg-slate-700 text-white py-2">
        儲存設定
      </button>
    </form>
  );
}
