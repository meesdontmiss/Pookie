'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type CollisionEditorContextValue = {
  isEditorMode: boolean
  setEditorMode: (enabled: boolean, _playerPosition?: any) => void
}

const CollisionEditorContext = createContext<CollisionEditorContextValue | undefined>(undefined)

export function CollisionEditorProvider({ children }: { children: React.ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false)

  const value = useMemo<CollisionEditorContextValue>(() => ({
    isEditorMode,
    setEditorMode: (enabled: boolean) => setIsEditorMode(enabled),
  }), [isEditorMode])

  return <CollisionEditorContext.Provider value={value}>{children}</CollisionEditorContext.Provider>
}

export function useCollisionEditor(): CollisionEditorContextValue {
  const ctx = useContext(CollisionEditorContext)
  if (!ctx) {
    return {
      isEditorMode: false,
      setEditorMode: () => {},
    }
  }
  return ctx
}


