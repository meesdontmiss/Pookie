"use client"

import React from 'react'
import { GameManager } from '../../components/plug-penguin/minigames/pookie-sumo-royale/game-manager'
import Sumo3DScene from '../../components/plug-penguin/minigames/pookie-sumo-royale/sumo-3d-scene'

export default function PookieSumoRoyalePage() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <GameManager>
        <Sumo3DScene />
      </GameManager>
      
      {/* Navigation UI */}
      <div className="absolute bottom-4 left-4 z-10">
        <a 
          href="/" 
          className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-md transition-colors shadow-lg flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Return to Main World
        </a>
      </div>
    </div>
  )
} 