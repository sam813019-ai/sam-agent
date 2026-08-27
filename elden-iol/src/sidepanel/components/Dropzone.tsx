import { useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  disabled: boolean;
}

export function Dropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file !== undefined) onFile(file);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); }}
      onPaste={(e) => { take(e.clipboardData.files); }}
      className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
        ${dragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => take(e.target.files)}
      />
      <span className="text-sm text-slate-600">
        把報告單照片拖進來，或點擊選擇檔案
      </span>
      <span className="block mt-1 text-xs text-slate-400">
        也可以直接貼上（Ctrl/⌘ + V）
      </span>
    </label>
  );
}
