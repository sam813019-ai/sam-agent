import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { MaskEditor } from './MaskEditor';

let store: Record<string, unknown> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
      },
    },
  });
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 400, height: 300, close() {} })));
});

const file = () => new File([new Uint8Array([1])], 'r.jpg', { type: 'image/jpeg' });

/** jsdom 的 getBoundingClientRect 一律回 0，拖曳座標算不出來，必須固定住 */
function stubCanvasBox(el: HTMLElement) {
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
  });
}

function drag(el: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.mouseDown(el, { clientX: from[0], clientY: from[1] });
  fireEvent.mouseUp(el, { clientX: to[0], clientY: to[1] });
}

describe('MaskEditor', () => {
  it('沒有遮任何區域時，送出按鈕停用直到使用者明確確認', async () => {
    render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /確認送出/ })).toBeDisabled();

    await userEvent.click(screen.getByTestId('ack-no-mask'));
    expect(screen.getByRole('button', { name: /確認送出/ })).toBeEnabled();
  });

  it('拖曳後產生一個遮罩，且送出按鈕直接可用', async () => {
    render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);

    drag(canvas, [20, 10], [60, 40]);

    expect(screen.getByTestId('mask-count').textContent).toContain('1');
    expect(screen.getByRole('button', { name: /確認送出/ })).toBeEnabled();
    expect(screen.queryByTestId('ack-no-mask')).toBeNull();
  });

  it('送出時把遮罩以 0–1 相對座標交給呼叫端', async () => {
    const onConfirm = vi.fn();
    render(<MaskEditor file={file()} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);

    drag(canvas, [20, 10], [60, 40]);
    await userEvent.click(screen.getByRole('button', { name: /確認送出/ }));

    expect(onConfirm).toHaveBeenCalledWith([{ x: 0.1, y: 0.1, w: 0.2, h: 0.3 }]);
  });

  it('點一下（沒有拖曳）不會產生看不見的遮罩', () => {
    render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);

    drag(canvas, [30, 30], [31, 31]);

    expect(screen.getByTestId('mask-count').textContent).toContain('0');
  });

  it('清除後回到需要明確確認的狀態，不會沿用先前的確認', async () => {
    render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);

    await userEvent.click(screen.getByTestId('ack-no-mask'));
    drag(canvas, [20, 10], [60, 40]);
    await userEvent.click(screen.getByRole('button', { name: '清除' }));

    expect(screen.getByRole('button', { name: /確認送出/ })).toBeDisabled();
  });

  it('可以把遮罩位置記住，下次以名字套用', async () => {
    const { unmount } = render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    let canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);
    drag(canvas, [20, 10], [60, 40]);

    await userEvent.type(screen.getByPlaceholderText(/取個名字/), 'IOLMaster 700');
    await userEvent.click(screen.getByRole('button', { name: '記住' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'IOLMaster 700' })).toBeInTheDocument());
    unmount();

    const onConfirm = vi.fn();
    render(<MaskEditor file={file()} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'IOLMaster 700' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'IOLMaster 700' }));

    expect(screen.getByTestId('mask-count').textContent).toContain('1');
    await userEvent.click(screen.getByRole('button', { name: /確認送出/ }));
    expect(onConfirm).toHaveBeenCalledWith([{ x: 0.1, y: 0.1, w: 0.2, h: 0.3 }]);
  });

  it('記住的內容只有座標，不含任何影像資料', async () => {
    render(<MaskEditor file={file()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const canvas = screen.getByTestId('mask-canvas');
    stubCanvasBox(canvas);
    drag(canvas, [20, 10], [60, 40]);

    await userEvent.type(screen.getByPlaceholderText(/取個名字/), 'A');
    await userEvent.click(screen.getByRole('button', { name: '記住' }));
    await waitFor(() => expect(JSON.stringify(store)).toContain('"x"'));

    const raw = JSON.stringify(store);
    expect(raw).not.toContain('data:image');
    expect(raw).not.toContain('base64');
  });
});
