import crypto from 'crypto'
import type {
  ClientTableView,
  HandReceipt,
  LegalAction,
  PlayerPublicState,
  PokerAction,
  PokerTableConfig,
  TablePublicState,
} from '../../shared/pookie-poker'
import {
  DEFAULT_POKIE_POKER_RAKE,
  PLAY_MONEY_STARTING_STACK_LAMPORTS,
} from '../../shared/pookie-poker'
import {
  applyPokerAction,
  createHandState,
  deckCommitment,
  hashSecret,
  settleShowdown,
  stateHash,
  type HandState,
} from '../poker-engine'
import { createPokerPersistence, type PokerPersistence } from './persistence'
import { createCustodyLedger, type CustodyLedger } from './custody-ledger'

type TablePlayerRuntime = {
  wallet: string
  displayName: string
  avatarUrl?: string
  seatIndex?: number
  stack: bigint
  connected: boolean
  readyForHand: boolean
  lastSeenAt: number
}

type TableRuntime = {
  config: PokerTableConfig
  status: TablePublicState['status']
  players: Map<string, TablePlayerRuntime>
  hand?: HandState
  handNumber: number
  dealerSeat: number
  receipts: HandReceipt[]
  serverSeed?: string
  serverSeedHash?: string
  deckCommitment?: string
}

const DEFAULT_PUBLIC_TABLES: PokerTableConfig[] = [
  {
    tableId: 'neon-rooftop-1',
    tableName: 'Neon Rooftop 1',
    tableType: 'public',
    gameType: 'texas_holdem',
    currency: 'SOL',
    smallBlindLamports: '5000000',
    bigBlindLamports: '10000000',
    minBuyInLamports: '200000000',
    maxBuyInLamports: '1000000000',
    maxPlayers: 6,
    rake: DEFAULT_POKIE_POKER_RAKE,
    realMoneyEnabled: false,
    compliancePolicy: {
      requiresKyc: false,
      requiresGeofence: false,
      allowSpectators: true,
    },
  },
  {
    tableId: 'private-lounge-preview',
    tableName: 'Private Lounge Preview',
    tableType: 'private',
    inviteCode: 'POOKIE',
    gameType: 'texas_holdem',
    currency: 'SOL',
    smallBlindLamports: '1000000',
    bigBlindLamports: '2000000',
    minBuyInLamports: '100000000',
    maxBuyInLamports: '500000000',
    maxPlayers: 6,
    rake: { ...DEFAULT_POKIE_POKER_RAKE, rakePercentBps: 150 },
    realMoneyEnabled: false,
    compliancePolicy: {
      requiresKyc: false,
      requiresGeofence: false,
      allowSpectators: false,
    },
  },
]

export class PookiePokerTableManager {
  private tables = new Map<string, TableRuntime>()
  private locks = new Map<string, Promise<void>>()
  private persistence: PokerPersistence
  private custodyLedger: CustodyLedger

  constructor(seedDefaults = true, persistence = createPokerPersistence(), custodyLedger = createCustodyLedger()) {
    this.persistence = persistence
    this.custodyLedger = custodyLedger
    if (seedDefaults) {
      for (const config of DEFAULT_PUBLIC_TABLES) {
        const runtime: TableRuntime = {
          config,
          status: 'waiting',
          players: new Map(),
          handNumber: 0,
          dealerSeat: 0,
          receipts: [],
        }
        this.tables.set(config.tableId, runtime)
        this.persistTable(runtime)
      }
    }
  }

  listTables(): TablePublicState[] {
    return Array.from(this.tables.values()).map((table) => this.toPublicState(table))
  }

  createTable(config: PokerTableConfig) {
    if (config.realMoneyEnabled) {
      throw new Error('Real-money poker is disabled by hard feature flag')
    }
    if (this.tables.has(config.tableId)) throw new Error('Table already exists')
    const inviteCode = config.tableType === 'private' ? config.inviteCode ?? createInviteCode() : undefined
    const runtime: TableRuntime = {
      config: { ...config, inviteCode, realMoneyEnabled: false },
      status: 'waiting',
      players: new Map(),
      handNumber: 0,
      dealerSeat: 0,
      receipts: [],
    }
    this.tables.set(config.tableId, runtime)
    this.persistTable(runtime)
    this.recordAudit(config.creatorWallet ?? 'system', 'create_table', 'poker_table', config.tableId, {
      tableType: config.tableType,
      realMoneyEnabled: false,
    })
    return { tableId: config.tableId, inviteCode }
  }

  getTable(tableId: string) {
    const table = this.tables.get(tableId)
    if (!table) throw new Error('Table not found')
    return table
  }

