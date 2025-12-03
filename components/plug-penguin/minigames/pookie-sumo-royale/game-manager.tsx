import React, { createContext, useContext, useEffect, useState, useCallback, ErrorInfo } from 'react';
import { useLocalStorage } from '../../../../hooks/use-local-storage';
import defaultLevels from './default-levels';
import importMarbleMouseLevels from './level-importer';
import { Level } from './levels';

// Error boundary to catch any errors in the game
class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean, errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Game component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-red-900 text-white">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Game Error</h2>
            <p className="mb-4">{this.state.errorMessage}</p>
            <button 
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded shadow"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Game states
export type GameState = 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'levelSelect';

// Game context type
interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentLevel: Level | null;
  setCurrentLevel: (level: Level | null) => void;
  levels: Level[];
  score: number;
  timeRemaining: number;
  collectiblesCollected: number;
  totalCollectibles: number;
  isLevelLoading: boolean;
  
  // Level management
  currentLevelIndex: number;
  setCurrentLevelIndex: (index: number) => void;
  highestUnlockedLevel: number;
  
  // Actions
  addToScore: (points: number) => void;
  incrementCollectiblesCollected: () => void;
  resetLevel: () => void;
  nextLevel: () => void;
  
  // Level completion
  setLevelScore: (levelId: number, score: number) => void;
  isLevelCompleted: (levelId: number) => boolean;
  getLevelScore: (levelId: number) => number;
  getThreeStarScore: (levelId: number) => number;
}

// Create context with default values
const GameContext = createContext<GameContextType>({
  gameState: 'menu',
  setGameState: () => {},
  currentLevel: null,
  setCurrentLevel: () => {},
  levels: [],
  score: 0,
  timeRemaining: 60,
  collectiblesCollected: 0,
  totalCollectibles: 0,
  isLevelLoading: false,
  
  currentLevelIndex: 0,
  setCurrentLevelIndex: () => {},
  highestUnlockedLevel: 1,
  
  addToScore: () => {},
  incrementCollectiblesCollected: () => {},
  resetLevel: () => {},
  nextLevel: () => {},
  
  setLevelScore: () => {},
  isLevelCompleted: () => false,
  getLevelScore: () => 0,
  getThreeStarScore: () => 0,
});

// Game manager props
interface GameManagerProps {
  children: React.ReactNode;
}

