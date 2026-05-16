'use client'

import { useEffect } from 'react'
import { ASSET_PATHS } from '@/components/plug-penguin/utils/constants'

export default function PreloadPookieOnIdle() {
  useEffect(() => {
    const preload = async () => {
      try {
        const mod = await import('@react-three/drei')
        mod.useGLTF.preload(ASSET_PATHS.MODELS.PENGUIN)
      } catch {}
    }
    if (typeof window !== 'undefined') {
      if (typeof (window as any).requestIdleCallback === 'function') {
        ;(window as any).requestIdleCallback(preload)
      } else {
        setTimeout(preload, 300)
      }
    }
  }, [])
  return null
}


