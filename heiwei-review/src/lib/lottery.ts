import type { Prize } from '@/types'

export function selectPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0)
  if (Math.abs(total - 100) > 0.001) {
    throw new Error('機率總和必須等於 100')
  }

  const rand = Math.random() * 100
  let cumulative = 0
  for (const prize of prizes) {
    cumulative += prize.probability
    if (rand < cumulative) return prize
  }
  return prizes[prizes.length - 1]
}
