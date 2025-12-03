'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'
import * as THREE from 'three'

type PlacedShape = {
  id: string
  type: 'box' | 'sphere' | 'capsule'
  position: THREE.Vector3
  scale: THREE.Vector3
  rotation: THREE.Euler
  hasCollision: boolean
  isLocked?: boolean
  groupId?: string | null
  name?: string
}

type CollisionShapeContextValue = {
  isEditorEnabled: boolean
  setIsEditorEnabled: (enabled: boolean) => void
  selectedShape: 'box' | 'sphere' | 'capsule' | null
  setSelectedShape: (type: 'box' | 'sphere' | 'capsule' | null) => void
  isPlacingShape: boolean
  setIsPlacingShape: (placing: boolean) => void
  shapeScale: THREE.Vector3
  setShapeScale: (scale: THREE.Vector3) => void
  shapeRotation: THREE.Euler
  setShapeRotation: (rot: THREE.Euler) => void
  placedShapes: PlacedShape[]
  updateShapes: (shapes: PlacedShape[]) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  toggleCollision: (id: string) => void
  selectedShapeId: string | null
  setSelectedShapeId: (id: string | null) => void
  recentlyImportedShapeIds: string[]
  setRecentlyImportedShapeIds: (ids: string[]) => void
  playerPosition?: THREE.Vector3
  deleteShape: (id: string) => void
}

const CollisionShapeContext = createContext<CollisionShapeContextValue | undefined>(undefined)

export function CollisionShapeProvider({ children }: { children: React.ReactNode }) {
  const [isEditorEnabled, setIsEditorEnabled] = useState(false)
  const [selectedShape, setSelectedShape] = useState<'box' | 'sphere' | 'capsule' | null>(null)
  const [isPlacingShape, setIsPlacingShape] = useState(false)
  const [shapeScale, setShapeScale] = useState(new THREE.Vector3(1, 1, 1))
  const [shapeRotation, setShapeRotation] = useState(new THREE.Euler(0, 0, 0, 'XYZ'))
  const [placedShapes, setPlacedShapes] = useState<PlacedShape[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [recentlyImportedShapeIds, setRecentlyImportedShapeIds] = useState<string[]>([])

  const value = useMemo<CollisionShapeContextValue>(() => ({
    isEditorEnabled,
    setIsEditorEnabled,
    selectedShape,
    setSelectedShape,
    isPlacingShape,
    setIsPlacingShape,
    shapeScale,
    setShapeScale,
    shapeRotation,
    setShapeRotation,
    placedShapes,
    updateShapes: setPlacedShapes,
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
    toggleCollision: (id: string) => {
      setPlacedShapes(prev => prev.map(s => s.id === id ? { ...s, hasCollision: !s.hasCollision } : s))
    },
    selectedShapeId,
    setSelectedShapeId,
    recentlyImportedShapeIds,
    setRecentlyImportedShapeIds,
    deleteShape: (id: string) => setPlacedShapes(prev => prev.filter(s => s.id !== id)),
  }), [isEditorEnabled, selectedShape, isPlacingShape, shapeScale, shapeRotation, placedShapes, selectedShapeId, recentlyImportedShapeIds])

  return <CollisionShapeContext.Provider value={value}>{children}</CollisionShapeContext.Provider>
}

export function useCollisionShape(): CollisionShapeContextValue {
  const ctx = useContext(CollisionShapeContext)
  if (!ctx) {
    // Return a safe fallback to avoid crashes in pages that import this
    return {
      isEditorEnabled: false,
      setIsEditorEnabled: () => {},
      selectedShape: null,
      setSelectedShape: () => {},
      isPlacingShape: false,
      setIsPlacingShape: () => {},
      shapeScale: new THREE.Vector3(1, 1, 1),
      setShapeScale: () => {},
      shapeRotation: new THREE.Euler(0, 0, 0, 'XYZ'),
      setShapeRotation: () => {},
      placedShapes: [],
      updateShapes: () => {},
      canUndo: false,
      canRedo: false,
      undo: () => {},
      redo: () => {},
      toggleCollision: () => {},
      selectedShapeId: null,
      setSelectedShapeId: () => {},
      recentlyImportedShapeIds: [],
      setRecentlyImportedShapeIds: () => {},
      deleteShape: () => {},
    }
  }
  return ctx
}


