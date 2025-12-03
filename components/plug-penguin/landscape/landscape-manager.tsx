'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Import landscape components
import { FrozenLake } from './frozen-lake'
import { SnowPile } from './snow-pile'
// Import other landscape components as needed

interface LandscapeManagerProps {
  seed?: number
  worldSize?: number
  density?: number
  windDirection?: [number, number]
  windStrength?: number
  snowLevel?: number
  enableLake?: boolean
  enableMountains?: boolean
  debugMode?: boolean
  onTerrainLoaded?: () => void
}

export function LandscapeManager({
  seed = 12345,
  worldSize = 500,
  density = 1.0,
  windDirection = [1, 0.5],
  windStrength = 0.3,
  snowLevel = 1.0,
  enableLake = true,
  enableMountains = true,
  debugMode = false,
  onTerrainLoaded
}: LandscapeManagerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Random number generator based on seed
  const rng = useMemo(() => {
    const seedFn = function(seed: number) {
      return function() {
        seed = Math.sin(seed) * 10000
        return seed - Math.floor(seed)
      }
    }
    return seedFn(seed)
  }, [seed])
  
  // Calculate normalized wind vector
  const normalizedWindDirection = useMemo(() => {
    const length = Math.sqrt(windDirection[0]**2 + windDirection[1]**2)
    return length > 0 
      ? [windDirection[0] / length, windDirection[1] / length] as [number, number]
      : [1, 0] as [number, number]
  }, [windDirection])
  
  // Generate snow pile positions with Poisson disc sampling
  const snowPilePositions = useMemo(() => {
    const positions: Array<{
      position: [number, number, number],
      scale: [number, number, number],
      variant: 'small' | 'medium' | 'large' | 'drift',
      rotation: number,
      sparkle: boolean
    }> = []
    
    // Simplified Poisson disc sampling
    const minDistance = 8 * (1 / density)
    const attempts = 30
    const cellSize = minDistance / Math.sqrt(2)
    
    const grid: (number | null)[][] = []
    const gridWidth = Math.ceil(worldSize / cellSize)
    const gridHeight = Math.ceil(worldSize / cellSize)
    
    // Initialize grid
    for (let i = 0; i < gridWidth; i++) {
      grid[i] = []
      for (let j = 0; j < gridHeight; j++) {
        grid[i][j] = null
      }
    }
    
    // Valid position check
    const isValidPosition = (x: number, z: number, variant: string): boolean => {
      // Check world bounds
      const variantSize = variant === 'small' ? 3 : variant === 'medium' ? 5 : variant === 'large' ? 8 : 12
      
      if (x < -worldSize/2 + variantSize || x > worldSize/2 - variantSize || 
          z < -worldSize/2 + variantSize || z > worldSize/2 - variantSize) {
        return false
      }
      
      // Check lake area - avoid placing snow piles on the lake
      if (enableLake) {
        const lakeRadius = worldSize * 0.12
        const distToLake = Math.sqrt(x*x + z*z)
        if (distToLake < lakeRadius + variantSize) {
          return false
        }
      }
      
      // Avoid center area for gameplay space
      const centerRadius = worldSize * 0.08
      const distToCenter = Math.sqrt(x*x + z*z)
      if (distToCenter < centerRadius) {
        return false
      }
      
      // Distribute more piles in the wind direction
      const normalizedPos = [x / worldSize, z / worldSize]
      const dotProduct = normalizedPos[0] * normalizedWindDirection[0] + 
                          normalizedPos[1] * normalizedWindDirection[1]
      
      // Increase probability in wind direction
      const windProbability = (dotProduct + 1) / 2 // Scale to 0-1
      if (rng() > windProbability * 0.7 + 0.3) {
        return false
      }
      
      return true
    }
    
    // Add points with poisson sampling
    const addPoints = (count: number, variant: 'small' | 'medium' | 'large' | 'drift') => {
      for (let i = 0; i < count; i++) {
        let x: number = 0;
        let z: number = 0;
        let isValid = false;
        let attempts = 30;
        
        while (!isValid && attempts > 0) {
          x = (rng() * worldSize - worldSize/2);
          z = (rng() * worldSize - worldSize/2);
          
          isValid = isValidPosition(x, z, variant);
          attempts--;
        }
        
        if (isValid) {
          // Convert to grid coordinates
          const gridX = Math.floor((x + worldSize/2) / cellSize);
          const gridZ = Math.floor((z + worldSize/2) / cellSize);
          
          // Check distance to all existing points
          let tooClose = false
          
          // Check grid neighborhood
          const searchRadius = Math.ceil(minDistance / cellSize)
          for (let gx = Math.max(0, gridX - searchRadius); gx <= Math.min(gridWidth - 1, gridX + searchRadius); gx++) {
            for (let gz = Math.max(0, gridZ - searchRadius); gz <= Math.min(gridHeight - 1, gridZ + searchRadius); gz++) {
              if (grid[gx][gz] !== null) {
                const existingIndex = grid[gx][gz] as number
                const existing = positions[existingIndex]
                
                const dx = existing.position[0] - x
                const dz = existing.position[2] - z
                const dist = Math.sqrt(dx*dx + dz*dz)
                
                // Adjust distance based on pile sizes
                const existingSize = existing.variant === 'small' ? 2 : 
                                    existing.variant === 'medium' ? 3 : 
                                    existing.variant === 'large' ? 5 : 7
                
                const currentSize = variant === 'small' ? 2 : 
                                    variant === 'medium' ? 3 : 
                                    variant === 'large' ? 5 : 7
                
                if (dist < (existingSize + currentSize) * (1 / density) * 1.2) {
                  tooClose = true
                  break
                }
              }
            }
            if (tooClose) break
          }
          
          if (!tooClose) {
            // Create scale with slight variation
            const baseScale = variant === 'small' ? 0.8 :
                             variant === 'medium' ? 1.2 :
                             variant === 'large' ? 1.8 : 2.0
            
            const scaleVar = 0.2  
            const scaleX = baseScale * (1 + (rng() - 0.5) * scaleVar)
            const scaleY = baseScale * (1 + (rng() - 0.5) * scaleVar)
            const scaleZ = baseScale * (1 + (rng() - 0.5) * scaleVar)
            
            // Add rotation, mainly for drift piles
            const rotation = variant === 'drift' 
              ? Math.atan2(normalizedWindDirection[1], normalizedWindDirection[0]) + (rng() - 0.5) * Math.PI * 0.3
              : rng() * Math.PI * 2
            
            // Add some randomization to y position for uneven ground
            const y = 0.1
            
            // Add to positions array and mark grid
            const index = positions.length
            
            positions.push({
              position: [x, y, z],
              scale: [scaleX, scaleY, scaleZ],
              variant,
              rotation,
              sparkle: rng() < 0.3 // 30% chance for sparkle effect
            })
            
            grid[gridX][gridZ] = index
          }
        }
      }
    }
    
    // Add different types of piles with adjusted density
    addPoints(Math.ceil(40 * density * snowLevel), 'small')
    addPoints(Math.ceil(25 * density * snowLevel), 'medium')
    addPoints(Math.ceil(15 * density * snowLevel), 'large')
    addPoints(Math.ceil(10 * density * snowLevel), 'drift')
    
    return positions
  }, [worldSize, density, seed, rng, normalizedWindDirection, snowLevel, enableLake])
  
  // Lake properties
  const lakeProps = useMemo(() => {
    if (!enableLake) return null
    
    const lakeSize = worldSize * 0.24
    return {
      position: [0, 0.05, 0] as [number, number, number],
      size: [lakeSize, lakeSize] as [number, number],
      depth: 1.5,
      roughness: 0.15,
      metalness: 0.8,
      resolution: 1024,
      mirror: 0.65,
      distortion: 0.3,
      cracks: true
    }
  }, [worldSize, enableLake])
  
  // Signal load complete
  useEffect(() => {
    if (!isLoaded) {
      setIsLoaded(true)
      if (onTerrainLoaded) {
        onTerrainLoaded()
      }
    }
  }, [isLoaded, onTerrainLoaded])
  
  return (
    <group ref={groupRef}>
      {/* Frozen lake */}
      {enableLake && lakeProps && (
        <FrozenLake {...lakeProps} />
      )}
      
      {/* Mountains (commented out) */}
      {/* {enableMountains && (
        <>
          <Mountain 
            position={[-worldSize * 0.3, 0, -worldSize * 0.3]}
            scale={[1, 1, 1]}
            seed={seed + 1}
            peakHeight={40}
            snowLine={0.6}
          />
          <Mountain 
            position={[worldSize * 0.35, 0, -worldSize * 0.35]}
            scale={[0.8, 1.2, 0.8]}
            seed={seed + 2}
            peakHeight={35}
            snowLine={0.65}
          />
          <Mountain 
            position={[0, 0, -worldSize * 0.4]}
            scale={[1.2, 0.9, 1.2]}
            seed={seed + 3}
            peakHeight={30}
            snowLine={0.7}
          />
        </>
      )} */}
      
      {/* Snow piles */}
      {snowPilePositions.map((item, index) => (
        <group 
          key={`snow-pile-${index}`} 
          position={new THREE.Vector3(...item.position)}
          rotation={[0, item.rotation, 0]}
        >
          <SnowPile 
            position={[0, 0, 0]}
            scale={item.scale}
            variant={item.variant}
            windDirection={normalizedWindDirection}
            windStrength={windStrength}
            sparkle={item.sparkle}
          />
        </group>
      ))}
      
      {/* Forest (commented out) */}
      {/* <Forest 
        position={[-worldSize * 0.15, 0, worldSize * 0.2]}
        size={worldSize * 0.15}
        density={0.7}
        variations={true}
        seed={seed + 10}
      />
      <Forest 
        position={[worldSize * 0.25, 0, worldSize * 0.15]}
        size={worldSize * 0.12}
        density={0.8}
        variations={true}
        seed={seed + 11}
      /> */}
      
      {/* Debug visualization */}
      {debugMode && (
        <group>
          <gridHelper 
            args={[worldSize, worldSize / 10]} 
            position={[0, 0.1, 0]}
          />
          <axesHelper args={[10]} />
        </group>
      )}
    </group>
  )
} 