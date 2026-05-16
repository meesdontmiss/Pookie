import type { RakeConfig } from './types'

export const POOKIE_POKER_REAL_MONEY_ENABLED_DEFAULT = false

export const POOKIE_POKER_SOCKET_NAMESPACE = '/pookie-poker'

export const DEFAULT_POKIE_POKER_RAKE: RakeConfig = {
  rakePercentBps: 400,
  rakeCapLamports: '30000000',
  noFlopNoDrop: true,
  minPotForRakeLamports: '10000000',
}

export const POKIE_POKER_SEAT_ANCHORS = [
  { seatIndex: 0, position: [-2.5, 1.5, 0] as const },
  { seatIndex: 1, position: [-1.3, 1.8, -1.5] as const },
  { seatIndex: 2, position: [1.3, 1.8, -1.5] as const },
  { seatIndex: 3, position: [2.5, 1.5, 0] as const },
  { seatIndex: 4, position: [1.3, 1.8, 1.5] as const },
  { seatIndex: 5, position: [-1.3, 1.8, 1.5] as const },
] as const

export const PLAY_MONEY_STARTING_STACK_LAMPORTS = '100000000000'

