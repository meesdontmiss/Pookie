import type { Card } from '@/shared/pookie-poker'

export function cardLabel(card: Card) {
  return `${card.rank}${suitSymbol(card.suit)}`
}

export function suitSymbol(suit: Card['suit']) {
  if (suit === 'c') return '♣'
  if (suit === 'd') return '♦'
  if (suit === 'h') return '♥'
  return '♠'
}

export function isRedSuit(suit: Card['suit']) {
  return suit === 'd' || suit === 'h'
}

