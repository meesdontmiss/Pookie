'use client'

import { useEffect } from 'react'

export default function PreloadPookieOnIdle() {
  useEffect(() => {
    const preload = async () => {
      try {
        const mod = await import('@react-three/drei')
        mod.useGLTF.preload('/models/POOKIE.glb')
      } catch {}
    }
    // Prefer idle; fallback to small timeout
    if (typeof (window as any).requestIdleCallback === 'function') {
      ;(window as any).requestIdleCallback(preload)
    } else {
      setTimeout(preload, 300)
    }
  }, [])
  return null
}