// Game manager component
export function GameManager({ children }: GameManagerProps) {
  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [collectiblesCollected, setCollectiblesCollected] = useState(0);
  const [totalCollectibles, setTotalCollectibles] = useState(0);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLevelLoading, setIsLevelLoading] = useState(false);

  // Persistent storage 
  const [completedLevels, setCompletedLevels] = useLocalStorage<number[]>('pookie-ball-completed-levels', []);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useLocalStorage<number>('pookie-ball-highest-level', 1);
  const [levelScores, setLevelScores] = useLocalStorage<Record<number, number>>('pookie-ball-level-scores', {});

  // Load levels on mount
  useEffect(() => {
    try {
      // Initialize with default levels
      setLevels(defaultLevels);
      setCurrentLevel(defaultLevels[0]);
      
      // Try to load the marble mouse levels, but don't rely on them
      const loadMarbleMouseLevels = async () => {
        try {
          setIsLevelLoading(true);
          const importedLevels = await importMarbleMouseLevels();
          
          // Only update if we successfully got levels
          if (importedLevels && importedLevels.length > 0) {
            console.log('Loaded Marble Mouse levels:', importedLevels.length);
            // Combine default and imported levels
            const combinedLevels = [...defaultLevels, ...importedLevels];
            setLevels(combinedLevels);
          } else {
            console.log('No Marble Mouse levels found, using default levels only');
          }
        } catch (error) {
          console.error('Failed to load Marble Mouse levels:', error);
          // Just continue with the default levels
        } finally {
          setIsLevelLoading(false);
        }
      };
      
      // Attempt to load, but don't block the game if it fails
      loadMarbleMouseLevels();
    } catch (error) {
      console.error('Error in GameManager useEffect:', error);
      // Ensure we at least have default levels
      setLevels(defaultLevels);
      setCurrentLevel(defaultLevels[0]);
      setIsLevelLoading(false);
    }
  }, []);

  // Add to the score
  const addToScore = useCallback((points: number) => {
    setScore((prev) => prev + points);
  }, []);

  // Increment collectibles collected
  const incrementCollectiblesCollected = useCallback(() => {
    setCollectiblesCollected((prev) => prev + 1);
  }, []);

  // Reset the level
  const resetLevel = useCallback(() => {
    if (currentLevel) {
      setScore(0);
      setTimeRemaining(currentLevel.timeLimit);
      setCollectiblesCollected(0);
    }
  }, [currentLevel]);

  // Go to the next level
  const nextLevel = useCallback(() => {
    const nextIndex = currentLevelIndex + 1;
    
    // Update highest unlocked level
    if (currentLevel && !completedLevels.includes(currentLevel.id)) {
      setCompletedLevels(prev => [...prev, currentLevel.id]);
      
      // Unlock next level if available
      if (nextIndex < levels.length) {
        setHighestUnlockedLevel(prev => Math.max(prev, levels[nextIndex].id));
      }
    }

    if (nextIndex < levels.length) {
      setCurrentLevelIndex(nextIndex);
      setGameState('playing');
    } else {
      // TODO: Add a "Game Complete" state or loop back?
      setGameState('menu'); // For now, go back to menu
    }
  }, [currentLevelIndex, levels, currentLevel, completedLevels, setCompletedLevels, setHighestUnlockedLevel]);

  // Set score for a completed level
  const setLevelScore = useCallback((levelId: number, newScore: number) => {
    setLevelScores(prev => ({
      ...prev,
      [levelId]: Math.max(prev[levelId] || 0, newScore)
    }));
  }, [setLevelScores]);

  // Check if a level is completed
  const isLevelCompleted = useCallback((levelId: number) => {
    return completedLevels.includes(levelId);
  }, [completedLevels]);

  // Get score for a specific level
  const getLevelScore = useCallback((levelId: number) => {
    return levelScores[levelId] || 0;
  }, [levelScores]);
  
  // Calculate three star score based on level properties (example logic)
  const getThreeStarScore = useCallback((levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return 0;
    // Example: 3 stars = collecting all items + time bonus for finishing fast
    const maxItemScore = (level.objects.filter(obj => obj.type === 'collectible').length * 100); 
    const potentialTimeBonus = level.timeLimit * 10; // Max possible time bonus
    return maxItemScore + (potentialTimeBonus * 0.8); // Need 80% of max time bonus for 3 stars
  }, [levels]);

  // Update current level state when index changes
  useEffect(() => {
    if (levels.length > 0 && currentLevelIndex >= 0 && currentLevelIndex < levels.length) {
      const newLevel = levels[currentLevelIndex];
      setCurrentLevel(newLevel);
      
      // Reset stats for the new level
      setScore(0);
      setTimeRemaining(newLevel.timeLimit);
      setCollectiblesCollected(0);
      
      // Calculate total collectibles for the HUD
      const total = newLevel.objects.filter(obj => obj.type === 'collectible').length;
      setTotalCollectibles(total);
    } else {
      setCurrentLevel(null); // Handle case where index is out of bounds
    }
  }, [currentLevelIndex, levels]);

  // Game loop timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && currentLevel) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('gameOver');
            return 0;
          } else {
            return prev - 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, currentLevel]);

  // Context provider value
  const value = {
    gameState,
    setGameState,
    currentLevel,
    setCurrentLevel, // Expose this directly if needed
    levels,
    score,
    timeRemaining,
    collectiblesCollected,
    totalCollectibles,
    isLevelLoading,
    
    currentLevelIndex,
    setCurrentLevelIndex,
    highestUnlockedLevel,
    
    addToScore,
    incrementCollectiblesCollected,
    resetLevel,
    nextLevel,
    
    setLevelScore,
    isLevelCompleted,
    getLevelScore,
    getThreeStarScore,
  };

  return (
    <GameErrorBoundary>
      <GameContext.Provider value={value}>
        {children}
      </GameContext.Provider>
    </GameErrorBoundary>
  );
}

// Custom hook to use the game context
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameManager');
  }
  return context;
} 