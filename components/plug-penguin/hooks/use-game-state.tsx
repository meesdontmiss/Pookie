// Game state types
interface GameState {
  isIglooEntered: boolean
  isFishing: boolean
  fishingProgress: number
  caughtFish: string[]
  
  // Actions
  enterIgloo: () => void
  exitIgloo: () => void
  startFishing: () => void
  stopFishing: () => void
  updateFishingProgress: (progress: number) => void
  catchFish: (fishType: string) => void
}

// Default state
const defaultState = {
  isIglooEntered: false,
  isFishing: false,
  fishingProgress: 0,
  caughtFish: [] as string[]
};

// Module-level state
let gameState = { ...defaultState };
const listeners: Array<() => void> = [];

// Simple state management
export const useGameState = () => {
  // Get current state
  const getState = () => gameState;
  
  // Update state
  const setState = (newState: Partial<typeof gameState>) => {
    gameState = { ...gameState, ...newState };
    // Notify listeners
    listeners.forEach(listener => listener());
  };
  
  // Subscribe to state changes
  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };
  
  return {
    ...gameState,
    // Actions
    enterIgloo: () => setState({ isIglooEntered: true }),
    exitIgloo: () => setState({ isIglooEntered: false }),
    startFishing: () => setState({ isFishing: true }),
    stopFishing: () => setState({ isFishing: false, fishingProgress: 0 }),
    updateFishingProgress: (progress: number) => setState({ fishingProgress: progress }),
    catchFish: (fishType: string) => 
      setState({ 
        caughtFish: [...gameState.caughtFish, fishType],
        isFishing: false,
        fishingProgress: 0
      })
  };
};

export default useGameState; 