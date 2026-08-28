import type { EyeData } from '../../lib/schema';

interface Props {
  eyes: EyeData[];
  selected: number | null;
  onSelect: (index: number) => void;
}

export function EyeSelector({ eyes, selected, onSelect }: Props) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium mb-1">請確認要代填哪一隻眼</p>
      <div className="flex gap-2">
        {eyes.map((eye, i) => (
          <button
            key={eye.laterality}
            type="button"
            disabled={!eye.hasData}
            onClick={() => onSelect(i)}
            className={`flex-1 rounded border py-2 text-sm
              ${selected === i ? 'border-sky-600 bg-sky-50 font-medium' : 'border-slate-300'}
              disabled:opacity-40`}
          >
            {eye.laterality}（{eye.laterality === 'OD' ? '右眼' : '左眼'}）
            {!eye.hasData && <span className="block text-xs">無資料</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
