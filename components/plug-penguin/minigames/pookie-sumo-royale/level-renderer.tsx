'use client'

import React from 'react'
import { Level } from './levels'

export default function LevelRenderer({
  level,
  onCollectItem,
  onReachGoal,
}: {
  level: Level
  onCollectItem: (id: number) => void
  onReachGoal: () => void
}) {
  // Minimal renderer placeholder; actual arena is provided elsewhere
  return null
}


