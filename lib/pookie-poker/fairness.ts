import type { Card } from '@/shared/pookie-poker'

const RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS: Card['suit'][] = ['c', 'd', 'h', 's']

export type FairnessVerificationInput = {
  tableId: string
  handNumber: number
  serverSeed: string
  expectedServerSeedHash: string
  expectedDeckCommitment: string
}

export type FairnessVerificationResult = {
  serverSeedHash: string
  deckCommitment: string
  serverSeedMatches: boolean
  deckCommitmentMatches: boolean
  deckPreview: Card[]
}

export async function verifyPokerHand(input: FairnessVerificationInput): Promise<FairnessVerificationResult> {
  const serverSeedHash = await sha256Hex(input.serverSeed)
  const finalSeed = await sha256Hex(`${input.serverSeed}:${input.tableId}:${input.handNumber}`)
  const deck = await deterministicShuffle(finalSeed)
  const deckCommitment = await sha256Hex(
    JSON.stringify({
      seedHash: serverSeedHash,
      tableId: input.tableId,
      handNumber: input.handNumber,
      deck: deck.map((card) => `${card.rank}${card.suit}`),
    }),
  )

  return {
    serverSeedHash,
    deckCommitment,
    serverSeedMatches: serverSeedHash === input.expectedServerSeedHash,
    deckCommitmentMatches: deckCommitment === input.expectedDeckCommitment,
    deckPreview: deck.slice(0, 12),
  }
}

function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

async function deterministicShuffle(seed: string) {
  const deck = createDeck()
  for (let i = deck.length - 1, counter = 0; i > 0; i--, counter++) {
    const j = Number((await randomBigIntBelow(BigInt(i + 1), seed, counter)))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck
}

async function randomBigIntBelow(maxExclusive: bigint, seed: string, counter: number) {
  const hex = await sha256Hex(`${seed}:${counter}`)
  return BigInt(`0x${hex}`) % maxExclusive
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

