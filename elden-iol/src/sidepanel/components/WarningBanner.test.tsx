import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WarningBanner } from './WarningBanner';

describe('WarningBanner', () => {
  it('顯示報告單上的文字警告', () => {
    render(<WarningBanner warnings={['OD: Axial length measurements slightly inconsistent.']} borderlineFields={[]} />);
    expect(screen.getByText(/Axial length/)).toBeInTheDocument();
  });

  it('列出所有 borderline 欄位', () => {
    render(<WarningBanner warnings={[]} borderlineFields={['AL', 'WTW']} />);
    expect(screen.getByText(/AL/)).toBeInTheDocument();
    expect(screen.getByText(/WTW/)).toBeInTheDocument();
  });

  it('警告不得被摺疊隱藏——沒有 details/summary 元素', () => {
    const { container } = render(
      <WarningBanner warnings={['某個警告']} borderlineFields={[]} />,
    );
    expect(container.querySelector('details')).toBeNull();
  });

  it('完全沒有警告時不渲染任何東西', () => {
    const { container } = render(<WarningBanner warnings={[]} borderlineFields={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
