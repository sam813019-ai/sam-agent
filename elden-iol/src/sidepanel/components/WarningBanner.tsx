interface Props {
  warnings: string[];
  borderlineFields: string[];
}

export function WarningBanner({ warnings, borderlineFields }: Props) {
  if (warnings.length === 0 && borderlineFields.length === 0) return null;

  return (
    <div className="mt-3 border-2 border-red-400 bg-red-50 rounded p-3">
      <p className="text-sm font-bold text-red-800 mb-2">⚠️ 儀器警告，請先確認</p>
      {warnings.map((w) => (
        <p key={w} className="text-sm text-red-800 mb-1">{w}</p>
      ))}
      {borderlineFields.length > 0 && (
        <p className="text-sm text-red-800">
          臨界值 (!) 欄位：{borderlineFields.join('、')}
        </p>
      )}
    </div>
  );
}
