import { useState } from 'react';
import type { EyeData, NumericMeasurement } from '../../lib/schema';
import type { MappingResult, FormValues } from '../../lib/mapping';

interface Props {
  eye: EyeData;
  mapping: MappingResult;
  threshold: number;
  onConfirm: () => void;
}

interface Row {
  key: string;
  label: string;
  source: NumericMeasurement;
  target: keyof FormValues;
}

/** 顯示「將填入」欄；LT/WTW 讀不到時是 null，要明講留空而不是顯示 0 */
function displayValue(value: FormValues[keyof FormValues]): string {
  if (value === null) return '（留空）';
  if (value === '') return '（不填）';
  return String(value);
}

export function ReviewTable({ eye, mapping, threshold, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  // 這張表要涵蓋每一個會被寫進計算器的值，使用者才有機會攔下錯誤。
  // 軸位獨立成列：軸位填錯等同散光算錯，不能只核對度數。
  const rows: Row[] = [
    { key: 'al', label: 'AL 眼軸長', source: eye.al, target: 'al' },
    { key: 'acd', label: 'ACD 前房深度', source: eye.acd, target: 'acd' },
    { key: 'k1', label: 'K1（平軸）', source: eye.k1, target: 'flatK' },
    { key: 'k1Axis', label: 'K1 軸位', source: eye.k1Axis, target: 'flatKAxis' },
    { key: 'k2', label: 'K2（陡軸）', source: eye.k2, target: 'steepK' },
    { key: 'k2Axis', label: 'K2 軸位', source: eye.k2Axis, target: 'steepKAxis' },
    { key: 'lt', label: 'LT 水晶體厚度', source: eye.lt, target: 'lt' },
    { key: 'wtw', label: 'WTW 角膜橫徑', source: eye.wtw, target: 'wtw' },
    { key: 'targetRefraction', label: '目標屈光度', source: eye.targetRefraction, target: 'targetRefraction' },
  ];

  const lowConfidence = rows.filter((r) => r.source.confidence < threshold);
  const allConfirmed = lowConfidence.every((r) => confirmed.has(r.key));
  const blocked = mapping.blockers.length > 0;
  const canFill = allConfirmed && !blocked;

  const toggle = (key: string) => {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-1">欄位</th>
            <th className="py-1">紙上讀到</th>
            <th className="py-1">將填入</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const low = r.source.confidence < threshold;
            return (
              <tr
                key={r.key}
                className={low && !confirmed.has(r.key) ? 'bg-amber-50' : ''}
                data-testid={`row-${r.key}`}
              >
                <td className="py-1">{r.label}</td>
                <td className="py-1 font-mono text-xs text-slate-600">{r.source.rawText}</td>
                <td className="py-1 font-mono" data-testid={low ? `low-confidence-${r.key}` : undefined}>
                  {displayValue(mapping.values[r.target])}
                  {low && (
                    <button
                      type="button"
                      data-testid={`confirm-${r.key}`}
                      onClick={() => toggle(r.key)}
                      className="ml-2 text-xs underline text-amber-800"
                    >
                      {confirmed.has(r.key) ? '已確認' : '我已核對'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {mapping.substitutions.map((s) => (
        <p
          key={s.field}
          data-testid={`substitution-${s.field}`}
          className="mt-2 text-xs text-sky-800 bg-sky-50 rounded p-2"
        >
          {s.field}：{s.from} → {s.to}（{s.reason}）
        </p>
      ))}

      {mapping.blockers.map((b) => (
        <p key={b} className="mt-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded p-2">
          {b}
        </p>
      ))}

      <button
        type="button"
        disabled={!canFill}
        onClick={onConfirm}
        className="mt-4 w-full rounded bg-sky-600 text-white py-2 text-sm font-medium disabled:bg-slate-300"
      >
        填入計算器（不會自動計算）
      </button>
    </div>
  );
}
