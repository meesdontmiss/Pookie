'use client'

// Stub component for collision map visualizer
export function CollisionMapVisualizer({ 
  collisionMapPath, 
  modelPath, 
  position, 
  rotation, 
  scale, 
  onLoad, 
  onError 
}: { 
  collisionMapPath?: string
  modelPath?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  onLoad?: () => void
  onError?: (error: Error) => void
}) {
  return null
}

export default CollisionMapVisualizer

