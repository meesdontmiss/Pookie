'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as THREE from 'three'

// Fish types with rarity and points
export enum FishRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  LEGENDARY = 'legendary'
}

export interface Fish {
  id: string
  name: string
  rarity: FishRarity
  points: number
  size: number // in cm
  model?: string // path to 3D model
}

// Fishing states
export type FishingState = 
  | 'idle'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'reeling'
  | 'success'
  | 'failed'

interface UseFishingProps {
  playerPosition: THREE.Vector3
  oceanAreas: Array<{
    position: [number, number, number]
    size: [number, number]
  }>
  onCatch?: (fish: Fish) => void
}

export function useFishing({
  playerPosition,
  oceanAreas,
  onCatch
}: UseFishingProps) {
  // Fishing state
  const [fishingState, setFishingState] = useState<FishingState>('idle')
  const fishingStateRef = useRef<FishingState>('idle')
  const [currentFish, setCurrentFish] = useState<Fish | null>(null)
  const [caughtFish, setCaughtFish] = useState<Fish[]>([])
  const [isInOceanArea, setIsInOceanArea] = useState(false)
  const [castPosition, setCastPosition] = useState<THREE.Vector3 | null>(null)
  const [reelProgress, setReelProgress] = useState(0)
  const [fishingRod, setFishingRod] = useState<string>('basic') // basic, advanced, pro
  
  // Update the ref whenever state changes
  useEffect(() => {
    fishingStateRef.current = fishingState
  }, [fishingState])
  
  // Fish catalog
  const fishCatalog: Fish[] = [
    { id: 'trout', name: 'Rainbow Trout', rarity: FishRarity.COMMON, points: 10, size: 30 },
    { id: 'bass', name: 'Ice Bass', rarity: FishRarity.COMMON, points: 15, size: 25 },
    { id: 'perch', name: 'Yellow Perch', rarity: FishRarity.UNCOMMON, points: 25, size: 20 },
    { id: 'pike', name: 'Northern Pike', rarity: FishRarity.RARE, points: 50, size: 70 },
    { id: 'sturgeon', name: 'White Sturgeon', rarity: FishRarity.LEGENDARY, points: 100, size: 100 }
  ]
  
  // Check if player is in any ocean area
  useEffect(() => {
    if (!playerPosition || !oceanAreas.length) return
    
    // Check if player is in any of the ocean areas
    const isInAnyOcean = oceanAreas.some(area => {
      const areaPosition = new THREE.Vector3(area.position[0], 0, area.position[1]);
      const halfWidth = area.size[0] / 2;
      const halfLength = area.size[1] / 2;
      
      // Check if player is within the rectangular bounds of the ocean area
      return (
        playerPosition.x >= areaPosition.x - halfWidth &&
        playerPosition.x <= areaPosition.x + halfWidth &&
        playerPosition.z >= areaPosition.z - halfLength &&
        playerPosition.z <= areaPosition.z + halfLength
      );
    });
    
    setIsInOceanArea(isInAnyOcean);
    
    // If player leaves ocean area while fishing, cancel fishing
    if (!isInAnyOcean && fishingState !== 'idle') {
      setFishingState('idle');
      setCurrentFish(null);
      setCastPosition(null);
    }
  }, [playerPosition, oceanAreas, fishingState]);
  
  // Cast fishing line
  const castLine = useCallback(() => {
    if (!isInOceanArea || fishingState !== 'idle') return
    
    // Set casting state
    setFishingState('casting')
    
    // Calculate cast position (in front of player)
    const castDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, playerPosition.y, 0))
    )
    const castDist = 5 + Math.random() * 5 // 5-10 meters
    const newCastPosition = new THREE.Vector3(
      playerPosition.x + castDirection.x * castDist,
      0.1, // Just above water
      playerPosition.z + castDirection.z * castDist
    )
    setCastPosition(newCastPosition)
    
    // After casting animation, transition to waiting
    setTimeout(() => {
      setFishingState('waiting')
      
      // Random time until fish bites (3-10 seconds)
      const biteTime = 3000 + Math.random() * 7000
      setTimeout(() => {
        // Only proceed if still in waiting state
        if (fishingStateRef.current === 'waiting') {
          // Determine which fish bites based on rarity
          const rarityRoll = Math.random()
          let selectedFish: Fish
          
          if (rarityRoll < 0.01) { // 1% chance for legendary
            selectedFish = fishCatalog.find(f => f.rarity === FishRarity.LEGENDARY) || fishCatalog[0]
          } else if (rarityRoll < 0.1) { // 9% chance for rare
            selectedFish = fishCatalog.find(f => f.rarity === FishRarity.RARE) || fishCatalog[0]
          } else if (rarityRoll < 0.3) { // 20% chance for uncommon
            selectedFish = fishCatalog.find(f => f.rarity === FishRarity.UNCOMMON) || fishCatalog[0]
          } else { // 70% chance for common
            const commonFish = fishCatalog.filter(f => f.rarity === FishRarity.COMMON)
            selectedFish = commonFish[Math.floor(Math.random() * commonFish.length)] || fishCatalog[0]
          }
          
          setCurrentFish(selectedFish)
          setFishingState('bite')
          
          // Fish will get away if not reeled in within 2 seconds
          setTimeout(() => {
            if (fishingStateRef.current === 'bite') {
              setFishingState('failed')
              setCurrentFish(null)
              
              // Reset after 2 seconds
              setTimeout(() => {
                setFishingState('idle')
                setCastPosition(null)
              }, 2000)
            }
          }, 2000)
        }
      }, biteTime)
    }, 1000) // 1 second casting animation
  }, [isInOceanArea, fishingState, playerPosition, fishCatalog])
  
  // Reel in fish
  const reelIn = useCallback(() => {
    if (fishingState !== 'bite') return
    
    setFishingState('reeling')
    setReelProgress(0)
    
    // Reeling mini-game would go here
    // For now, just simulate with a timer
    const reelInterval = setInterval(() => {
      setReelProgress(prev => {
        const newProgress = prev + 10
        
        if (newProgress >= 100) {
          clearInterval(reelInterval)
          
          // Fish caught!
          if (currentFish) {
            setCaughtFish(prev => [...prev, currentFish])
            setFishingState('success')
            
            // Notify parent component
            if (onCatch) onCatch(currentFish)
            
            // Reset after 2 seconds
            setTimeout(() => {
              setFishingState('idle')
              setCurrentFish(null)
              setCastPosition(null)
            }, 2000)
          }
        }
        
        return newProgress
      })
    }, 200)
    
    return () => clearInterval(reelInterval)
  }, [fishingState, currentFish, onCatch])
  
  // Cancel fishing
  const cancelFishing = useCallback(() => {
    setFishingState('idle')
    setCurrentFish(null)
    setCastPosition(null)
    setReelProgress(0)
  }, [])
  
  return {
    fishingState,
    isInOceanArea,
    currentFish,
    caughtFish,
    castPosition,
    reelProgress,
    fishingRod,
    castLine,
    reelIn,
    cancelFishing
  }
} 