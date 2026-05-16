import type { ClientTableView, PokerAction, PokerTableConfig, TablePublicState } from './types'

export type PokerClientToServerEvents = {
  'table:list': (payload: undefined, ack?: PokerAck<{ tables: TablePublicState[] }>) => void
  'table:create': (payload: { config: PokerTableConfig }, ack?: PokerAck<{ tableId: string; inviteCode?: string }>) => void
  'table:join': (payload: { tableId: string; wallet: string; displayName?: string }, ack?: PokerAck<ClientTableView>) => void
  'table:leave': (payload: { tableId: string }, ack?: PokerAck) => void
  'table:sit': (payload: { tableId: string; seatIndex: number; buyInLamports: string }, ack?: PokerAck<ClientTableView>) => void
  'table:stand': (payload: { tableId: string }, ack?: PokerAck<ClientTableView>) => void
  'table:buyin:confirm': (payload: { tableId: string; amountLamports: string; txSignature?: string }, ack?: PokerAck) => void
  'table:chat': (payload: { tableId: string; message: string }, ack?: PokerAck) => void
  'hand:ready': (payload: { tableId: string }, ack?: PokerAck<ClientTableView>) => void
  'action:fold': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:check': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:call': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:bet': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:raise': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:allin': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:show': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'action:muck': (payload: PokerActionPayload, ack?: PokerAck<ClientTableView>) => void
  'cashout:request': (payload: { tableId: string; amountLamports: string }, ack?: PokerAck) => void
  'private:invite': (payload: { tableId: string }, ack?: PokerAck<{ inviteCode: string }>) => void
  'reconnect:resume': (payload: { tableId: string; wallet: string }, ack?: PokerAck<ClientTableView>) => void
}

export type PokerServerToClientEvents = {
  'table:list_update': (payload: { tables: TablePublicState[] }) => void
  'table:state': (payload: ClientTableView) => void
  'table:player_joined': (payload: { tableId: string; wallet: string; displayName: string }) => void
  'table:player_left': (payload: { tableId: string; wallet: string }) => void
  'table:seat_update': (payload: TablePublicState) => void
  'table:stack_update': (payload: TablePublicState) => void
  'hand:started': (payload: ClientTableView) => void
  'hand:hole_cards': (payload: { tableId: string; cards: ClientTableView['me'] extends { holeCards?: infer T } ? T : never }) => void
  'hand:street_update': (payload: ClientTableView) => void
  'hand:action_required': (payload: ClientTableView) => void
  'hand:action_broadcast': (payload: { tableId: string; wallet: string; action: PokerAction; amountLamports?: string }) => void
  'hand:pot_update': (payload: TablePublicState) => void
  'hand:showdown': (payload: ClientTableView) => void
  'hand:settled': (payload: ClientTableView) => void
  'hand:receipt': (payload: { tableId: string; handNumber: number; receiptId: string }) => void
  'cashout:complete': (payload: { tableId: string; wallet: string; amountLamports: string; txSignature?: string }) => void
  error: (payload: { code: string; message: string }) => void
  warning: (payload: { code: string; message: string }) => void
  compliance_block: (payload: { code: string; message: string }) => void
  'table:paused': (payload: { tableId: string; reason: string }) => void
}

export type PokerActionPayload = {
  tableId: string
  amountLamports?: string
  idempotencyKey?: string
}

export type PokerAck<T = undefined> = (response: T extends undefined ? PokerAckBase : PokerAckBase & { data?: T }) => void

export type PokerAckBase = {
  ok: boolean
  error?: { code: string; message: string }
}
