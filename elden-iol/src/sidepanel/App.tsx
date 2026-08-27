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
