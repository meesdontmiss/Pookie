import type { Card } from '../../shared/pookie-poker'
import type { PlayerSettlementInput, SettlementResult } from './types'
import { compareHands, evaluateBestHand } from './evaluator'
import { calculateRake } from './rake'
import type { RakeConfig } from '../../shared/pookie-poker'

export function settleShowdown(params: {
  players: PlayerSettlementInput[]
  communityCards: Card[]
  sawFlop: boolean
  rakeConfig: RakeConfig
}): SettlementResult {
  const committedPlayers = params.players.filter((player) => player.committed > 0n)
  const totalPot = committedPlayers.reduce((sum, player) => sum + player.committed, 0n)
  const rake = calculateRake(totalPot, params.sawFlop, params.rakeConfig)

  const levels = Array.from(new Set(committedPlayers.map((player) => player.committed).filter((amount) => amount > 0n)))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  const payouts = new Map<string, bigint>()
  for (const player of params.players) payouts.set(player.wallet, 0n)

  const sidePots: SettlementResult['sidePots'] = []
  let previous = 0n
  let remainingRake = rake

  for (const level of levels) {
    const contributors = committedPlayers.filter((player) => player.committed >= level)
    let potAmount = (level - previous) * BigInt(contributors.length)
    previous = level

    const rakeFromThisPot = remainingRake > potAmount ? potAmount : remainingRake
    potAmount -= rakeFromThisPot
    remainingRake -= rakeFromThisPot

    const eligible = contributors.filter((player) => !player.folded)
    if (eligible.length === 0 || potAmount === 0n) {
      sidePots.push({ amount: potAmount, eligibleWallets: [], winnerWallets: [] })
      continue
    }

    const ranked = eligible.map((player) => ({
      player,
      hand: evaluateBestHand([...player.holeCards, ...params.communityCards]),
    }))

    const best = ranked.reduce((winner, next) => (compareHands(next.hand, winner.hand) > 0 ? next : winner))
    const winners = ranked.filter((entry) => compareHands(entry.hand, best.hand) === 0)
    const share = potAmount / BigInt(winners.length)
    let oddChips = potAmount % BigInt(winners.length)

    const orderedWinners = winners.sort((a, b) => a.player.seatIndex - b.player.seatIndex)
    for (const winner of orderedWinners) {
      const extra = oddChips > 0n ? 1n : 0n
      payouts.set(winner.player.wallet, (payouts.get(winner.player.wallet) ?? 0n) + share + extra)
      if (oddChips > 0n) oddChips--
    }

    sidePots.push({
      amount: potAmount,
      eligibleWallets: eligible.map((player) => player.wallet),
      winnerWallets: orderedWinners.map((entry) => entry.player.wallet),
    })
  }

  const settlements = params.players.map((player) => {
    const won = payouts.get(player.wallet) ?? 0n
    const delta = won - player.committed
    const contributedRatio =
      totalPot === 0n ? 0n : (rake * player.committed) / totalPot
    return {
      wallet: player.wallet,
      seatIndex: player.seatIndex,
      delta,
      won,
      committed: player.committed,
      rakeContributed: contributedRatio,
    }
  })

  return {
    pot: totalPot,
    rake,
    payouts: settlements,
    sidePots,
  }
}

