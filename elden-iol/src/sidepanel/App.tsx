import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Disclaimer } from './components/Disclaimer';
import { WarningBanner } from './components/WarningBanner';
import { EyeSelector } from './components/EyeSelector';
import { ReviewTable } from './components/ReviewTable';
import { recognizeImage } from './api';
import { mapToFormValues } from '../lib/mapping';
import { DEFAULT_PROFILE, loadProfile, type ClinicProfile } from '../lib/profile';
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

  useEffect(() => {
    loadProfile().then(setProfile).catch(() => setProfile(DEFAULT_PROFILE));
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
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
          onConfirm={() => { /* Task 12：透過 chrome.tabs 訊息呼叫 content script 寫入 */ }}
        />
      )}

      <Disclaimer />
    </div>
  );
}