  async withTableLock<T>(tableId: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = this.locks.get(tableId) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    this.locks.set(tableId, previous.then(() => current))
    await previous
    try {
      return await fn()
    } finally {
      release()
      if (this.locks.get(tableId) === current) this.locks.delete(tableId)
    }
  }

  join(tableId: string, wallet: string, displayName?: string): ClientTableView {
    const table = this.getTable(tableId)
    const existing = table.players.get(wallet)
    table.players.set(wallet, {
      wallet,
      displayName: displayName?.trim() || existing?.displayName || shortWallet(wallet),
      avatarUrl: existing?.avatarUrl,
      seatIndex: existing?.seatIndex,
      stack: existing?.stack ?? BigInt(PLAY_MONEY_STARTING_STACK_LAMPORTS),
      connected: true,
      readyForHand: existing?.readyForHand ?? false,
      lastSeenAt: Date.now(),
    })
    this.persistTable(table)
    this.persistPlayer(table, wallet)
    return this.viewFor(tableId, wallet)
  }

  leave(tableId: string, wallet: string) {
    const table = this.getTable(tableId)
    const player = table.players.get(wallet)
    if (player) {
      player.connected = false
      player.readyForHand = false
      player.lastSeenAt = Date.now()
      this.persistDisconnected(tableId, wallet)
      this.persistTable(table)
    }
  }

  sit(tableId: string, wallet: string, seatIndex: number, buyInLamports: bigint) {
    const table = this.getTable(tableId)
    if (seatIndex < 0 || seatIndex >= table.config.maxPlayers) throw new Error('Invalid seat')
    if (buyInLamports < BigInt(table.config.minBuyInLamports)) throw new Error('Buy-in below table minimum')
    if (buyInLamports > BigInt(table.config.maxBuyInLamports)) throw new Error('Buy-in above table maximum')
    if (Array.from(table.players.values()).some((player) => player.seatIndex === seatIndex && player.wallet !== wallet)) {
      throw new Error('Seat is occupied')
    }
    const player = table.players.get(wallet)
    if (!player) throw new Error('Join table before sitting')
    player.seatIndex = seatIndex
    player.stack = buyInLamports
    player.readyForHand = false
    if (table.config.realMoneyEnabled) {
      this.moveLedgerPlayerToTable(wallet, tableId, buyInLamports, table.config.currency, `buyin:${tableId}:${wallet}:${Date.now()}`)
    }
    this.persistTable(table)
    this.persistPlayer(table, wallet)
    return this.viewFor(tableId, wallet)
  }

  stand(tableId: string, wallet: string) {
    const table = this.getTable(tableId)
    const player = table.players.get(wallet)
    if (!player) throw new Error('Player not found')
    if (table.hand?.players.some((handPlayer) => handPlayer.wallet === wallet && !handPlayer.folded)) {
      throw new Error('Cannot stand during active hand')
    }
    player.seatIndex = undefined
    player.readyForHand = false
    this.persistTable(table)
    this.persistPlayer(table, wallet)
    return this.viewFor(tableId, wallet)
  }

  ready(tableId: string, wallet: string) {
    const table = this.getTable(tableId)
    const player = table.players.get(wallet)
    if (!player?.seatIndex && player?.seatIndex !== 0) throw new Error('Sit before readying')
    player.readyForHand = true
    if (!table.hand) this.maybeStartHand(table)
    this.persistTable(table)
    this.persistPlayer(table, wallet)
    return this.viewFor(tableId, wallet)
  }

  action(tableId: string, wallet: string, action: PokerAction, amount = 0n) {
    const table = this.getTable(tableId)
    if (!table.hand) throw new Error('No active hand')
    table.hand = applyPokerAction(table.hand, wallet, action, amount)
    this.syncStacksFromHand(table)
    if (table.hand.street === 'showdown') {
      this.settleHand(table)
    }
    this.persistTable(table)
    this.persistPlayer(table, wallet)
    return this.viewFor(tableId, wallet)
  }

  viewFor(tableId: string, wallet?: string): ClientTableView {
    const table = this.getTable(tableId)
    const publicState = this.toPublicState(table)
    if (!wallet) return publicState

    const publicMe = publicState.players.find((player) => player.wallet === wallet)
    const handMe = table.hand?.players.find((player) => player.wallet === wallet)
    return {
      ...publicState,
      me: publicMe
        ? {
            ...publicMe,
            holeCards: handMe?.holeCards,
          }
        : undefined,
      legalActions: this.legalActionsFor(table, wallet),
    }
  }

