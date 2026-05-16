import type { PokerAction, RakeConfig } from '../../shared/pookie-poker'
import { applyPokerAction, createHandState, stateHash } from './actions'

export type ReplayInputAction = {
  wallet: string
  action: PokerAction
  amount?: bigint
}

export function replayHand(params: {
  tableId: string
  handNumber: number
  seed: string
  players: Array<{ wallet: string; seatIndex: number; stack: bigint }>
  dealerSeat: number
  smallBlind: bigint
  bigBlind: bigint
  rakeConfig: RakeConfig
  actions: ReplayInputAction[]
}) {
  let state = createHandState(params)
  for (const action of params.actions) {
    state = applyPokerAction(state, action.wallet, action.action, action.amount ?? 0n)
  }
  return {
    state,
    hash: stateHash(state),
  }
}

