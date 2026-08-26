import type { EyeData, NumericMeasurement } from './schema';
import type { ClinicProfile } from './profile';
import { lookupToricFamily, getFamilyById } from './lens-constants';

export interface FormValues {
  patientName: string;
  patientId: string;
  surgeonName: string;
  flatK: number;
  flatKAxis: number;
  steepK: number;
  steepKAxis: number;
  al: number;
  acd: number;
  aConstant: number;
  lensFactor: number;
  sia: number;
  siaAxis: number;
  targetRefraction: number;
}

export interface FormOptions {
  kIndex: 1.3375 | 1.332;
  cylinderConvention: 'positive' | 'negative';
}

export interface Substitution {
  field: keyof FormValues;
  from: string;
  to: string;
  reason: string;
}

export interface MappingResult {
  values: FormValues;
  options: FormOptions;
  substitutions: Substitution[];
  blockers: string[];
}

/** 依角膜屈光度大小判定平／陡，不信任 K1/K2 的編號順序 */
function orderKeratometry(
  a: NumericMeasurement, aAxis: NumericMeasurement,
  b: NumericMeasurement, bAxis: NumericMeasurement,
) {
  const av = a.value;
  const bv = b.value;
  if (av === null || bv === null) return null;
  return av <= bv
    ? { flat: av, flatAxis: aAxis.value, steep: bv, steepAxis: bAxis.value }
    : { flat: bv, flatAxis: bAxis.value, steep: av, steepAxis: aAxis.value };
}

export function mapToFormValues(
  eye: EyeData,
  profile: ClinicProfile,
): MappingResult {
  const blockers: string[] = [];
  const substitutions: Substitution[] = [];

  if (!eye.hasData) {
    blockers.push(`${eye.laterality} 這隻眼沒有量測資料（狀態：${eye.status}），無法代填。`);
  }

  // --- 角膜屈光度 ---
  const useTK = profile.keratometrySource === 'TK';
  const pair = useTK
    ? orderKeratometry(eye.tk1, eye.tk1Axis, eye.tk2, eye.tk2Axis)
    : orderKeratometry(eye.k1, eye.k1Axis, eye.k2, eye.k2Axis);

  if (pair === null) {
    blockers.push(
      useTK
        ? '設定為使用 TK（含後表面），但報告單沒有 TK 值。請改用 K 或重新量測。'
        : '報告單缺少 K1/K2 角膜屈光度。',
    );
  }
  if (pair !== null && (pair.flatAxis === null || pair.steepAxis === null)) {
    blockers.push('角膜屈光度缺少軸位。');
  }

  // --- 眼軸與前房 ---
  if (eye.al.value === null) blockers.push('報告單缺少 AL（眼軸長）。');
  if (eye.acd.value === null) blockers.push('報告單缺少 ACD（前房深度）。');

  // --- 鏡片常數：報告單印的是非散光片，官網要散光片 ---
  const raw = eye.lensModel.value;
  const matched = raw === null ? null : lookupToricFamily(raw);
  const family = matched ?? getFamilyById(profile.preferredLensFamily);

  if (family === null) {
    blockers.push(`認不出鏡片型號「${raw ?? '(未讀到)'}」，且設定檔的預設散光片系列無效。`);
  } else if (matched === null) {
    blockers.push(`未能從報告單確認鏡片型號「${raw ?? '(未讀到)'}」，已改用設定檔的預設系列 ${family.label}，請人工確認。`);
  }

  if (family !== null && eye.aConstant.value !== family.aConstant) {
    substitutions.push({
      field: 'aConstant',
      from: eye.aConstant.value === null ? '(未讀到)' : eye.aConstant.rawText,
      to: String(family.aConstant),
      reason: `報告單上的常數屬於非散光片；官網需使用 ${family.label} 的散光片常數`,
    });
  }

  if (family !== null) {
    substitutions.push({
      field: 'lensFactor',
      from: '(報告單為非散光片 LF)',
      to: String(family.lensFactor),
      reason: `官網需使用 ${family.label} 的散光片 Lens Factor`,
    });
  }

  // --- SIA：報告單沒有這個欄位 ---
  substitutions.push({
    field: 'sia',
    from: '(報告單無此欄位)',
    to: `${profile.defaultSIA} D @ ${profile.defaultSIAAxis}°`,
    reason: '手術誘發散光取自診所設定檔',
  });

  // --- 目標屈光度：讀不到就用平光 0 D 當安全預設，並揭露 ---
  if (eye.targetRefraction.value === null) {
    substitutions.push({
      field: 'targetRefraction',
      from: '(未讀到)',
      to: '0',
      reason: '報告單未讀到目標屈光度，採用平光 0 D',
    });
  }

  const values: FormValues = {
    patientName: '',
    patientId: '',
    surgeonName: profile.surgeonName,
    flatK: pair?.flat ?? 0,
    flatKAxis: pair?.flatAxis ?? 0,
    steepK: pair?.steep ?? 0,
    steepKAxis: pair?.steepAxis ?? 0,
    al: eye.al.value ?? 0,
    acd: eye.acd.value ?? 0,
    aConstant: family?.aConstant ?? 0,
    lensFactor: family?.lensFactor ?? 0,
    sia: profile.defaultSIA,
    siaAxis: profile.defaultSIAAxis,
    targetRefraction: eye.targetRefraction.value ?? 0,
  };

  return {
    values,
    options: { kIndex: profile.kIndex, cylinderConvention: profile.cylinderConvention },
    substitutions,
    blockers,
  };
}
