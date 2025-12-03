'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Tree } from '../entities/tree'

interface ForestProps {
  position?: [number, number, number]
  size?: [number, number]
  density?: number
  variations?: boolean
  seed?: number
}

/**
 * Forest component that generates trees in a natural-looking pattern
 * Uses Poisson disc sampling to avoid trees being too close to each other
 */
export function Forest({
  position = [0, 0, 0],
  size = [100, 100],
  density = 0.01,
  variations = true,
  seed = 12345
}: ForestProps) {
  const forestRef = useRef<THREE.Group>(null)
  
  // Create a deterministic random number generator based on seed
  const random = useMemo(() => {
    return function(min = 0, max = 1) {
      seed = (seed * 16807) % 2147483647
      return min + (seed / 2147483647) * (max - min)
    }
  }, [seed])
  
  // Generate tree positions using Poisson disc sampling
  const treePositions = useMemo(() => {
    const positions: Array<[number, number, number]> = []
    const [width, depth] = size
    const minDist = 5 // Minimum distance between trees
    
    // Simplified Poisson disc sampling
    const grid: boolean[][] = Array(Math.ceil(width / minDist))
      .fill(null)
      .map(() => Array(Math.ceil(depth / minDist)).fill(false))
    
    // Calculate how many trees to place based on density
    const targetCount = Math.floor(width * depth * density / 25)
    let attempts = 0
    const maxAttempts = targetCount * 10 // Avoid infinite loops
    
    while (positions.length < targetCount && attempts < maxAttempts) {
      attempts++
      
      // Generate a random position
      const x = random(-width / 2, width / 2)
      const z = random(-depth / 2, depth / 2)
      
      // Add some terrain-aware height variation
      const terrainHeight = Math.sin(x / 20) * Math.cos(z / 20) * 1.5
      const y = terrainHeight
      
      // Check if this position is valid
      const gridX = Math.floor((x + width / 2) / minDist)
      const gridZ = Math.floor((z + depth / 2) / minDist)
      
      let tooClose = false
      
      // Check nearby grid cells
      for (let i = Math.max(0, gridX - 1); i <= Math.min(grid.length - 1, gridX + 1); i++) {
        for (let j = Math.max(0, gridZ - 1); j <= Math.min(grid[0].length - 1, gridZ + 1); j++) {
          if (grid[i][j]) {
            tooClose = true
            break
          }
        }
        if (tooClose) break
      }
      
      // If not too close to another tree, add it
      if (!tooClose) {
        positions.push([x, y, z])
        grid[gridX][gridZ] = true
      }
    }
    
    return positions
  }, [size, density, random])
  
  return (
    <group 
      ref={forestRef} 
      position={new THREE.Vector3(...position)}
    >
      {treePositions.map((treePos, index) => {
        // Add some natural variations if enabled
        const treeScale = variations ? 0.8 + random(0, 0.4) : 1
        const treeRotation: [number, number, number] = [
          0, 
          variations ? random(0, Math.PI * 2) : 0, 
          0
        ]
        
        // Create different tree variants
        const variant: 'normal' | 'tall' | 'wide' = variations 
          ? random() < 0.7 
            ? 'normal' 
            : random() < 0.5 
              ? 'tall' 
              : 'wide'
          : 'normal'
        
        return (
          <Tree
            key={`tree-${index}`}
            position={treePos}
            rotation={treeRotation}
            scale={treeScale}
            variant={variant}
          />
        )
      })}
    </group>
  )
} 