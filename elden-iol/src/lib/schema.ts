import { z } from 'zod';

const measurement = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    borderline: z.boolean(),
    rawText: z.string(),
  });

export const NumericMeasurementSchema = measurement(z.number());
export const TextMeasurementSchema = measurement(z.string());

export const EyeDataSchema = z.object({
  laterality: z.enum(['OD', 'OS']),
  status: z.enum(['Phakic', 'Pseudophakic', 'Aphakic', 'unknown']),
  hasData: z.boolean(),
  al: NumericMeasurementSchema,
  acd: NumericMeasurementSchema,
  lt: NumericMeasurementSchema,
  wtw: NumericMeasurementSchema,
  k1: NumericMeasurementSchema,
  k1Axis: NumericMeasurementSchema,
  k2: NumericMeasurementSchema,
  k2Axis: NumericMeasurementSchema,
  tk1: NumericMeasurementSchema,
  tk1Axis: NumericMeasurementSchema,
  tk2: NumericMeasurementSchema,
  tk2Axis: NumericMeasurementSchema,
  targetRefraction: NumericMeasurementSchema,
  /**
   * 報告單上印的手術誘發散光與切口軸位（IOLMaster 印成 "SIA 0.25 D Inc 135°"、
   * Pentacam 印成 "SIA 0.20 D @ 30°"）。實測 7 張樣本全部都有，且左右眼可能不同 ——
   * 這是醫師當次填進儀器的值，比診所設定檔的預設值更貼近這一台刀。
   */
  sia: NumericMeasurementSchema,
  incisionAxis: NumericMeasurementSchema,
  lensModel: TextMeasurementSchema,
  aConstant: NumericMeasurementSchema,
});

export const RecognitionResultSchema = z.object({
  device: z.enum(['IOLMaster700', 'unknown']),
  /**
   * 報告單上印的儀器名稱字樣，逐字照抄（"IOLMaster 700"、"LENSTAR LS 900"…）。
   * 客戶 2026-08-27 表示「會有其他機型」但尚未說明是哪些；device 判為 unknown 時，
   * 這個欄位是我們唯一能得知實際遇到什麼機器的來源。
   */
  deviceRawText: z.string().nullable(),
  reportDate: z.string().nullable(),
  eyes: z.array(EyeDataSchema),
  /** 只放「報告單上實際印出來的」警告文字。這些會以紅色橫幅醒目顯示，不能摻雜其他東西 */
  warnings: z.array(z.string()),
  /**
   * 辨識過程的說明：哪些欄位有多個候選值、為什麼填 null、照片哪裡被裁到。
   * 與 warnings 分開，否則「報告單上沒有警告」這種話會被當成儀器警告紅字顯示，
   * 稀釋真正的警告。
   */
  extractionNotes: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});

export type NumericMeasurement = z.infer<typeof NumericMeasurementSchema>;
export type TextMeasurement = z.infer<typeof TextMeasurementSchema>;
export type EyeData = z.infer<typeof EyeDataSchema>;
export type RecognitionResult = z.infer<typeof RecognitionResultSchema>;
