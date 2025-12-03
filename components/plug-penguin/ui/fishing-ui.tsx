'use client'

import { useState, useEffect } from 'react'
import { Fish, FishingState } from '../hooks/use-fishing'

interface FishingUIProps {
  fishingState: FishingState
  isInOceanArea: boolean
  currentFish: Fish | null
  reelProgress: number
  caughtFish: Fish[]
  onCast: () => void
  onReel: () => void
  onCancel: () => void
}

export function FishingUI({
  fishingState,
  isInOceanArea,
  currentFish,
  reelProgress,
  caughtFish,
  onCast,
  onReel,
  onCancel
}: FishingUIProps) {
  const [showCaughtFish, setShowCaughtFish] = useState(false)
  
  // Show appropriate instructions based on fishing state
  const getInstructions = () => {
    if (!isInOceanArea) return "Move closer to the ocean to fish"
    
    switch (fishingState) {
      case 'idle':
        return "Press [F] to cast your line"
      case 'casting':
        return "Casting..."
      case 'waiting':
        return "Waiting for a bite..."
      case 'bite':
        return "Fish on! Press [Space] to reel in!"
      case 'reeling':
        return "Reeling in..."
      case 'success':
        return `Caught a ${currentFish?.name || 'fish'}!`
      case 'failed':
        return "The fish got away!"
      default:
        return ""
    }
  }
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys if in ocean area
      if (!isInOceanArea) return
      
      if (e.code === 'KeyF' && fishingState === 'idle') {
        onCast()
      } else if (e.code === 'Space' && fishingState === 'bite') {
        onReel()
      } else if (e.code === 'Escape' && fishingState !== 'idle') {
        onCancel()
      } else if (e.code === 'KeyI') {
        setShowCaughtFish(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fishingState, isInOceanArea, onCast, onReel, onCancel])
  
  // Get color based on fish rarity
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-200'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'legendary': return 'text-purple-400'
      default: return 'text-white'
    }
  }
  
  return (
    <div className="fixed bottom-20 left-0 w-full z-10 pointer-events-none">
      <div className="container mx-auto max-w-md px-4">
        {/* Fishing instructions */}
        {isInOceanArea && (
          <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg mb-2 text-center">
            <p className="text-lg">{getInstructions()}</p>
            
            {/* Progress bar for reeling */}
            {fishingState === 'reeling' && (
              <div className="w-full h-4 bg-gray-700 rounded-full mt-2">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                  style={{ width: `${reelProgress}%` }}
                />
              </div>
            )}
            
            {/* Fish bite indicator */}
            {fishingState === 'bite' && (
              <div className="animate-pulse mt-2 text-yellow-300 text-xl font-bold">
                !! BITE !!
              </div>
            )}
            
            {/* Controls reminder */}
            <div className="mt-2 text-sm text-gray-300">
              {fishingState === 'idle' && "Press [F] to cast"}
              {fishingState === 'bite' && "Press [Space] to reel in"}
              {fishingState !== 'idle' && "Press [Esc] to cancel"}
              {caughtFish.length > 0 && " • Press [I] for inventory"}
            </div>
          </div>
        )}
        
        {/* Caught fish inventory */}
        {showCaughtFish && caughtFish.length > 0 && (
          <div className="bg-black bg-opacity-80 text-white p-4 rounded-lg">
            <h3 className="text-xl mb-2 border-b border-gray-700 pb-1">Fish Collection ({caughtFish.length})</h3>
            <div className="max-h-60 overflow-y-auto">
              {caughtFish.map((fish, index) => (
                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-800">
                  <span className={`${getRarityColor(fish.rarity)} font-medium`}>{fish.name}</span>
                  <span className="text-gray-400">{fish.size}cm • {fish.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 