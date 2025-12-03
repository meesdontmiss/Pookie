'use client'

import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

// Define the model type or path
export type ModelType = 'pookie' | 'igloo' | 'tree' | 'snowman' | 'christmasTree' | 'animatedSnowman' | 'deer'

// Map model types to file paths
const MODEL_PATHS: Record<ModelType, string> = {
  pookie: '/models/POOKIE.glb',
  igloo: '/models/winters_eve/igloo.glb', 
  tree: '/models/winters_eve/tree.glb',
  snowman: '/models/winters_eve/snowman_walk_idle.glb',
  christmasTree: '/models/winters_eve/Christmas_Tree_A.glb',
  animatedSnowman: '/models/winters_eve/snowman_walk_idle.glb',
  deer: '/models/winters_eve/new_deer_fbx.glb'
}

// Type that allows either a ModelType or a string path
export type ModelPath = ModelType | string

interface UseModelProps {
  modelPath: ModelPath
  onLoad?: () => void
  onError?: (error: Error) => void
}

// Create a cache for loaded models
const modelCache: Record<string, any> = {}

export function useModel({ modelPath, onLoad, onError }: UseModelProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Resolve model path
  const resolvedPath = typeof modelPath === 'string' 
    ? (modelPath in MODEL_PATHS 
      ? MODEL_PATHS[modelPath as ModelType] 
      : modelPath)
    : MODEL_PATHS[modelPath]
  
  console.log('Loading model from path:', resolvedPath)
  
  // Check cache first
  useEffect(() => {
    if (modelCache[resolvedPath]) {
      console.log(`Using cached model: ${resolvedPath}`)
      setIsLoading(false)
      if (onLoad) onLoad()
    }
  }, [resolvedPath, onLoad])
  
  // Use drei's useGLTF hook which handles loading and caching
  const gltf = useGLTF(resolvedPath, true)
  const model = { scene: gltf.scene, animations: gltf.animations }
  
  // Handle loading complete
  useEffect(() => {
    if (model.scene) {
      console.log(`Model loaded: ${resolvedPath}`)
      modelCache[resolvedPath] = model
      setIsLoading(false)
      if (onLoad) onLoad()
    }
  }, [model.scene, resolvedPath, onLoad, model])
  
  // Handle errors with a timeout if model doesn't load
  useEffect(() => {
    if (!resolvedPath) {
      const err = new Error(`Invalid model path: ${modelPath}`)
      console.error(err)
      setError(err)
      setIsLoading(false)
      if (onError) onError(err)
      return
    }
    
    // Set a timeout to catch loading errors
    const timeout = setTimeout(() => {
      if (isLoading && !model.scene) {
        const timeoutError = new Error(`Model loading timeout: ${resolvedPath}`)
        console.warn(timeoutError)
        setIsLoading(false)
        setError(timeoutError)
        if (onError) onError(timeoutError)
      }
    }, 10000) // 10 second timeout
    
    // Handle window errors that might be related to model loading
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes(resolvedPath)) {
        const loadError = new Error(`Failed to load model: ${resolvedPath}`)
        console.error(loadError)
        setIsLoading(false)
        setError(loadError)
        if (onError) onError(loadError)
      }
    }
    
    window.addEventListener('error', handleError)
    
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('error', handleError)
    }
  }, [resolvedPath, modelPath, isLoading, model.scene, onError])

  return { model, isLoading, error }
}

// Preload all models
export function preloadModels() {
  Object.values(MODEL_PATHS).forEach(path => {
    if (path) {
      useGLTF.preload(path)
    }
  })
}

export default useModel 