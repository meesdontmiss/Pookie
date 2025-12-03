'use client'

import React, { Suspense, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

useGLTF.preload('/models/discoball.glb')

function DiscoBallModel() {
  const { scene } = useGLTF('/models/discoball.glb', true) as any
  const groupRef = React.useRef<THREE.Group>(null)
  
  useEffect(() => {
    console.log('🪩 Disco ball model loaded:', scene)
  }, [scene])
  
  const cloned = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        console.log('🪩 Disco ball mesh found:', child.name, child.geometry, child.material)
        // Enhance disco ball materials for shine
        if (child.material) {
          child.material.metalness = 1
          child.material.roughness = 0.1
          child.material.needsUpdate = true
        }
      }
    })
    return clone
  }, [scene])
  
  // Rotate the disco ball
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })
  
  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1.2, 1.2, 1.2]}>
      <primitive object={cloned} />
    </group>
  )
}

export default function StartIglooButton() {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    console.log('🪩 Disco ball button mounted')
  }, [])
  
  if (!mounted) {
    return <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
  }
  
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 4], fov: 40 }}
      style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
      shadows={false}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <pointLight position={[-3, 3, -3]} intensity={0.8} color="#ff00ff" />
      <pointLight position={[3, -3, 3]} intensity={0.8} color="#00ffff" />
      <Suspense fallback={<Html center><div style={{ color: 'cyan' }}>Loading...</div></Html>}>
        <DiscoBallModel />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}

