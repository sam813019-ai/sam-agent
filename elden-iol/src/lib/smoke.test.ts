import { describe, it, expect } from 'vitest';

describe('測試環境', () => {
  it('jsdom 可用', () => {
    document.body.innerHTML = '<input id="x" value="1" />';
    expect(document.querySelector<HTMLInputElement>('#x')!.value).toBe('1');
  });
});
