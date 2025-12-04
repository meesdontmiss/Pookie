'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import styles from '@/app/HomeHero.module.css'

export interface DockItem {
  key: string
  title?: string
  onClick: () => void
  render?: React.ReactNode
  imageSrc?: string
  imageStyle?: React.CSSProperties
}

export default function StartDock({ items }: { items: DockItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [scales, setScales] = useState<number[]>(() => items.map(() => 1))
  const activeIdxRef = useRef<number | null>(null)

  const playSound = (type: 'hover' | 'down' | 'up') => {
    try {
      const audio = new Audio('/sounds/mouseclick.mp3')
      if (type === 'hover') {
        audio.volume = 0.35
        audio.playbackRate = 1.1
      } else if (type === 'down') {
        audio.volume = 0.5
        audio.playbackRate = 0.95
      } else {
        audio.volume = 0.45
        audio.playbackRate = 1.15
      }
      void audio.play()
    } catch {}
  }

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  const updateScales = (clientX: number | null) => {
    if (clientX === null) {
      setScales(items.map(() => 1))
      activeIdxRef.current = null
      return
    }
    // Compact influence kernel: only magnify within a finite radius
    const radius = 65 // px influence radius (smaller = fewer icons affected)
    const maxBoost = 0.45 // max extra scale => 1.45x
    let bestIdx = -1
    let bestScale = 1
    const newScales = itemRefs.current.map((el, idx) => {
      if (!el) return 1
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const dx = Math.abs(clientX - center)
      if (dx >= radius) return 1
      // Smooth falloff with finite support
      const t = 1 - dx / radius
      const boost = maxBoost * t * t * t
      const s = 1 + boost
      if (s > bestScale) {
        bestScale = s
        bestIdx = idx
      }
      return s
    })
    // Play hover tick when focused icon changes
    const prev = activeIdxRef.current
    if (bestScale > 1.06 && bestIdx !== -1 && bestIdx !== prev) {
      activeIdxRef.current = bestIdx
      playSound('hover')
    }
    setScales(newScales)
  }

  const handleMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX)
    updateScales(e.clientX)
  }
  const handleLeave = () => {
    setMouseX(null)
    updateScales(null)
  }

  return (
    <div className={styles.dock}>
      <div
        ref={containerRef}
        className={styles.dockInner}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {items.map((item, idx) => {
          const scale = scales[idx] ?? 1
          const lift = Math.min(10, (scale - 1) * 18) // subtler lift
          const shadowStrength = 0.40 + (scale - 1) * 0.3
          return (
            <button
              key={item.key}
              title={item.title}
              className={styles.dockItem}
              onClick={item.onClick}
              onMouseDown={() => playSound('down')}
              onMouseUp={() => playSound('up')}
              ref={(el) => (itemRefs.current[idx] = el)}
              style={{
                transform: `translateY(${-lift}px) scale(${scale})`,
                filter: `drop-shadow(0 10px 22px rgba(0,0,0,${shadowStrength}))`,
              }}
            >
              {item.render ? (
                <div className={styles.dockModel} style={{ width: '100%', height: '100%' }}>
                  {item.render}
                </div>
              ) : item.imageSrc ? (
                <img
                  src={item.imageSrc}
                  alt={item.title || item.key}
                  className={styles.dockImg}
                  style={item.imageStyle}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}


