import assert from 'node:assert/strict'
import { createDeck, deterministicShuffle, assertUniqueDeck } from '../deck'
import { evaluateBestHand } from '../evaluator'
import { calculateRake } from '../rake'
import { settleShowdown } from '../settlement'
import { replayHand } from '../replay'
import { applyPokerAction, createHandState } from '../actions'
import type { Card, RakeConfig } from '../../../shared/pookie-poker'

const rakeConfig: RakeConfig = {
  rakePercentBps: 400,
  rakeCapLamports: '30000000',
  noFlopNoDrop: true,
  minPotForRakeLamports: '10000000',
}

function c(value: string): Card {
  return { rank: value[0] as Card['rank'], suit: value[1] as Card['suit'] }
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('deck has 52 unique cards', () => {
  const deck = createDeck()
  assert.equal(deck.length, 52)
  assertUniqueDeck(deck)
})

test('shuffle is deterministic by seed', () => {
  assert.deepEqual(deterministicShuffle('seed-a'), deterministicShuffle('seed-a'))
  assert.notDeepEqual(deterministicShuffle('seed-a').slice(0, 5), deterministicShuffle('seed-b').slice(0, 5))
})

test('hand evaluator ranks straight flush above four of a kind', () => {
  const straightFlush = evaluateBestHand([c('As'), c('Ks'), c('Qs'), c('Js'), c('Ts'), c('2d'), c('3c')])
  const quads = evaluateBestHand([c('Ah'), c('Ad'), c('Ac'), c('As'), c('9d'), c('2d'), c('3c')])
  assert.equal(straightFlush.category, 'straight_flush')
  assert.equal(quads.category, 'four_kind')
  assert.equal(straightFlush.score > quads.score, true)
})

test('rake respects no flop no drop and cap', () => {
  assert.equal(calculateRake(1_000_000_000n, false, rakeConfig), 0n)
  assert.equal(calculateRake(1_000_000_000n, true, rakeConfig), 30_000_000n)
  assert.equal(calculateRake(100_000_000n, true, rakeConfig), 4_000_000n)
})

test('settlement creates side pots and awards main pot independently', () => {
  const result = settleShowdown({
    sawFlop: true,
    rakeConfig: { ...rakeConfig, rakePercentBps: 0 },
    communityCards: [c('2c'), c('3d'), c('4h'), c('9s'), c('8d')],
    players: [
      { wallet: 'a', seatIndex: 0, committed: 100n, folded: false, holeCards: [c('As'), c('Ah')] },
      { wallet: 'b', seatIndex: 1, committed: 300n, folded: false, holeCards: [c('Kc'), c('Kh')] },
      { wallet: 'c', seatIndex: 2, committed: 300n, folded: false, holeCards: [c('Qh'), c('Qs')] },
    ],
  })

  const a = result.payouts.find((p) => p.wallet === 'a')!
  const b = result.payouts.find((p) => p.wallet === 'b')!
  assert.equal(a.won, 300n)
  assert.equal(b.won, 400n)
  assert.equal(result.sidePots.length, 2)
})

test('split pots divide evenly with odd chip by seat order', () => {
  const result = settleShowdown({
    sawFlop: true,
    rakeConfig: { ...rakeConfig, rakePercentBps: 0 },
    communityCards: [c('2c'), c('3d'), c('4h'), c('5s'), c('6d')],
    players: [
      { wallet: 'a', seatIndex: 0, committed: 101n, folded: false, holeCards: [c('As'), c('Kh')] },
      { wallet: 'b', seatIndex: 1, committed: 101n, folded: false, holeCards: [c('Ad'), c('Kc')] },
    ],
  })
  assert.equal(result.payouts.find((p) => p.wallet === 'a')!.won, 101n)
  assert.equal(result.payouts.find((p) => p.wallet === 'b')!.won, 101n)
})

test('replay produces stable final hash', () => {
  const input = {
    tableId: 'test-table',
    handNumber: 1,
    seed: 'replay-seed',
    players: [
      { wallet: 'a', seatIndex: 0, stack: 1000n },
      { wallet: 'b', seatIndex: 1, stack: 1000n },
    ],
    dealerSeat: 0,
    smallBlind: 10n,
    bigBlind: 20n,
    rakeConfig,
    actions: [
      { wallet: 'a', action: 'call' as const },
      { wallet: 'b', action: 'check' as const },
      { wallet: 'b', action: 'check' as const },
      { wallet: 'a', action: 'check' as const },
      { wallet: 'b', action: 'check' as const },
      { wallet: 'a', action: 'check' as const },
      { wallet: 'b', action: 'check' as const },
      { wallet: 'a', action: 'check' as const },
    ],
  }
  assert.equal(replayHand(input).hash, replayHand(input).hash)
})

test('heads-up dealer posts small blind and acts first preflop', () => {
  const state = createHandState({
    tableId: 'heads-up',
    handNumber: 1,
    seed: 'heads-up-seed',
    players: [
      { wallet: 'dealer', seatIndex: 0, stack: 1000n },
      { wallet: 'bb', seatIndex: 1, stack: 1000n },
    ],
    dealerSeat: 0,
    smallBlind: 10n,
    bigBlind: 20n,
    rakeConfig,
  })

  assert.equal(state.smallBlindSeat, 0)
  assert.equal(state.bigBlindSeat, 1)
  assert.equal(state.currentTurnSeat, 0)
})

test('big blind gets preflop option after small blind calls heads-up', () => {
  const state = createHandState({
    tableId: 'bb-option',
    handNumber: 1,
    seed: 'bb-option-seed',
    players: [
      { wallet: 'dealer', seatIndex: 0, stack: 1000n },
      { wallet: 'bb', seatIndex: 1, stack: 1000n },
    ],
    dealerSeat: 0,
    smallBlind: 10n,
    bigBlind: 20n,
    rakeConfig,
  })

  const afterCall = applyPokerAction(state, 'dealer', 'call')
  assert.equal(afterCall.street, 'preflop')
  assert.equal(afterCall.currentTurnSeat, 1)
  const afterCheck = applyPokerAction(afterCall, 'bb', 'check')
  assert.equal(afterCheck.street, 'flop')
  assert.equal(afterCheck.communityCards.length, 3)
})

test('out-of-turn actions are rejected', () => {
  const state = createHandState({
    tableId: 'turn-test',
    handNumber: 1,
    seed: 'turn-test-seed',
    players: [
      { wallet: 'a', seatIndex: 0, stack: 1000n },
      { wallet: 'b', seatIndex: 1, stack: 1000n },
    ],
    dealerSeat: 0,
    smallBlind: 10n,
    bigBlind: 20n,
    rakeConfig,
  })

  assert.throws(() => applyPokerAction(state, 'b', 'check'), /out of turn/)
})

test('all-in heads-up deals remaining board and goes to showdown', () => {
  const state = createHandState({
    tableId: 'all-in',
    handNumber: 1,
    seed: 'all-in-seed',
    players: [
      { wallet: 'a', seatIndex: 0, stack: 100n },
      { wallet: 'b', seatIndex: 1, stack: 100n },
    ],
    dealerSeat: 0,
    smallBlind: 10n,
    bigBlind: 20n,
    rakeConfig,
  })

  const aAllIn = applyPokerAction(state, 'a', 'allin')
  const bAllIn = applyPokerAction(aAllIn, 'b', 'allin')
  assert.equal(bAllIn.street, 'showdown')
  assert.equal(bAllIn.communityCards.length, 5)
})
