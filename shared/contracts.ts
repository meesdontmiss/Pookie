export type ClientToServer =
  | { type: 'join_lobby'; lobbyId: string; username: string; wallet: string }
  | { type: 'confirm_wager'; lobbyId: string; amount: number; txSignature: string }
  | { type: 'set_ready'; lobbyId: string; ready: boolean }
  | { type: 'leave_lobby'; lobbyId: string }
  | { type: 'reconnect'; lobbyId: string; lastEventId?: string }

export type ServerToClient =
  | { type: 'lobby_state'; lobbyId: string; players: UIRoomPlayer[]; countdown?: number; status: 'open' | 'countdown' }
  | { type: 'error'; message: string; code: string }
  | { type: 'kicked'; reason: string }
  | { type: 'match_start'; payload: GameStartPacket }

export interface UIRoomPlayer {
  id: string
  username: string
  walletShort: string
  wager: number
  wagerConfirmed: boolean
  ready: boolean
}

export interface GameStartPacket {
  matchId: string
  seed: number
  players: Array<{ id: string; username: string; skin: string; spawnIndex: number; isAi?: boolean }>
  wagerAmount: number
  gameMode: string
  serverTimestamp: number
}


