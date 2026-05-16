'use client'

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { MiniPookieBallOptimized } from '@/components/mini-pookie-ball-optimized'
import { ASSET_PATHS } from '@/components/plug-penguin/utils/constants'

// Preload the model as early as possible
useGLTF.preload(ASSET_PATHS.MODELS.GAME_PENGUIN)

export default function StartMiniPookieBall() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: '8px'
    }}>
      <Canvas
        // Lower DPR for faster rendering on small canvas
        dpr={[1, 1.5]}
        gl={{ 
          antialias: false, // Disable for performance
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        camera={{ position: [0, 0.5, 2.5], fov: 50 }}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block' 
        }}
        shadows={false}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <Suspense fallback={null}>
          <MiniPookieBallOptimized position={[0, -0.1, 0]} scale={0.9} />
        </Suspense>
      </Canvas>
    </div>
  )
}

