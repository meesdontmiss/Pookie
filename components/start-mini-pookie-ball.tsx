'use client'

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, useGLTF, Html } from '@react-three/drei'
import { PookieInBallEffect } from '@/components/plug-penguin/minigames/superpookieball/pookie-in-ball-effect'

useGLTF.preload('/models/POOKIE.glb')

export default function StartMiniPookieBall() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.9, 3.0], fov: 45 }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      shadows={false}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} />
      <Suspense fallback={<Html center style={{ pointerEvents: 'none', color: '#9ae6b4', fontWeight: 700 }}>Loading...</Html>}>
        <PookieInBallEffect position={[0, 0, 0]} scale={1.0} />
      </Suspense>
    </Canvas>
  )
}


