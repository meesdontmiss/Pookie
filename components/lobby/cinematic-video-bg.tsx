'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import styles from '@/app/pookiesumoroyale/lobby-browser/lobby.module.css'

// Lazy-load the heavy Canvas fallback only if needed
const CinematicSumoBg = dynamic(() => import('./cinematic-sumo-bg'), { ssr: false })

export default function CinematicVideoBg() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [useVideo, setUseVideo] = useState(true)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    // If the video hasn't loaded within 1500ms, fallback to Canvas
    const timeout = setTimeout(() => {
      if (!videoReady) setUseVideo(false)
    }, 1500)
    return () => clearTimeout(timeout)
  }, [videoReady])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0b1324' }}>
      {useVideo ? (
        <video
          ref={videoRef}
          src="/videos/pookie-sumo-cinematic.mp4"
          // No poster: avoid banner flash between states
          autoPlay
          muted
          loop
          playsInline
          onCanPlayThrough={() => setVideoReady(true)}
          onError={() => setUseVideo(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.05) contrast(1.02)',
            background: '#0b1324',
          }}
        />
      ) : (
        <CinematicSumoBg />
      )}
    </div>
  )
}


