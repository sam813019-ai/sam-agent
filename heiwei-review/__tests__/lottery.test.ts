import { selectPrize } from '../src/lib/lottery'
import type { Prize } from '../src/types'

const prizes: Prize[] = [
  { index: 0, name: '大獎', probability: 10, color: '#FFD700' },
  { index: 1, name: '小獎', probability: 90, color: '#FF69B4' },
]

describe('selectPrize', () => {
  it('回傳的 prize 必須存在於 prizes 陣列中', () => {
    const result = selectPrize(prizes)
    expect(prizes.map(p => p.index)).toContain(result.index)
  })

  it('機率總和不等於 100 時拋出錯誤', () => {
    const bad: Prize[] = [
      { index: 0, name: 'A', probability: 50, color: '#000' },
    ]
    expect(() => selectPrize(bad)).toThrow('機率總和必須等於 100')
  })

  it('只有一個選項時永遠回傳該選項', () => {
    const single: Prize[] = [
      { index: 0, name: '唯一獎', probability: 100, color: '#000' },
    ]
    for (let i = 0; i < 10; i++) {
      expect(selectPrize(single).index).toBe(0)
    }
  })

  it('機率分佈：10000 次抽獎中大獎比例接近 10%', () => {
    let bigPrizeCount = 0
    for (let i = 0; i < 10000; i++) {
      if (selectPrize(prizes).index === 0) bigPrizeCount++
    }
    const ratio = bigPrizeCount / 10000
    expect(ratio).toBeGreaterThan(0.07)
    expect(ratio).toBeLessThan(0.13)
  })
})
