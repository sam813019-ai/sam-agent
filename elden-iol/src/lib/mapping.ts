import type { EyeData, NumericMeasurement } from './schema';
import type { ClinicProfile } from './profile';

export interface FormValues {
  patientName: string;
  patientId: string;
  surgeonName: string;
  /**
   * 以下數值欄位一律可為 null，null 代表「這一格留白，由醫師自己填」。
   * 客戶 2026-09-01：「判別如果有疑慮，請他空下來，我手動填」。
   * 讀不到就留白，比填一個看起來合理但來源錯誤的數字安全得多。
   */
  flatK: number | null;
  flatKAxis: number | null;
  steepK: number | null;
  steepKAxis: number | null;
  al: number | null;
  acd: number | null;
  /** 官網為選填欄位；null 代表「不寫入這一欄」，絕不可退化成 0 */
  lt: number | null;
  /** 同上 */
  wtw: number | null;
  sia: number;
  siaAxis: number;
  targetRefraction: number | null;
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

  // 度數與軸位必須成套。少了任何一個就四格全留白 ——
  // 分不出平陡、或有度數沒軸位，填進去的散光都是錯的。
  const kUsable =
    pair !== null && pair.flatAxis !== null && pair.steepAxis !== null;

  if (!kUsable) {
    const reason = useTK
      ? '設定為使用 TK（含後表面），但報告單的 TK 值或軸位讀不完整，無法判定平／陡軸，四個 K 欄位皆留白，請人工填寫'
      : '報告單的 K 值或軸位讀不完整，無法判定平／陡軸，四個 K 欄位皆留白，請人工填寫';
    for (const field of ['flatK', 'flatKAxis', 'steepK', 'steepKAxis'] as const) {
      substitutions.push({ field, from: '(讀不完整)', to: '(留空)', reason });
    }
  }

  // --- 眼軸與前房：讀不到就留白，不擋其他欄位 ---
  if (eye.al.value === null) {
    substitutions.push({
      field: 'al', from: '(未讀到)', to: '(留空)',
      reason: '報告單未讀到 AL 眼軸長，請人工填寫',
    });
  }
  if (eye.acd.value === null) {
    substitutions.push({
      field: 'acd', from: '(未讀到)', to: '(留空)',
      reason: '報告單未讀到 ACD 前房深度，請人工填寫',
    });
  }

  // --- LT / WTW（官網選填）：讀不到就留空並揭露，不阻斷、不填 0 ---
  if (eye.lt.value === null) {
    substitutions.push({
      field: 'lt',
      from: '(未讀到)',
      to: '(留空)',
      reason: '報告單未讀到 LT 水晶體厚度，此欄為選填，留空不影響計算',
    });
  }
  if (eye.wtw.value === null) {
    substitutions.push({
      field: 'wtw',
      from: '(未讀到)',
      to: '(留空)',
      reason: '報告單未讀到 WTW 角膜橫徑，此欄為選填，留空不影響計算',
    });
  }

  // --- 鏡片常數：2026-08-27 客戶決定不代填 ---
  // A Constant 與 Lens Factor 由醫師在官網的 IOL Model 下拉自行選定。
  // 報告單上的鏡片型號與常數仍由 OCR 讀出（EyeData 保留），僅供畫面顯示參考，不進 FormValues。

  // --- SIA：報告單沒有這個欄位 ---
  substitutions.push({
    field: 'sia',
    from: '(報告單無此欄位)',
    to: `${profile.defaultSIA} D @ ${profile.defaultSIAAxis}°`,
    reason: '手術誘發散光取自診所設定檔',
  });

  // --- 目標屈光度：客戶指定預設 0（平光），這是他明確要求的行為，不是猜測 ---
  if (eye.targetRefraction.value === null) {
    substitutions.push({
      field: 'targetRefraction',
      from: '(未讀到)',
      to: '0',
      reason: '報告單未讀到目標屈光度，依客戶指定採用平光 0 D',
    });
  }

  const values: FormValues = {
    patientName: '',
    patientId: '',
    surgeonName: profile.surgeonName,
    flatK: kUsable ? pair.flat : null,
    flatKAxis: kUsable ? pair.flatAxis : null,
    steepK: kUsable ? pair.steep : null,
    steepKAxis: kUsable ? pair.steepAxis : null,
    al: eye.al.value,
    acd: eye.acd.value,
    lt: eye.lt.value,
    wtw: eye.wtw.value,
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
