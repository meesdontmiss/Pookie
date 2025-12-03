import { useRef, useState, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useGameState } from '../hooks/use-game-state'
import * as THREE from 'three'

interface IglooProps {
  position?: [number, number, number]
  scale?: number
  rotation?: [number, number, number]
  onLoad?: () => void
  onClick?: () => void
}

export function Igloo({ 
  position = [0, 0, 0], 
  scale = 1, 
  rotation = [0, 0, 0],
  onLoad,
  onClick
}: IglooProps) {
  const groupRef = useRef<Group>(null)
  const { scene, animations } = useGLTF('/models/IGLOO.glb')
  const [isLoaded, setIsLoaded] = useState(false)
  const [animationsLoaded, setAnimationsLoaded] = useState(false)
  const gameState = useGameState()
  
  // Set up animations
  const { actions, mixer } = useAnimations(animations, groupRef)
  
  // Debug animations
  useEffect(() => {
    if (animations.length > 0) {
      console.log('Available igloo animations:', animations.map(a => a.name))
      console.log('Animation actions:', Object.keys(actions))
      setAnimationsLoaded(true)
    } else {
      console.warn('No animations found in the igloo model')
    }
  }, [animations, actions])
  
  // Play animations
  useEffect(() => {
    if (animations.length > 0 && animationsLoaded) {
      // Try to play each animation
      animations.forEach(animation => {
        const animationName = animation.name
        console.log(`Attempting to play igloo animation: ${animationName}`)
        
        const action = actions[animationName]
        if (action) {
          // Reset and play the animation with crossfade
          action.reset().fadeIn(0.5).play()
          console.log(`Animation ${animationName} started successfully`)
        } else {
          console.error(`Animation action not found for: ${animationName}`)
        }
      })
    }
  }, [actions, animations, animationsLoaded])
  
  // Clone the scene to avoid sharing materials between instances
  const clonedScene = scene.clone()
  
  useEffect(() => {
    if (clonedScene && !isLoaded) {
      // Ensure all materials are properly set up
      clonedScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.material) {
            // Clone materials to avoid sharing
            if (Array.isArray(object.material)) {
              object.material = object.material.map(m => m.clone())
            } else {
              object.material = object.material.clone()
            }
            
            // Enable shadows
            object.castShadow = true
            object.receiveShadow = true
          }
        }
      })
      
      setIsLoaded(true)
      if (onLoad) onLoad()
    }
    
    return () => {
      // Cleanup animations when component unmounts
      if (mixer) {
        mixer.stopAllAction()
      }
    }
  }, [clonedScene, isLoaded, onLoad, mixer])
  
  // Update the animation mixer in each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })
  
  return (
    <group 
      ref={groupRef} 
      position={new Vector3(...position)} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      onClick={onClick}
    >
      {isLoaded && <primitive object={clonedScene} />}
    </group>
  )
}

// Preload the model
useGLTF.preload('/models/IGLOO.glb') 