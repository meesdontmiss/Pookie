import crypto from 'crypto'
import type { Card, Rank, Suit } from '../../shared/pookie-poker'

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
export const SUITS: Suit[] = ['c', 'd', 'h', 's']

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function assertUniqueDeck(deck: Card[]) {
  const keys = new Set(deck.map(cardToString))
  if (deck.length !== 52 || keys.size !== 52) {
    throw new Error('Deck must contain 52 unique cards')
  }
}

function randomBigIntBelow(maxExclusive: bigint, seed: string, counter: number): bigint {
  const digest = crypto
    .createHash('sha256')
    .update(`${seed}:${counter}`)
    .digest()
  const value = BigInt(`0x${digest.toString('hex')}`)
  return value % maxExclusive
}

export function deterministicShuffle(seed: string, sourceDeck = createDeck()): Card[] {
  const deck = [...sourceDeck]
  for (let i = deck.length - 1, counter = 0; i > 0; i--, counter++) {
    const j = Number(randomBigIntBelow(BigInt(i + 1), seed, counter))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck
}

export function deckCommitment(seedHash: string, tableId: string, handNumber: number, deck: Card[]) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ seedHash, tableId, handNumber, deck: deck.map(cardToString) }))
    .digest('hex')
}

export function hashSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

