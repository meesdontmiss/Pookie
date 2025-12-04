'use client'

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, useGLTF, Html } from '@react-three/drei'
import { PookieInBallEffect } from '@/components/plug-penguin/minigames/superpookieball/pookie-in-ball-effect'

useGLTF.preload('/models/POOKIE.glb')

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
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
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
        <Suspense fallback={<Html center style={{ pointerEvents: 'none', color: '#9ae6b4', fontWeight: 700 }}>Loading...</Html>}>
          <PookieInBallEffect position={[0, -0.1, 0]} scale={0.9} />
        </Suspense>
      </Canvas>
    </div>
  )
}


