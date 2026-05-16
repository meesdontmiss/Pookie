import crypto from 'crypto'
import type { Card, PokerAction, RakeConfig } from '../../shared/pookie-poker'
import type { EnginePlayer, HandState } from './types'
import { deterministicShuffle } from './deck'

type HandPlayerInput = {
  wallet: string
  seatIndex: number
  stack: bigint
}

export function createHandState(params: {
  tableId: string
  handNumber: number
  seed: string
  players: HandPlayerInput[]
  dealerSeat: number
  smallBlind: bigint
  bigBlind: bigint
  rakeConfig: RakeConfig
}): HandState {
  if (params.players.length < 2) throw new Error('At least two players are required')

  const ordered = [...params.players].sort((a, b) => a.seatIndex - b.seatIndex)
  const deck = deterministicShuffle(params.seed)
  const enginePlayers: EnginePlayer[] = ordered.map((player, index) => ({
    ...player,
    stack: player.stack,
    currentBet: 0n,
    committed: 0n,
    folded: false,
    allIn: false,
    holeCards: [deck[index * 2], deck[index * 2 + 1]],
  }))

  const smallBlindSeat = nextOccupiedSeat(enginePlayers, params.dealerSeat)
  const bigBlindSeat = nextOccupiedSeat(enginePlayers, smallBlindSeat)
  const firstActionSeat = nextOccupiedSeat(enginePlayers, bigBlindSeat)
  const state: HandState = {
    tableId: params.tableId,
    handNumber: params.handNumber,
    street: 'preflop',
    dealerSeat: params.dealerSeat,
    smallBlindSeat,
    bigBlindSeat,
    currentTurnSeat: firstActionSeat,
    minRaise: params.bigBlind,
    currentBet: params.bigBlind,
    pot: 0n,
    communityCards: [],
    deck: deck.slice(enginePlayers.length * 2),
    players: enginePlayers,
    actionLog: [],
    sawFlop: false,
    rakeConfig: params.rakeConfig,
    settled: false,
  }

  postBlind(state, smallBlindSeat, params.smallBlind, 'post_small_blind')
  postBlind(state, bigBlindSeat, params.bigBlind, 'post_big_blind')
  return state
}

function postBlind(state: HandState, seatIndex: number, amount: bigint, syntheticAction: string) {
  const player = getPlayerBySeat(state, seatIndex)
  const posted = amount > player.stack ? player.stack : amount
  player.stack -= posted
  player.currentBet += posted
  player.committed += posted
  player.allIn = player.stack === 0n
  state.pot += posted
  state.actionLog.push({
    sequence: state.actionLog.length + 1,
    wallet: player.wallet,
    seatIndex: player.seatIndex,
    action: syntheticAction as PokerAction,
    amount: posted,
    street: state.street,
    stateHashBefore: '',
    stateHashAfter: stateHash(state),
    createdAt: new Date(0).toISOString(),
  })
}

export function applyPokerAction(state: HandState, wallet: string, action: PokerAction, amount = 0n): HandState {
  const next = cloneHandState(state)
  if (next.settled) throw new Error('Hand is already settled')
  const player = next.players.find((candidate) => candidate.wallet === wallet)
  if (!player) throw new Error('Player not in hand')
  if (next.currentTurnSeat !== player.seatIndex) throw new Error('Action is out of turn')
  if (player.folded || player.allIn) throw new Error('Player cannot act')

  const before = stateHash(next)
  const toCall = next.currentBet - player.currentBet

  if (action === 'fold') {
    player.folded = true
  } else if (action === 'check') {
    if (toCall !== 0n) throw new Error('Cannot check while facing a bet')
  } else if (action === 'call') {
    commitChips(next, player, toCall)
  } else if (action === 'bet') {
    if (next.currentBet !== 0n) throw new Error('Cannot bet after a bet exists')
    if (amount <= 0n) throw new Error('Bet must be positive')
    commitChips(next, player, amount)
    next.currentBet = player.currentBet
    next.minRaise = amount
  } else if (action === 'raise') {
    if (amount <= next.currentBet) throw new Error('Raise amount must exceed current bet')
    const raiseSize = amount - next.currentBet
    if (raiseSize < next.minRaise && amount < player.currentBet + player.stack) {
      throw new Error('Raise is below minimum')
    }
    commitChips(next, player, amount - player.currentBet)
    next.minRaise = raiseSize
    next.currentBet = player.currentBet
  } else if (action === 'allin') {
    const targetBet = player.currentBet + player.stack
    commitChips(next, player, player.stack)
    if (targetBet > next.currentBet) {
      const raiseSize = targetBet - next.currentBet
      if (raiseSize >= next.minRaise) next.minRaise = raiseSize
      next.currentBet = targetBet
    }
  } else if (action === 'show' || action === 'muck') {
    throw new Error(`${action} is only valid during showdown`)
  }

  player.lastAction = action
  next.actionLog.push({
    sequence: next.actionLog.length + 1,
    wallet,
    seatIndex: player.seatIndex,
    action,
    amount,
    street: next.street,
    stateHashBefore: before,
    stateHashAfter: '',
    createdAt: new Date(next.actionLog.length + 1).toISOString(),
  })

  advanceTurnOrStreet(next)
  next.actionLog[next.actionLog.length - 1].stateHashAfter = stateHash(next)
  return next
}

