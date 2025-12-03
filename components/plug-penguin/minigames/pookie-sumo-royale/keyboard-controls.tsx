'use client'

import React from 'react'

export const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
]

export const KeyboardControls: React.FC<{ map?: any; children: React.ReactNode }> = ({ children }) => {
  // Simple passthrough wrapper; actual controls handled in scene
  return <>{children}</>
}

export default KeyboardControls


