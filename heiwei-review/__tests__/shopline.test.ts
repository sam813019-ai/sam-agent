import { describe, it, expect, vi, beforeAll } from 'vitest'
import { verifyOrder } from '../src/lib/shopline'

beforeAll(() => {
  process.env.SHOPLINE_ACCESS_TOKEN = 'test-token'
})

describe('verifyOrder', () => {
  it('訂單存在且 confirmed → 回傳 valid: true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ order_number: 'ORD001', status: 'confirmed' }],
      }),
    }) as any

    const result = await verifyOrder('ORD001')
    expect(result.valid).toBe(true)
  })

  it('訂單 status 為 completed 也算有效', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ order_number: 'ORD002', status: 'completed' }],
      }),
    }) as any

    const result = await verifyOrder('ORD002')
    expect(result.valid).toBe(true)
  })

  it('訂單存在但 status 為 pending → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ order_number: 'ORD003', status: 'pending' }],
      }),
    }) as any

    const result = await verifyOrder('ORD003')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('尚未付款')
  })

  it('找不到訂單 → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    }) as any

    const result = await verifyOrder('NOTEXIST')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('找不到訂單')
  })

  it('API 回傳錯誤 → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as any

    const result = await verifyOrder('ORD001')
    expect(result.valid).toBe(false)
  })
})
