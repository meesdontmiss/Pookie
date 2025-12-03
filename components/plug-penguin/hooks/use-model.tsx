import { useState, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'

interface UseModelProps {
  modelPath: string
  onLoad?: () => void
  onError?: (error: Error) => void
  draco?: boolean
}

export function useModel({ modelPath, onLoad, onError, draco = false }: UseModelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const model = useGLTF(modelPath)

  useEffect(() => {
    if (model) {
      setIsLoading(false)
      if (onLoad) onLoad()
    }
    
    // Clean up function
    return () => {
      useGLTF.preload(modelPath)
    }
  }, [model, modelPath, onLoad])

  return { model, isLoading, error }
}

// Preload the model
useGLTF.preload('/models/POOKIE.glb') 