import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import type { NumericMeasurement, TextMeasurement, EyeData } from '../lib/schema';

const num = (value: number | null, confidence = 0.97): NumericMeasurement =>
  ({ value, confidence, borderline: false, rawText: String(value ?? '---') });
const text = (value: string): TextMeasurement =>
  ({ value, confidence: 0.9, borderline: false, rawText: value });

/** 兩隻眼都有一個低信心欄位（AL），兩邊都必須各自確認過才准填 */
const eyeWithLowConfidenceAL = (laterality: 'OD' | 'OS'): EyeData => ({
  laterality, status: 'Phakic', hasData: true,
  al: num(24.49, 0.5),
  acd: num(3.15), lt: num(4.99), wtw: num(11.6),
  k1: num(43.08), k1Axis: num(96), k2: num(45.58), k2Axis: num(6),
  tk1: num(43.0), tk1Axis: num(95), tk2: num(45.53), tk2Axis: num(5),
  targetRefraction: num(0),
  lensModel: text('AMO Tecnic 1 ZCB00-1'),
  aConstant: num(119.3),
});

vi.mock('./api', () => ({
  RECOGNIZE_ENDPOINT: 'https://example.test/api/recognize',
  recognizeImage: vi.fn(async () => ({
    device: 'IOLMaster700',
    deviceRawText: 'IOLMaster 700',
    reportDate: '2026-07-17',
    warnings: [],
    overallConfidence: 0.9,
    eyes: [eyeWithLowConfidenceAL('OD'), eyeWithLowConfidenceAL('OS')],
  })),
}));

beforeEach(() => {
  vi.stubGlobal('chrome', {
    storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) } },
  });
});

async function uploadAReport() {
  const { container } = render(<App />);
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  await userEvent.upload(input, new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /OD/ })).toBeInTheDocument());
}

describe('App — 換眼別時的確認狀態', () => {
  it('在 OD 確認過的低信心欄位，切到 OS 後不得沿用 —— OS 必須自己再確認一次', async () => {
    await uploadAReport();

    await userEvent.click(screen.getByRole('button', { name: /OD/ }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();

    await userEvent.click(screen.getByTestId('confirm-al'));
    expect(screen.getByRole('button', { name: /填入/ })).toBeEnabled();

    // 切到左眼：這是另一組數字，剛才的核對不算數
    await userEvent.click(screen.getByRole('button', { name: /OS/ }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
  });

  it('切回原本那隻眼時同樣要重新確認，不保留舊狀態', async () => {
    await uploadAReport();

    await userEvent.click(screen.getByRole('button', { name: /OD/ }));
    await userEvent.click(screen.getByTestId('confirm-al'));
    await userEvent.click(screen.getByRole('button', { name: /OS/ }));
    await userEvent.click(screen.getByRole('button', { name: /OD/ }));

    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
  });
});
