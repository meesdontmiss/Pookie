export type GameMode = 'SMALL_SUMO' | 'BIG_SUMO' | 'POOKIEMANIA'

export interface HardLobby {
  id: string
  name: string
  gameMode: GameMode
  capacity: number
  wager: number
  description: string
  art?: string
}

export const HARDCODED_LOBBIES: HardLobby[] = [
  {
    id: 'free-test-match',
    name: 'Free Lobby',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0,
    description: 'Live free practice with other players. No wager required.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'small-sumo-005',
    name: 'Low Wager',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0.05,
    description: 'Low-stakes quick brawls for ranked warmups.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'medium-sumo-025',
    name: 'Medium Wager',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0.25,
    description: 'Focused ranked matches with a bigger prize pool.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
]