function commitChips(state: HandState, player: EnginePlayer, amount: bigint) {
  if (amount < 0n) throw new Error('Cannot commit negative chips')
  const committed = amount > player.stack ? player.stack : amount
  player.stack -= committed
  player.currentBet += committed
  player.committed += committed
  player.allIn = player.stack === 0n
  state.pot += committed
}

function advanceTurnOrStreet(state: HandState) {
  const activePlayers = state.players.filter((player) => !player.folded)
  if (activePlayers.length <= 1) {
    state.street = 'showdown'
    state.currentTurnSeat = undefined
    return
  }

  const actorsNeedingAction = state.players.filter(
    (player) => !player.folded && !player.allIn && player.currentBet < state.currentBet,
  )
  if (actorsNeedingAction.length === 0) {
    const canAct = state.players.filter((player) => !player.folded && !player.allIn)
    const lastActionSeat = state.currentTurnSeat
    const nextSeat = lastActionSeat === undefined ? undefined : nextOccupiedSeat(canAct, lastActionSeat)
    const everyoneMatched = state.players.every((player) => player.folded || player.allIn || player.currentBet === state.currentBet)
    if (everyoneMatched && (canAct.length <= 1 || nextSeat === firstActiveSeatAfterDealer(state))) {
      advanceStreet(state)
      return
    }
  }

  if (state.currentTurnSeat !== undefined) {
    state.currentTurnSeat = nextActionSeat(state, state.currentTurnSeat)
  }
}

function advanceStreet(state: HandState) {
  for (const player of state.players) player.currentBet = 0n
  state.currentBet = 0n
  state.minRaise = 0n

  if (state.street === 'preflop') {
    state.street = 'flop'
    state.communityCards.push(state.deck.shift() as Card, state.deck.shift() as Card, state.deck.shift() as Card)
    state.sawFlop = true
  } else if (state.street === 'flop') {
    state.street = 'turn'
    state.communityCards.push(state.deck.shift() as Card)
  } else if (state.street === 'turn') {
    state.street = 'river'
    state.communityCards.push(state.deck.shift() as Card)
  } else {
    state.street = 'showdown'
    state.currentTurnSeat = undefined
    return
  }

  state.currentTurnSeat = firstActiveSeatAfterDealer(state)
}

function firstActiveSeatAfterDealer(state: HandState) {
  return nextActionSeat(state, state.dealerSeat)
}

function nextActionSeat(state: HandState, fromSeat: number) {
  const eligible = state.players.filter((player) => !player.folded && !player.allIn)
  if (eligible.length === 0) return undefined
  return nextOccupiedSeat(eligible, fromSeat)
}

function nextOccupiedSeat(players: Pick<EnginePlayer, 'seatIndex'>[], fromSeat: number) {
  const seats = players.map((player) => player.seatIndex).sort((a, b) => a - b)
  return seats.find((seat) => seat > fromSeat) ?? seats[0]
}

function getPlayerBySeat(state: HandState, seatIndex: number) {
  const player = state.players.find((candidate) => candidate.seatIndex === seatIndex)
  if (!player) throw new Error(`No player at seat ${seatIndex}`)
  return player
}

export function stateHash(state: HandState) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        tableId: state.tableId,
        handNumber: state.handNumber,
        street: state.street,
        currentTurnSeat: state.currentTurnSeat,
        currentBet: state.currentBet.toString(),
        pot: state.pot.toString(),
        communityCards: state.communityCards,
        players: state.players.map((player) => ({
          wallet: player.wallet,
          seatIndex: player.seatIndex,
          stack: player.stack.toString(),
          currentBet: player.currentBet.toString(),
          committed: player.committed.toString(),
          folded: player.folded,
          allIn: player.allIn,
          lastAction: player.lastAction,
        })),
      }),
    )
    .digest('hex')
}

export function cloneHandState(state: HandState): HandState {
  return {
    ...state,
    deck: state.deck.map((card) => ({ ...card })),
    communityCards: state.communityCards.map((card) => ({ ...card })),
    players: state.players.map((player) => ({
      ...player,
      holeCards: player.holeCards.map((card) => ({ ...card })),
    })),
    actionLog: state.actionLog.map((entry) => ({ ...entry })),
  }
}