  private maybeStartHand(table: TableRuntime) {
    const seated = Array.from(table.players.values())
      .filter((player) => player.connected && player.readyForHand && player.seatIndex !== undefined && player.stack > 0n)
      .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0))

    if (seated.length < 2) return

    table.handNumber += 1
    const serverSeed = crypto.randomBytes(32).toString('hex')
    const serverSeedHash = hashSecret(serverSeed)
    const finalSeed = hashSecret(`${serverSeed}:${table.config.tableId}:${table.handNumber}`)
    table.hand = createHandState({
      tableId: table.config.tableId,
      handNumber: table.handNumber,
      seed: finalSeed,
      players: seated.map((player) => ({
        wallet: player.wallet,
        seatIndex: player.seatIndex as number,
        stack: player.stack,
      })),
      dealerSeat: table.dealerSeat,
      smallBlind: BigInt(table.config.smallBlindLamports),
      bigBlind: BigInt(table.config.bigBlindLamports),
      rakeConfig: table.config.rake,
    })
    table.status = 'active'
    table.serverSeed = serverSeed
    table.serverSeedHash = serverSeedHash
    table.deckCommitment = deckCommitment(serverSeedHash, table.config.tableId, table.handNumber, table.hand.deck)
    for (const player of seated) player.readyForHand = false
    this.syncStacksFromHand(table)
  }

  private settleHand(table: TableRuntime) {
    if (!table.hand || table.hand.settled) return
    const hand = table.hand
    const result = settleShowdown({
      players: hand.players.map((player) => ({
        wallet: player.wallet,
        seatIndex: player.seatIndex,
        committed: player.committed,
        folded: player.folded,
        holeCards: player.holeCards,
      })),
      communityCards: hand.communityCards,
      sawFlop: hand.sawFlop,
      rakeConfig: table.config.rake,
    })

    for (const payout of result.payouts) {
      const runtime = table.players.get(payout.wallet)
      if (runtime) runtime.stack += payout.won
    }

    hand.settled = true
    const receipt = {
      tableId: table.config.tableId,
      handNumber: hand.handNumber,
      deckCommitment: table.deckCommitment ?? '',
      serverSeedHash: table.serverSeedHash ?? '',
      revealedServerSeed: table.serverSeed,
      playerSeedCommitments: {},
      actionLogHash: hashJson(hand.actionLog.map((entry) => ({ ...entry, amount: entry.amount.toString() }))),
      finalResultHash: hashJson(result.payouts.map((entry) => ({ ...entry, delta: entry.delta.toString(), won: entry.won.toString() }))),
      rakeTakenLamports: result.rake.toString(),
      completedAt: new Date().toISOString(),
      disputed: false,
    }
    table.receipts.push(receipt)

    const tableSnapshot = this.toPublicState(table)
    const settlements = result.payouts.map((settlement) => ({
      ...settlement,
      finalStack: table.players.get(settlement.wallet)?.stack ?? 0n,
    }))
    for (const settlement of settlements) {
      if (settlement.won > 0n && table.config.realMoneyEnabled) {
        this.moveLedgerTableToPlayer(
          settlement.wallet,
          table.config.tableId,
          settlement.won,
          table.config.currency,
          `hand:${table.config.tableId}:${hand.handNumber}`,
        )
      }
    }
    this.persistSettledHand(tableSnapshot, receipt, hand.actionLog, settlements)

    table.hand = undefined
    table.status = 'waiting'
    table.dealerSeat = nextDealerSeat(table)
    this.persistTable(table)
  }

  private syncStacksFromHand(table: TableRuntime) {
    if (!table.hand) return
    for (const handPlayer of table.hand.players) {
      const runtime = table.players.get(handPlayer.wallet)
      if (runtime) runtime.stack = handPlayer.stack
    }
  }

  private toPublicState(table: TableRuntime): TablePublicState {
    const hand = table.hand
    const handPlayersByWallet = new Map(hand?.players.map((player) => [player.wallet, player]))
    const players: PlayerPublicState[] = Array.from(table.players.values())
      .filter((player) => player.seatIndex !== undefined)
      .map((player) => {
        const handPlayer = handPlayersByWallet.get(player.wallet)
        return {
          wallet: player.wallet,
          displayName: player.displayName,
          avatarUrl: player.avatarUrl,
          seatIndex: player.seatIndex as number,
          stackLamports: player.stack.toString(),
          currentBetLamports: (handPlayer?.currentBet ?? 0n).toString(),
          folded: handPlayer?.folded ?? false,
          allIn: handPlayer?.allIn ?? false,
          connected: player.connected,
          lastAction: handPlayer?.lastAction,
        }
      })
      .sort((a, b) => a.seatIndex - b.seatIndex)

    return {
      tableId: table.config.tableId,
      tableName: table.config.tableName,
      tableType: table.config.tableType,
      status: table.status,
      gameType: table.config.gameType,
      currency: table.config.currency,
      handNumber: hand?.handNumber ?? table.handNumber,
      street: hand?.street ?? 'preflop',
      smallBlindLamports: table.config.smallBlindLamports,
      bigBlindLamports: table.config.bigBlindLamports,
      minBuyInLamports: table.config.minBuyInLamports,
      maxBuyInLamports: table.config.maxBuyInLamports,
      maxPlayers: table.config.maxPlayers,
      potLamports: (hand?.pot ?? 0n).toString(),
      sidePots: [],
      communityCards: hand?.communityCards ?? [],
      dealerSeat: hand?.dealerSeat ?? table.dealerSeat,
      currentTurnSeat: hand?.currentTurnSeat,
      players,
      rakeInfo: {
        rakeBps: table.config.rake.rakePercentBps,
        rakeCapLamports: table.config.rake.rakeCapLamports,
        rakeTakenThisHandLamports: table.receipts.at(-1)?.rakeTakenLamports ?? '0',
      },
    }
  }

  private legalActionsFor(table: TableRuntime, wallet: string): LegalAction[] {
    const hand = table.hand
    const player = hand?.players.find((candidate) => candidate.wallet === wallet)
    if (!hand || !player || hand.currentTurnSeat !== player.seatIndex) return []
    const toCall = hand.currentBet - player.currentBet
    const actions: LegalAction[] = [{ type: 'fold' }, { type: 'allin', maxAmountLamports: player.stack.toString() }]
    if (toCall === 0n) {
      actions.push({ type: 'check' })
      if (player.stack > 0n) {
        actions.push({
          type: 'bet',
          minAmountLamports: BigInt(table.config.bigBlindLamports).toString(),
          maxAmountLamports: player.stack.toString(),
        })
      }
    } else {
      actions.push({ type: 'call', minAmountLamports: toCall.toString(), maxAmountLamports: toCall.toString() })
      const minRaiseTarget = hand.currentBet + (hand.minRaise || BigInt(table.config.bigBlindLamports))
      if (player.currentBet + player.stack > minRaiseTarget) {
        actions.push({
          type: 'raise',
          minAmountLamports: minRaiseTarget.toString(),
          maxAmountLamports: (player.currentBet + player.stack).toString(),
        })
      }
    }
    return actions
  }

  private persistTable(table: TableRuntime) {
    void this.persistence.upsertTable(this.toPublicState(table)).catch((error) => {
      console.error('[pookie-poker] failed to persist table', error)
    })
  }

  private persistPlayer(table: TableRuntime, wallet: string) {
    const publicPlayer = this.toPublicState(table).players.find((player) => player.wallet === wallet)
    if (!publicPlayer) return
    void this.persistence.upsertPlayer(table.config.tableId, publicPlayer).catch((error) => {
      console.error('[pookie-poker] failed to persist player', error)
    })
  }

  private persistDisconnected(tableId: string, wallet: string) {
    void this.persistence.markPlayerDisconnected(tableId, wallet).catch((error) => {
      console.error('[pookie-poker] failed to mark disconnected player', error)
    })
  }

  private persistSettledHand(
    table: TablePublicState,
    receipt: HandReceipt,
    actions: Parameters<PokerPersistence['recordSettledHand']>[0]['actions'],
    settlements: Parameters<PokerPersistence['recordSettledHand']>[0]['settlements'],
  ) {
    void this.persistence.recordSettledHand({ table, receipt, actions, settlements }).catch((error) => {
      console.error('[pookie-poker] failed to persist settled hand', error)
    })
  }

  private recordAudit(actor: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
    void this.persistence.recordAudit(actor, action, targetType, targetId, metadata).catch((error) => {
      console.error('[pookie-poker] failed to persist audit log', error)
    })
  }

  private moveLedgerPlayerToTable(wallet: string, tableId: string, amountLamports: bigint, mint: string, referenceId: string) {
    if (!this.custodyLedger.enabled) return
    void this.custodyLedger.movePlayerToTable({ wallet, tableId, amountLamports, mint, referenceId }).catch((error) => {
      console.error('[pookie-poker] failed to move player ledger funds to table', error)
    })
  }

  private moveLedgerTableToPlayer(wallet: string, tableId: string, amountLamports: bigint, mint: string, referenceId: string) {
    if (!this.custodyLedger.enabled) return
    void this.custodyLedger.settleTableToPlayer({ wallet, tableId, amountLamports, mint, referenceId }).catch((error) => {
      console.error('[pookie-poker] failed to move table ledger funds to player', error)
    })
  }
}

function shortWallet(wallet: string) {
  return wallet.length > 10 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet
}

function createInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

function hashJson(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function nextDealerSeat(table: TableRuntime) {
  const seats = Array.from(table.players.values())
    .filter((player) => player.seatIndex !== undefined)
    .map((player) => player.seatIndex as number)
    .sort((a, b) => a - b)
  if (seats.length === 0) return 0
  return seats.find((seat) => seat > table.dealerSeat) ?? seats[0]
}
