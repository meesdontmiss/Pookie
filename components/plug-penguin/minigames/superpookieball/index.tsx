import React from 'react';
import { GameManager } from './game-manager';
import GameScene from './game-scene';

/**
 * Super Pookie Ball Game Component
 * 
 * Main wrapper component for the Super Pookie Ball game. This component
 * provides the game context and renders the game scene.
 */
function SuperPookieBall() {
  return (
    <div className="w-full h-screen">
      <GameManager>
        <GameScene />
      </GameManager>
    </div>
  );
}

// Export the component as the default export
export default SuperPookieBall; 