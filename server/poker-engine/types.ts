import type { Card, HandStreet, PokerAction, RakeConfig } from '../../shared/pookie-poker'

export type EnginePlayer = {
  wallet: string
  seatIndex: number
  stack: bigint
  currentBet: bigint
  committed: bigint
  folded: boolean
  allIn: boolean
  holeCards: Card[]
  lastAction?: PokerAction
}

export type ActionLogEntry = {
  sequence: number
  wallet: string
  seatIndex: number
  action: PokerAction
  amount: bigint
  street: HandStreet
  stateHashBefore: string
  stateHashAfter: string
  createdAt: string
}

export type HandState = {
  tableId: string
  handNumber: number
  street: HandStreet
  dealerSeat: number
  smallBlindSeat: number
  bigBlindSeat: number
  currentTurnSeat?: number
  minRaise: bigint
  currentBet: bigint
  pot: bigint
  communityCards: Card[]
  deck: Card[]
  players: EnginePlayer[]
  actionLog: ActionLogEntry[]
  sawFlop: boolean
  rakeConfig: RakeConfig
  settled: boolean
}

export type HandRankCategory =
  | 'high_card'
  | 'one_pair'
  | 'two_pair'
  | 'three_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_kind'
  | 'straight_flush'

export type EvaluatedHand = {
  category: HandRankCategory
  score: number
  ranks: number[]
  cards: Card[]
}

export type PlayerSettlementInput = {
  wallet: string
  seatIndex: number
  committed: bigint
  folded: boolean
  holeCards: Card[]
}

export type PlayerSettlement = {
  wallet: string
  seatIndex: number
  delta: bigint
  won: bigint
  committed: bigint
  rakeContributed: bigint
  finalStack?: bigint
}

export type SettlementResult = {
  pot: bigint
  rake: bigint
  payouts: PlayerSettlement[]
  sidePots: Array<{
    amount: bigint
    eligibleWallets: string[]
    winnerWallets: string[]
  }>
}

