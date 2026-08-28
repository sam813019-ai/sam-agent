import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewTable } from './ReviewTable';
import { mapToFormValues } from '../../lib/mapping';
import { DEFAULT_PROFILE } from '../../lib/profile';
import type { EyeData, NumericMeasurement, TextMeasurement } from '../../lib/schema';

const num = (value: number | null, confidence = 0.97): NumericMeasurement =>
  ({ value, confidence, borderline: false, rawText: String(value ?? '---') });
const text = (value: string): TextMeasurement =>
  ({ value, confidence: 0.9, borderline: false, rawText: value });

const eye = (over: Partial<EyeData> = {}): EyeData => ({
  laterality: 'OD', status: 'Phakic', hasData: true,
  al: num(24.49), acd: num(3.15), lt: num(4.99), wtw: num(11.6),
  k1: num(43.08), k1Axis: num(96), k2: num(45.58), k2Axis: num(6),
  tk1: num(43.0), tk1Axis: num(95), tk2: num(45.53), tk2Axis: num(5),
  targetRefraction: num(0),
  lensModel: text('AMO Tecnic 1 ZCB00-1'),
  aConstant: num(119.3),
  ...over,
});

const profile = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭' };

function setup(e: EyeData, onConfirm = vi.fn()) {
  const mapping = mapToFormValues(e, profile);
  render(<ReviewTable eye={e} mapping={mapping} threshold={0.9} onConfirm={onConfirm} />);
  return { onConfirm };
}

describe('ReviewTable', () => {
  it('同時顯示模型讀到的原始文字與轉換後的值（同一列出現兩次）', () => {
    setup(eye());
    expect(screen.getAllByText('24.49').length).toBeGreaterThanOrEqual(2);
  });

  it('顯示 SIA 的替換說明，讓使用者知道這個值不是紙上讀到的', () => {
    setup(eye());
    const note = screen.getByTestId('substitution-sia');
    expect(note.textContent).toContain('報告單無此欄位');
    expect(note.textContent).toContain('0.2');
  });

  it('客戶指定要帶入的 LT、WTW、目標屈光度都列在確認表上', () => {
    setup(eye());
    expect(screen.getByTestId('row-lt')).toBeInTheDocument();
    expect(screen.getByTestId('row-wtw')).toBeInTheDocument();
    expect(screen.getByTestId('row-targetRefraction')).toBeInTheDocument();
  });

  it('軸位也要能核對——填錯軸位等同散光算錯', () => {
    setup(eye());
    expect(screen.getByTestId('row-k1Axis')).toBeInTheDocument();
    expect(screen.getByTestId('row-k2Axis')).toBeInTheDocument();
  });

  it('LT/WTW 讀不到時該列顯示「留空」而不是 0', () => {
    setup(eye({ lt: num(null) }));
    expect(screen.getByTestId('row-lt').textContent).toContain('留空');
    expect(screen.getByTestId('row-lt').textContent).not.toContain('0');
  });

  it('低於信心門檻的欄位標記為需確認', () => {
    setup(eye({ al: num(24.49, 0.5) }));
    expect(screen.getByTestId('low-confidence-al')).toBeInTheDocument();
  });

  it('有低信心欄位且未逐一確認時，填入按鈕停用', () => {
    setup(eye({ al: num(24.49, 0.5) }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
  });

  it('逐一確認低信心欄位後，填入按鈕啟用', async () => {
    setup(eye({ al: num(24.49, 0.5) }));
    await userEvent.click(screen.getByTestId('confirm-al'));
    expect(screen.getByRole('button', { name: /填入/ })).toBeEnabled();
  });

  it('全部欄位信心都夠時，填入按鈕直接可用', () => {
    setup(eye());
    expect(screen.getByRole('button', { name: /填入/ })).toBeEnabled();
  });

  it('有阻斷問題時，填入按鈕停用並顯示原因', () => {
    setup(eye({ al: num(null) }));
    expect(screen.getByRole('button', { name: /填入/ })).toBeDisabled();
    expect(screen.getByText(/缺少 AL/)).toBeInTheDocument();
  });

  it('按下填入時呼叫 onConfirm', async () => {
    const { onConfirm } = setup(eye());
    await userEvent.click(screen.getByRole('button', { name: /填入/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('按鈕文字明確表示不會自動計算', () => {
    setup(eye());
    expect(screen.getByRole('button', { name: /填入/ }).textContent).toMatch(/不會|不自動/);
  });
});
