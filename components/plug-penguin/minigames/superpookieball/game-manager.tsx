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
        setHighestUnlockedLevel(Math.max(highestUnlockedLevel, nextIndex + 1));
      }
    }
    
    if (nextIndex < levels.length) {
      setCurrentLevelIndex(nextIndex);
      setCurrentLevel(levels[nextIndex]);
      resetLevel();
      setGameState('playing');
    } else {
      // No more levels, go back to menu
      setGameState('menu');
    }
  }, [currentLevelIndex, levels, resetLevel, currentLevel, completedLevels, highestUnlockedLevel, setCompletedLevels, setHighestUnlockedLevel]);

  // Set the level score
  const setLevelScore = useCallback((levelId: number, score: number) => {
    setLevelScores((prev) => {
      const newScores = { ...prev };
      // Only update if the new score is higher
      if (!newScores[levelId] || newScores[levelId] < score) {
        newScores[levelId] = score;
      }
      return newScores;
    });
    
    // Mark level as completed
    if (!completedLevels.includes(levelId)) {
      setCompletedLevels(prev => [...prev, levelId]);
      
      // Unlock next level if this is the highest level completed
      const nextLevelId = levelId + 1;
      const nextLevelIndex = levels.findIndex(level => level.id === nextLevelId);
      
      if (nextLevelIndex >= 0) {
        setHighestUnlockedLevel(Math.max(highestUnlockedLevel, nextLevelId));
      }
    }
  }, [levelScores, setLevelScores, completedLevels, setCompletedLevels, highestUnlockedLevel, setHighestUnlockedLevel, levels]);

  // Check if a level is completed
  const isLevelCompleted = useCallback((levelId: number) => {
    return completedLevels.includes(levelId);
  }, [completedLevels]);

  // Get the level score
  const getLevelScore = useCallback((levelId: number): number => {
    return levelScores[levelId] || 0;
  }, [levelScores]);

  // Update the current level when the current level index changes
  useEffect(() => {
    if (levels.length > 0 && currentLevelIndex >= 0 && currentLevelIndex < levels.length) {
      setCurrentLevel(levels[currentLevelIndex]);
    }
  }, [currentLevelIndex, levels]);

  // Calculate total collectibles in current level
  useEffect(() => {
    if (currentLevel) {
      const collectiblesCount = currentLevel.objects.filter(obj => obj.type === 'collectible').length;
      setTotalCollectibles(collectiblesCount);
    }
  }, [currentLevel]);

  // Countdown timer for level
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (gameState === 'playing' && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Time's up - game over
            setGameState('gameOver');
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, timeRemaining, setGameState]);

  // Calculate the three-star score for a level
  const getThreeStarScore = useCallback((levelId: number): number => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return 0;
    
    // Base calculation depends on level difficulty
    const baseScore = 
      level.difficulty === 'easy' ? 1000 :
      level.difficulty === 'medium' ? 1500 : 2000;
    
    // Factor in collectibles and time
    const collectiblesCount = level.objects.filter(obj => obj.type === 'collectible').length;
    return baseScore + (collectiblesCount * 100);
  }, [levels]);

  // Set the current level by index or use level selector
  const setLevelByIndex = useCallback((index: number) => {
    // Only allow setting to levels that are unlocked or below the highest unlocked level
    const targetLevel = levels[index];
    if (targetLevel && (targetLevel.id <= highestUnlockedLevel || process.env.NODE_ENV === 'development')) {
      setCurrentLevelIndex(index);
      setCurrentLevel(targetLevel);
      resetLevel();
    } else {
      console.warn(`Level ${index + 1} is not yet unlocked!`);
    }
  }, [levels, highestUnlockedLevel, resetLevel]);

  // Context value that will be provided
  const contextValue: GameContextType = {
    gameState,
    setGameState,
    currentLevel,
    setCurrentLevel,
    levels,
    score,
    timeRemaining,
    collectiblesCollected,
    totalCollectibles,
    isLevelLoading,
    
    currentLevelIndex,
    setCurrentLevelIndex: setLevelByIndex,
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
      <GameContext.Provider value={contextValue}>
        {children}
      </GameContext.Provider>
    </GameErrorBoundary>
  );
}

// Custom hook to access game context
export function useGame() {
  return useContext(GameContext);
}

export default GameManager; 