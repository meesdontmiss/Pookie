"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GameManager from './game-manager'

// Main game scene component
interface SuperPookyballSceneProps {
  onLoadComplete?: () => void;
}

export default function SuperPookyballScene({ onLoadComplete }: SuperPookyballSceneProps) {
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()
  
  // Handle game exit
  const handleExitGame = () => {
    router.push('/')
  }
  
  // Notify parent component when loading is complete
  useEffect(() => {
    if (onLoadComplete && !loaded) {
      onLoadComplete()
      setLoaded(true)
    }
  }, [onLoadComplete, loaded])
  
  return (
    <div className="w-full h-full relative">
      <GameManager onExit={handleExitGame} />
    </div>
  )
} 