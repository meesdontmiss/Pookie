/**
 * Model Loading Hook
 * 
 * This file contains the useModel hook implementation needed by the Player component.
 */

import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { GLTF } from 'three-stdlib'
import { useGLTF } from '@react-three/drei'

// Define the model paths
const MODEL_PATHS = {
  pookie: '/models/winters_eve/snowman_walk_idle.glb', // Using snowman as fallback
  igloo: '', // Will create with primitives
  tree: '',  // Will create with primitives
  snowman: '', // Will create with primitives
  
  // Winter assets from winters_eve
  christmasTree: '/models/winters_eve/Christmas_Tree_A.glb',
  animatedSnowman: '/models/winters_eve/snowman_walk_idle.glb',
  deer: '/models/winters_eve/new_deer_fbx.glb',
}

// Define the model types
export type ModelType = keyof typeof MODEL_PATHS

// Define the return type for the useModel hook
interface UseModelReturn {
  model: GLTF | null
  isLoading: boolean
  error: Error | null
}

// Create a cache for loaded models
const modelCache: Record<string, GLTF> = {}

// Type definitions for the loaders
type LoadingProgress = {
  loaded: number
  total: number
}

interface UseModelProps {
  modelPath: string
  onLoad?: (model: GLTF) => void
  onError?: (error: Error) => void
  draco?: boolean
}

export function useModel({ modelPath, onLoad, onError, draco = false }: UseModelProps) {
  const [model, setModel] = useState<GLTF | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Use the drei useGLTF hook to load the model
    const gltf = useGLTF(modelPath)
    
    if (gltf) {
      setModel(gltf)
      setIsLoading(false)
      if (onLoad) onLoad(gltf)
    }
    
    return () => {
      if (model) {
        // Clean up resources if needed
        if (model.scene) {
          model.scene.traverse((object: THREE.Object3D) => {
            if ((object as THREE.Mesh).geometry) {
              (object as THREE.Mesh).geometry.dispose()
            }
            
            if ((object as THREE.Mesh).material) {
              const material = (object as THREE.Mesh).material
              if (Array.isArray(material)) {
                material.forEach(mat => mat.dispose())
              } else {
                material.dispose()
              }
            }
          })
        }
      }
    }
  }, [modelPath, onLoad, onError, draco, model])

  return { model, isLoading, error }
}

// Preload all models
export function preloadModels() {
  Object.values(MODEL_PATHS).forEach(path => {
    if (path) { // Only preload if path is not empty
      useGLTF.preload(path)
    }
  })
} 