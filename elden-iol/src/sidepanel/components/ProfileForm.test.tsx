import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';
import { DEFAULT_PROFILE } from '../../lib/profile';

describe('ProfileForm', () => {
  it('顯示目前的醫師名稱', () => {
    render(<ProfileForm profile={{ ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭' }} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/醫師/)).toHaveValue('中慈 Dr彭');
  });

  it('可以改 SIA 值並存檔', async () => {
    const onSave = vi.fn();
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={onSave} />);
    const sia = screen.getByLabelText(/SIA 度數/);
    await userEvent.clear(sia);
    await userEvent.type(sia, '0.3');
    await userEvent.click(screen.getByRole('button', { name: /儲存/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ defaultSIA: 0.3 }));
  });

  it('可以在 K 與 TK 之間切換', async () => {
    const onSave = vi.fn();
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByLabelText(/角膜屈光度來源/), 'TK');
    await userEvent.click(screen.getByRole('button', { name: /儲存/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ keratometrySource: 'TK' }));
  });

  it('沒有任何病患資料輸入欄位', () => {
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/病患姓名/)).toBeNull();
    expect(screen.queryByLabelText(/病歷號/)).toBeNull();
  });

  it('提供客戶常用的兩組 SIA 快捷，按一下就帶入', async () => {
    const onSave = vi.fn();
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: '0.2 D @ 180°' }));
    await userEvent.click(screen.getByRole('button', { name: /儲存/ }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultSIA: 0.2, defaultSIAAxis: 180 }),
    );
  });

  it('不提供鏡片系列選項（常數由醫師在官網 IOL Model 自選）', () => {
    render(<ProfileForm profile={DEFAULT_PROFILE} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/散光片|鏡片/)).toBeNull();
  });
});
