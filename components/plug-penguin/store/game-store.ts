// Player state interface
interface PlayerState {
  position: [number, number, number]
  rotation: [number, number, number]
  velocity: [number, number, number]
  isMoving: boolean
  isJumping: boolean
  isRunning: boolean
  animationState: string
}

// Default player state
const defaultPlayerState: PlayerState = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  velocity: [0, 0, 0],
  isMoving: false,
  isJumping: false,
  isRunning: false,
  animationState: 'idle'
}

// Module-level state
let playerState = { ...defaultPlayerState };
const listeners: Array<() => void> = [];

// Simple state management
export const useGameStore = () => {
  // Get current state
  const getState = () => playerState;
  
  // Update state
  const setState = (newState: Partial<PlayerState>) => {
    playerState = { ...playerState, ...newState };
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
    getState,
    setState,
    subscribe,
    // Convenience methods
    updatePlayerPosition: (position: [number, number, number]) => 
      setState({ position }),
    updatePlayerRotation: (rotation: [number, number, number]) => 
      setState({ rotation }),
    updatePlayerVelocity: (velocity: [number, number, number]) => 
      setState({ velocity }),
    setPlayerMoving: (isMoving: boolean) => 
      setState({ isMoving }),
    setPlayerJumping: (isJumping: boolean) => 
      setState({ isJumping }),
    setPlayerRunning: (isRunning: boolean) => 
      setState({ isRunning }),
    updatePlayerAnimationState: (animationState: string) => 
      setState({ animationState }),
    resetState: () => setState(defaultPlayerState)
  };
};

export default useGameStore; 