export type ClientToServer =
  | { type: 'join_lobby'; lobbyId: string; username: string; wallet: string }
  | { type: 'confirm_wager'; lobbyId: string; amount: number; txSignature: string }
  | { type: 'set_ready'; lobbyId: string; ready: boolean }
  | { type: 'select_color'; lobbyId: string; color: string }
  | { type: 'leave_lobby'; lobbyId: string }
  | { type: 'reconnect'; lobbyId: string; lastEventId?: string }
  | { type: 'admin_end_match'; matchId: string; winnerWallet: string }
  | { type: 'match_result'; matchId: string; winnerWallet: string }

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
  ballColor?: string
}

// Available ball colors — only one player per color per lobby
export const BALL_COLORS: { id: string; hex: string; name: string }[] = [
  { id: 'pink',   hex: '#ff66cc', name: 'Pink' },
  { id: 'blue',   hex: '#66ccff', name: 'Blue' },
  { id: 'green',  hex: '#66ff88', name: 'Green' },
  { id: 'orange', hex: '#ff9944', name: 'Orange' },
  { id: 'purple', hex: '#bb66ff', name: 'Purple' },
  { id: 'red',    hex: '#ff4455', name: 'Red' },
  { id: 'cyan',   hex: '#00ffdd', name: 'Cyan' },
  { id: 'gold',   hex: '#ffd700', name: 'Gold' },
]

export interface GameStartPacket {
  matchId: string
  seed: number
  players: Array<{ id: string; username: string; skin: string; spawnIndex: number; isAi?: boolean; ballColor?: string }>
  wagerAmount: number
  gameMode: string
  serverTimestamp: number
}


