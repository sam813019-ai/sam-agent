import { useEffect, useRef, useState } from 'react';
import type { Region } from '../../lib/redact';
import { redactImage } from '../../lib/redact';
import { rectFromDrag, type Point } from '../../lib/mask-geometry';
import { loadPresets, savePreset, type MaskPreset } from '../../lib/mask-presets';

interface Props {
  file: File;
  onConfirm: (regions: Region[]) => void;
  onCancel: () => void;
}

/**
 * 送出前的遮蔽與預覽。畫面上顯示的就是會被送出去的圖 ——
 * 遮蔽從「系統聲稱有做」變成「使用者親眼確認過」。
 */
export function MaskEditor({ file, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [presets, setPresets] = useState<MaskPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [acknowledgedNoMask, setAcknowledgedNoMask] = useState(false);

  useEffect(() => { void loadPresets().then(setPresets); }, []);

  // 每次遮罩變動就整張重畫 —— 畫面上看到的必須等於送出去的
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bitmap = bitmapRef.current ?? await createImageBitmap(file);
      if (cancelled) return;
      bitmapRef.current = bitmap;
      const canvas = canvasRef.current;
      if (canvas === null) return;
      const masked = redactImage(bitmap, bitmap.width, bitmap.height, regions);
      canvas.width = masked.width;
      canvas.height = masked.height;
      canvas.getContext('2d')?.drawImage(masked, 0, 0);
    })();
    return () => { cancelled = true; };
  }, [file, regions]);

  const pointIn = (e: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const boxOf = (): { width: number; height: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  const finishDrag = (e: { clientX: number; clientY: number }) => {
    if (dragStart === null) return;
    const region = rectFromDrag(dragStart, pointIn(e), boxOf());
    setDragStart(null);
    if (region !== null) {
      setRegions((prev) => [...prev, region]);
      setAcknowledgedNoMask(false);
    }
  };

  const applyPreset = (name: string) => {
    const found = presets.find((p) => p.name === name);
    if (found !== undefined) setRegions(found.regions);
  };

  const needsAcknowledgement = regions.length === 0 && !acknowledgedNoMask;

  return (
    <div className="mt-3">
      <p className="text-sm font-medium">送出前先遮住個資</p>
      <p className="text-xs text-slate-500 mt-1 mb-2">
        在圖上拖曳畫出黑框，蓋住姓名、病歷號、生日。
        <strong>下方顯示的就是會送出去的圖。</strong>
      </p>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-slate-500 self-center">套用記住的位置：</span>
          {presets.map((p) => (
            <button
              key={p.name} type="button"
              onClick={() => applyPreset(p.name)}
              className="text-xs border border-slate-300 rounded px-2 py-0.5"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <canvas
        ref={canvasRef}
        data-testid="mask-canvas"
        className="w-full border border-slate-300 rounded cursor-crosshair"
        onMouseDown={(e) => setDragStart(pointIn(e))}
        onMouseUp={finishDrag}
      />

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-600" data-testid="mask-count">
          已遮 {regions.length} 個區域
        </span>
        <button
          type="button"
          onClick={() => { setRegions([]); setAcknowledgedNoMask(false); }}
          className="text-xs underline text-slate-600"
        >
          清除
        </button>
        {regions.length > 0 && (
          <button
            type="button"
            onClick={() => setRegions((prev) => prev.slice(0, -1))}
            className="text-xs underline text-slate-600"
          >
            復原上一個
          </button>
        )}
      </div>

      {regions.length > 0 && (
        <div className="flex gap-1 mt-2">
          <input
            type="text" value={presetName} placeholder="記住這組位置，取個名字（例如 IOLMaster 700）"
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1 text-xs border border-slate-300 rounded px-2 py-1"
          />
          <button
            type="button"
            disabled={presetName.trim() === ''}
            onClick={() => {
              const preset = { name: presetName.trim(), regions };
              void savePreset(preset).then(() => { void loadPresets().then(setPresets); });
              setPresetName('');
            }}
            className="text-xs border border-slate-300 rounded px-2 disabled:opacity-40"
          >
            記住
          </button>
        </div>
      )}

      {needsAcknowledgement && (
        <label className="flex items-start gap-2 mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded p-2">
          <input
            type="checkbox"
            data-testid="ack-no-mask"
            onChange={(e) => setAcknowledgedNoMask(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            這張照片沒有遮住任何區域。如果報告單上的姓名或病歷號已經先用紙蓋住或折起來，
            勾選後即可送出。
          </span>
        </label>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button" onClick={onCancel}
          className="flex-1 rounded border border-slate-300 py-2 text-sm"
        >
          換一張
        </button>
        <button
          type="button"
          disabled={needsAcknowledgement}
          onClick={() => onConfirm(regions)}
          className="flex-1 rounded bg-sky-600 text-white py-2 text-sm font-medium disabled:bg-slate-300"
        >
          確認送出辨識
        </button>
      </div>
    </div>
  );
}
