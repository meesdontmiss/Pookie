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
    name: 'Free Test Match',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0,
    description: 'Practice arena - no wager required. Perfect for testing!',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'small-sumo-005',
    name: 'Small Sumo',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0.05,
    description: 'Low-stakes quick brawls.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'small-sumo-01',
    name: 'Small Sumo',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0.1,
    description: 'Low-stakes quick brawls.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'small-sumo-4',
    name: 'Small Sumo',
    gameMode: 'SMALL_SUMO',
    capacity: 4,
    wager: 0.25,
    description: 'Tight ring, fast knockouts. Great for warmups.',
    art: '/images/BANNER-OPTIMIZED.png',
  },
  {
    id: 'big-sumo-6',
    name: 'Big Sumo',
    gameMode: 'BIG_SUMO',
    capacity: 6,
    wager: 0.5,
    description: 'Spacious arena, longer brawls and comebacks.',
  },
  {
    id: 'pookiemania-8',
    name: 'Pookiemania',
    gameMode: 'POOKIEMANIA',
    capacity: 8,
    wager: 1.0,
    description: 'Pookiemania — hazards, low friction, pure madness.',
  },
] 

