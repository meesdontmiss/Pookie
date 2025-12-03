import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, keyboardMap } from './keyboard-controls';
import { useGame } from './game-manager';
import LevelRenderer from './level-renderer';
import { WorldTiltControls } from './world-tilt-controls';
import BallWithCharacter from './ball-with-character';
import CameraFollowBall from './camera-follow-ball';

// Main game scene component that renders the 3D game world
const GameScene: React.FC = () => {
  const {
    gameState,
    setGameState,
    currentLevel,
    score,
    timeRemaining,
    collectiblesCollected,
    totalCollectibles,
    addToScore,
    incrementCollectiblesCollected,
    resetLevel,
    nextLevel,
    setLevelScore,
    isLevelLoading,
    levels,
    setCurrentLevel,
    currentLevelIndex,
    setCurrentLevelIndex,
    highestUnlockedLevel,
    isLevelCompleted
  } = useGame();

  // References
  const worldRef = useRef(null);

  // Determine player spawn position
  const playerSpawnPosition = useMemo(() => {
    if (!currentLevel) return [0, 2, 0] as [number, number, number]; // Default if no level loaded

    // Find the spawn_platform or start object in the current level
    const spawnObject = currentLevel.objects.find(obj => obj.type === 'spawn_platform' || obj.type === 'start');
    
    if (spawnObject) {
      // Adjust Y position to be slightly above the platform's surface.
      // Assuming the platform's Y is its center.
      // The BallWithCharacter radius is 1 by default.
      // The CircularSpawnPlatform thickness is 0.5 or 1 by default from its properties.
      // So, platform_Y + platform_thickness/2 + ball_radius should be a good starting point.
      // Let's use a simpler offset for now, e.g., platform's Y + 2.
      let platformY = spawnObject.position[1];
      let yOffset = 2; // Default offset if thickness/radius not available

      if (spawnObject.type === 'spawn_platform' && spawnObject.properties) {
        const platformThickness = spawnObject.properties.thickness || 0.5;
        yOffset = (platformThickness / 2) + 1.1; // platform_half_thickness + ball_radius + tiny_gap
      } else if (spawnObject.type === 'start' && spawnObject.scale) {
        const platformThickness = spawnObject.scale[1] || 1; // Assuming Y scale is thickness for start blocks
        yOffset = (platformThickness / 2) + 1.1;
      }

      return [
        spawnObject.position[0],
        platformY + yOffset, 
        spawnObject.position[2]
      ] as [number, number, number];
    } else {
      // Fallback if no spawn object found in the level (should not happen if levels are defined correctly)
      console.warn("No spawn object (start or spawn_platform) found in current level. Defaulting spawn.");
      return [0, 22, 0] as [number, number, number]; // Default high spawn if platform is at Y=20
    }
  }, [currentLevel]);

  // Start the game with level 1
  const startGame = () => {
    setCurrentLevelIndex(0); // Start with the first level
    setGameState('playing');
  };

  // Handle collectible collection
  const handleCollectItem = (id: number) => {
    addToScore(100);
    incrementCollectiblesCollected();
  };

  // Handle reaching the goal
  const handleReachGoal = () => {
    // Add time bonus to score
    const timeBonus = timeRemaining * 10;
    addToScore(timeBonus);

    // Mark level as completed
    if (currentLevel) {
      setLevelScore(currentLevel.id, score + timeBonus);
    }

    // Set game state to level complete
    setGameState('levelComplete');
  };

  // Handle keyboard events outside of the keyboard controls system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key === 'p' || e.key === 'P') {
          setGameState('paused');
        } else if (e.key === 'r' || e.key === 'R') {
          resetLevel();
        }
      } else if (gameState === 'paused') {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, resetLevel, setGameState]);

  // Render UI based on game state
  const renderUI = () => {
    switch (gameState) {
      case 'menu':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-8 bg-gray-800 rounded-lg">
              <h1 className="text-3xl font-bold mb-4">Pookie Sumo Royale</h1>
              <p className="mb-6">Enter the arena and be the last Pookie standing!</p>
              {isLevelLoading ? (
                <div>
                  <p className="mb-4">Loading Arena...</p>
                  <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-xl"
                    onClick={startGame}
                  >
                    Start Sumo Battle!
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'levelSelect':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-8 bg-gray-800 rounded-lg max-h-[80vh] overflow-auto w-[80vw]">
              <h2 className="text-2xl font-bold mb-4">Select a Level</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {levels.map((level, index) => {
                  const isUnlocked = level.id <= highestUnlockedLevel;
                  const isCompleted = isLevelCompleted(level.id);
                  return (
                    <div 
                      key={level.id} 
                      className={`p-4 ${isUnlocked ? 'bg-gray-700 cursor-pointer hover:bg-gray-600' : 'bg-gray-900 opacity-50 cursor-not-allowed'} rounded-lg transition-colors relative`}
                      onClick={() => {
                        if (isUnlocked) {
                          setCurrentLevelIndex(index);
                          setGameState('playing');
                        }
                      }}
                    >
                      {isCompleted && (
                        <div className="absolute top-2 right-2">
                          <span className="text-yellow-400 text-2xl">✓</span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold mb-2">{level.name}</h3>
                      <p className="mb-2 text-gray-300 text-sm">{level.description}</p>
                      <p className="mb-1 text-sm">Difficulty: {level.difficulty}</p>
                      <p className="mb-4 text-sm">Time Limit: {level.timeLimit} seconds</p>
                      <button
                        className={`${isUnlocked ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700'} text-white px-4 py-2 rounded w-full disabled:cursor-not-allowed`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isUnlocked) {
                            setCurrentLevelIndex(index);
                            setGameState('playing');
                          }
                        }}
                        disabled={!isUnlocked}
                      >
                        {isUnlocked ? 'Play Level' : 'Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                className="mt-6 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setGameState('menu')}
              >
                Back to Menu
              </button>
            </div>
          </div>
        );

      case 'paused':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-8 bg-gray-800 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
                onClick={() => setGameState('playing')}
              >
                Resume
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-2"
                onClick={() => setGameState('menu')}
              >
                Exit to Menu
              </button>
            </div>
          </div>
        );

      case 'levelComplete':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-8 bg-gray-800 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Level Complete!</h2>
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-400 text-black font-bold rounded-full p-2 w-24 h-24 flex items-center justify-center">
                  <span className="text-3xl">GOAL!</span>
                </div>
              </div>
              <p className="mb-2">Collectibles: {collectiblesCollected}/{totalCollectibles}</p>
              <p className="mb-4">Time Bonus: {timeRemaining * 10} points</p>
              <p className="text-xl font-bold mb-4">Total Score: {score}</p>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
                onClick={nextLevel}
              >
                Next Level
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-2"
                onClick={() => setGameState('menu')}
              >
                Exit to Menu
              </button>
            </div>
          </div>
        );

      case 'gameOver':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-8 bg-gray-800 rounded-lg">
              <h2 className="text-2xl font-bold mb-4 text-red-500">
                {timeRemaining <= 0 ? "Time's Up!" : "Game Over!"}
              </h2>
              <p className="mb-6">You fell off the course!</p>
              <p className="text-xl font-bold mb-4">Final Score: {score}</p>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
                onClick={resetLevel}
              >
                Try Again
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-2"
                onClick={() => setGameState('menu')}
              >
                Exit to Menu
              </button>
            </div>
          </div>
        );

      case 'playing':
        return (
          <>
            {/* HUD */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded">
              <p>Level {currentLevel?.id}: {currentLevel?.name}</p>
              <p>Score: {score}</p>
              <p>Collectibles: {collectiblesCollected}/{totalCollectibles}</p>
              <p>Time: {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
              <p>Arrow Keys/WASD: Tilt World</p>
              <p>Spacebar: Jump</p>
              <p>P: Pause</p>
              <p>R: Restart Level</p>
            </div>

            {/* Pause Button */}
            <button
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded"
              onClick={() => setGameState('paused')}
            >
              Pause
            </button>
          </>
        );

      default:
        return null;
    }
  };

  // Only render the game if we have a level
  if (!currentLevel && gameState !== 'menu' && gameState !== 'levelSelect') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
        <p>Error: Level not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Keyboard controls wrapper */}
      <KeyboardControls map={keyboardMap}>
        {/* 3D Game Canvas */}
        <Canvas shadows camera={{ position: [0, 10, 10], fov: 60 }}>
          <Physics gravity={[0, -30, 0]}>
            <WorldTiltControls active={gameState === 'playing'} ref={worldRef}>
              {/* Render current level */}
              {currentLevel && (
                <LevelRenderer
                  level={currentLevel}
                  onCollectItem={handleCollectItem}
                  onReachGoal={handleReachGoal}
                />
              )}

              {/* Player ball */}
              {gameState === 'playing' && currentLevel && (
                <BallWithCharacter
                  position={playerSpawnPosition}
                  worldRef={worldRef}
                  radius={1}
                  mass={1}
                  jumpForce={10}
                  active={gameState === 'playing'}
                />
              )}
            </WorldTiltControls>

            {/* Camera that follows the ball */}
            {currentLevel && <CameraFollowBall />}
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* UI Overlay */}
      {renderUI()}
    </div>
  );
};

export default GameScene; 