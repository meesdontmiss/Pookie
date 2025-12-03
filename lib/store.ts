import { create } from 'zustand'
import { Player } from '@/components/game/player'

export interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: string
}

export interface GameSettings {
  volume: number
  sensitivity: number
  quality: 'low' | 'medium' | 'high'
  showFPS: boolean
}

export interface DebugState {
  showColliders: boolean
  showStats: boolean
}

export interface GameState {
  players: Player[]
  currentPlayer: Player | null
  chatMessages: ChatMessage[]
  settings: GameSettings
  debug: DebugState
  walletAddress?: string
  isNFTHolder?: boolean
  isTokenHolder?: boolean
}

// Default settings
export const defaultSettings: GameSettings = {
  volume: 0.5,
  sensitivity: 1.0,
  quality: 'high',
  showFPS: false
}

// Initial state
const initialState: GameState = {
  players: [],
  currentPlayer: null,
  chatMessages: [],
  settings: defaultSettings,
  debug: {
    showColliders: false,
    showStats: false
  }
}

// Define actions structure separately for typing
const actions = {
  addPlayer: (player: Player) => {},
  removePlayer: (playerId: string) => {},
  setPlayers: (players: Player[]) => {},
  updatePlayerPosition: (id: string, position: [number, number, number]) => {},
  updatePlayerRotation: (id: string, rotation: [number, number, number]) => {},
  setCurrentPlayer: (player: Player | null) => {},
  addMessage: (message: ChatMessage) => {},
  updateSettings: (newSettings: Partial<GameSettings>) => {},
  toggleDebugFlag: (flag: keyof DebugState) => {},
  setWalletAddress: (address: string | undefined) => {},
  setIsNFTHolder: (isHolder: boolean) => {},
  setIsTokenHolder: (isHolder: boolean) => {},
}

// Type for the store, combining state and actions
export type GameStore = GameState & { actions: typeof actions };

// Create the Zustand store
export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // Implement actions using set
  actions: {
    addPlayer: (player: Player) =>
      set((state) => {
        // Avoid adding duplicates if player already exists
        if (state.players.some(p => p.id === player.id)) {
          return {}; // No change
        }
        return { players: [...state.players, player] };
      }),
      
    setPlayers: (players: Player[]) => 
      set({ players: players }),

    removePlayer: (playerId: string) =>
      set((state) => ({
        players: state.players.filter((player) => player.id !== playerId),
      })),

    updatePlayerPosition: (id: string, position: [number, number, number]) =>
      set((state) => ({
        players: state.players.map((player) =>
          player.id === id ? { ...player, position } : player
        ),
        currentPlayer:
          state.currentPlayer?.id === id
            ? { ...state.currentPlayer, position }
            : state.currentPlayer,
      })),

    updatePlayerRotation: (id: string, rotation: [number, number, number]) =>
      set((state) => ({
        players: state.players.map((player) =>
          player.id === id ? { ...player, rotation } : player
        ),
        currentPlayer:
          state.currentPlayer?.id === id
            ? { ...state.currentPlayer, rotation }
            : state.currentPlayer,
      })),

    setCurrentPlayer: (player: Player | null) => set({ currentPlayer: player }),

    addMessage: (message: ChatMessage) =>
      set((state) => ({
        // Avoid adding duplicate messages by ID
        chatMessages: state.chatMessages.some(m => m.id === message.id) 
            ? state.chatMessages 
            : [...state.chatMessages, message].slice(-100), 
      })),
      
    updateSettings: (newSettings: Partial<GameSettings>) => 
      set((state) => ({
          settings: { ...state.settings, ...newSettings }
      })),

    toggleDebugFlag: (flag: keyof DebugState) => 
        set((state) => ({
            debug: { ...state.debug, [flag]: !state.debug[flag]}
        })),

    setWalletAddress: (address: string | undefined) => set({ walletAddress: address }),

    setIsNFTHolder: (isHolder: boolean) => set({ isNFTHolder: isHolder }),

    setIsTokenHolder: (isHolder: boolean) => set({ isTokenHolder: isHolder }),
  },
}))

// Selector hook for accessing actions easily
export const useGameActions = () => useGameStore((state) => state.actions) 