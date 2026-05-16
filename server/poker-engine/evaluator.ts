import type { Card } from '../../shared/pookie-poker'
import type { EvaluatedHand, HandRankCategory } from './types'

const RANK_VALUE: Record<Card['rank'], number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

const CATEGORY_SCORE: Record<HandRankCategory, number> = {
  high_card: 0,
  one_pair: 1,
  two_pair: 2,
  three_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_kind: 7,
  straight_flush: 8,
}

export function rankValue(card: Card) {
  return RANK_VALUE[card.rank]
}

function descending(values: number[]) {
  return [...values].sort((a, b) => b - a)
}

function straightHigh(uniqueRanks: number[]) {
  const ranks = descending(Array.from(new Set(uniqueRanks)))
  if (ranks.includes(14)) ranks.push(1)
  for (let i = 0; i <= ranks.length - 5; i++) {
    const window = ranks.slice(i, i + 5)
    if (window.every((rank, index) => index === 0 || window[index - 1] - rank === 1)) {
      return window[0] === 1 ? 5 : window[0]
    }
  }
  return 0
}

export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) throw new Error('evaluateFive requires exactly 5 cards')

  const ranks = cards.map(rankValue)
  const byRank = new Map<number, number>()
  for (const rank of ranks) byRank.set(rank, (byRank.get(rank) ?? 0) + 1)

  const groups = Array.from(byRank.entries())
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank)

  const flush = cards.every((card) => card.suit === cards[0].suit)
  const straight = straightHigh(ranks)

  let category: HandRankCategory
  let tiebreakers: number[]

  if (flush && straight) {
    category = 'straight_flush'
    tiebreakers = [straight]
  } else if (groups[0].count === 4) {
    category = 'four_kind'
    tiebreakers = [groups[0].rank, ...descending(groups.filter((g) => g.count === 1).map((g) => g.rank))]
  } else if (groups[0].count === 3 && groups[1]?.count === 2) {
    category = 'full_house'
    tiebreakers = [groups[0].rank, groups[1].rank]
  } else if (flush) {
    category = 'flush'
    tiebreakers = descending(ranks)
  } else if (straight) {
    category = 'straight'
    tiebreakers = [straight]
  } else if (groups[0].count === 3) {
    category = 'three_kind'
    tiebreakers = [groups[0].rank, ...descending(groups.filter((g) => g.count === 1).map((g) => g.rank))]
  } else if (groups[0].count === 2 && groups[1]?.count === 2) {
    category = 'two_pair'
    const pairs = descending(groups.filter((g) => g.count === 2).map((g) => g.rank))
    tiebreakers = [...pairs, ...descending(groups.filter((g) => g.count === 1).map((g) => g.rank))]
  } else if (groups[0].count === 2) {
    category = 'one_pair'
    tiebreakers = [groups[0].rank, ...descending(groups.filter((g) => g.count === 1).map((g) => g.rank))]
  } else {
    category = 'high_card'
    tiebreakers = descending(ranks)
  }

  return {
    category,
    score: CATEGORY_SCORE[category],
    ranks: tiebreakers,
    cards,
  }
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand) {
  if (a.score !== b.score) return a.score - b.score
  const len = Math.max(a.ranks.length, b.ranks.length)
  for (let i = 0; i < len; i++) {
    const diff = (a.ranks[i] ?? 0) - (b.ranks[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [first, ...rest] = items
  return [
    ...combinations(rest, size - 1).map((combo) => [first, ...combo]),
    ...combinations(rest, size),
  ]
}

export function evaluateBestHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('evaluateBestHand requires 5 to 7 cards')
  }
  const hands = combinations(cards, 5).map(evaluateFive)
  return hands.reduce((best, next) => (compareHands(next, best) > 0 ? next : best))
}

