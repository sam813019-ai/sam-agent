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
  lensModel: TextMeasurementSchema,
  aConstant: NumericMeasurementSchema,
});

export const RecognitionResultSchema = z.object({
  device: z.enum(['IOLMaster700', 'unknown']),
  reportDate: z.string().nullable(),
  eyes: z.array(EyeDataSchema),
  warnings: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});

export type NumericMeasurement = z.infer<typeof NumericMeasurementSchema>;
export type TextMeasurement = z.infer<typeof TextMeasurementSchema>;
export type EyeData = z.infer<typeof EyeDataSchema>;
export type RecognitionResult = z.infer<typeof RecognitionResultSchema>;
