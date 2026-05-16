export type PokerCurrency = 'SOL' | 'POOKIE' | 'USDC'

export type TableType = 'public' | 'private'

export type GameType = 'texas_holdem'

export type TableStatus = 'waiting' | 'active' | 'paused' | 'closing' | 'closed'

export type HandStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type PokerAction =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'allin'
  | 'show'
  | 'muck'

export type TableCommand =
  | 'sit_down'
  | 'stand_up'
  | 'buy_in'
  | 'leave_table'
  | 'request_cash_out'

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export type Suit = 'c' | 'd' | 'h' | 's'

export type Card = {
  rank: Rank
  suit: Suit
}

export type RakeConfig = {
  rakePercentBps: number
  rakeCapLamports: string
  noFlopNoDrop: boolean
  minPotForRakeLamports: string
}

export type PlayerPublicState = {
  wallet: string
  displayName: string
  avatarUrl?: string
  seatIndex: number
  stackLamports: string
  currentBetLamports: string
  folded: boolean
  allIn: boolean
  connected: boolean
  lastAction?: PokerAction
}

export type PlayerPrivateState = PlayerPublicState & {
  holeCards?: Card[]
}

export type LegalAction = {
  type: PokerAction
  minAmountLamports?: string
  maxAmountLamports?: string
}

export type TablePublicState = {
  tableId: string
  tableName: string
  tableType: TableType
  status: TableStatus
  gameType: GameType
  currency: PokerCurrency
  handNumber: number
  street: HandStreet
  smallBlindLamports: string
  bigBlindLamports: string
  minBuyInLamports: string
  maxBuyInLamports: string
  maxPlayers: number
  potLamports: string
  sidePots: string[]
  communityCards: Card[]
  dealerSeat: number
  currentTurnSeat?: number
  players: PlayerPublicState[]
  rakeInfo: {
    rakeBps: number
    rakeCapLamports: string
    rakeTakenThisHandLamports: string
  }
}

export type ClientTableView = TablePublicState & {
  me?: PlayerPrivateState
  legalActions?: LegalAction[]
}

export type SeatVisualState = {
  seatIndex: number
  wallet?: string
  avatarUrl?: string
  displayName?: string
  occupied: boolean
  activeTurn: boolean
  folded: boolean
  allIn: boolean
  winner: boolean
  lastAction?: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'
  stackLamports: string
}

export type PokerTableConfig = {
  tableId: string
  tableName: string
  tableType: TableType
  creatorWallet?: string
  inviteCode?: string
  passwordHash?: string
  gameType: GameType
  currency: PokerCurrency
  smallBlindLamports: string
  bigBlindLamports: string
  minBuyInLamports: string
  maxBuyInLamports: string
  maxPlayers: 2 | 6 | 9
  rake: RakeConfig
  realMoneyEnabled: boolean
  compliancePolicy?: {
    regionPolicyId?: string
    requiresKyc: boolean
    requiresGeofence: boolean
    allowSpectators: boolean
  }
}

export type HandReceipt = {
  tableId: string
  handNumber: number
  deckCommitment: string
  serverSeedHash: string
  revealedServerSeed?: string
  playerSeedCommitments: Record<string, string>
  vrfProofHash?: string
  actionLogHash: string
  finalResultHash: string
  rakeTakenLamports: string
  completedAt: string
  disputed: boolean
}

