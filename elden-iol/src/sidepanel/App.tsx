import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Disclaimer } from './components/Disclaimer';
import { WarningBanner } from './components/WarningBanner';
import { EyeSelector } from './components/EyeSelector';
import { ReviewTable } from './components/ReviewTable';
import { ProfileForm } from './components/ProfileForm';
import { recognizeImage } from './api';
import { mapToFormValues } from '../lib/mapping';
import { sendFillRequest } from '../lib/messages';
import { DEFAULT_PROFILE, loadProfile, saveProfile, type ClinicProfile } from '../lib/profile';
import type { EyeData, RecognitionResult } from '../lib/schema';

/** 報告單上被儀器標了 (!) 的欄位，逐一列名給使用者看 */
function borderlineFieldsOf(eye: EyeData): string[] {
  const labelled: [string, { borderline: boolean }][] = [
    ['AL', eye.al], ['ACD', eye.acd], ['LT', eye.lt], ['WTW', eye.wtw],
    ['K1', eye.k1], ['K2', eye.k2], ['TK1', eye.tk1], ['TK2', eye.tk2],
  ];
  return labelled.filter(([, m]) => m.borderline).map(([name]) => name);
}

export function App() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [selectedEye, setSelectedEye] = useState<number | null>(null);
  const [profile, setProfile] = useState<ClinicProfile>(DEFAULT_PROFILE);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProfile().then(setProfile).catch(() => setProfile(DEFAULT_PROFILE));
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    setResult(null);
    setSelectedEye(null);
    try {
      setResult(await recognizeImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '辨識失敗，請重試');
    } finally {
      setBusy(false);
    }
  };

  // 眼別一律由使用者明確選擇，不預選 —— 選錯眼睛等同幫錯病人算度數
  const eye = result !== null && selectedEye !== null ? result.eyes[selectedEye] : undefined;

  const handleFill = async () => {
    if (eye === undefined) return;
    const mapping = mapToFormValues(eye, profile);
    setError(null);
    try {
      const report = await sendFillRequest(mapping.values, mapping.options);

      if (report.kOrientation === 'steep-first') {
        setError('計算器上第一組 K 欄位標示為陡軸，與本工具的預設相反，已停止填入 K 值以免填反。請人工填寫 K 值並回報這個狀況。');
        return;
      }
      setStatus(
        report.failures.length === 0
          ? `已填入 ${report.filled} 個欄位。請自行核對，並記得選擇 IOL 型號，再按官網的 Calculate。`
          : `填入 ${report.filled}/${report.total} 個欄位，${report.failures.length} 個沒填成功（${report.failures.map((f) => f.field).join('、')}），請手動補上。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '填入失敗');
    }
  };

  return (
    <div className="p-4 font-sans">
      <div className="flex items-center justify-between mb-3">
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
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}
      {status !== null && (
        <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">
          {status}
        </p>
      )}

      {result !== null && (
        <>
          <WarningBanner
            warnings={result.warnings}
            borderlineFields={eye === undefined ? [] : borderlineFieldsOf(eye)}
          />
          <EyeSelector eyes={result.eyes} selected={selectedEye} onSelect={setSelectedEye} />
        </>
      )}

      {eye !== undefined && (
        <ReviewTable
          eye={eye}
          mapping={mapToFormValues(eye, profile)}
          threshold={profile.confidenceThreshold}
          onConfirm={() => { void handleFill(); }}
        />
      )}
      </>
      )}

      <Disclaimer />
    </div>
  );
}
