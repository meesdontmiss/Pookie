'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'

function Snow() {
  const snowCount = 250

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(snowCount * 3)
    const particleSizes = new Float32Array(snowCount)

    for (let i = 0; i < snowCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15
      pos[i * 3 + 1] = Math.random() * 15 - 5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15
      const depth = Math.abs(pos[i * 3 + 2])
      particleSizes[i] = 0.05 + (0.15 * (1 - depth / 7.5)) * Math.random()
    }
    return { positions: pos, sizes: particleSizes }
  }, [])

  const particles = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (!particles.current) return
    const pos = particles.current.geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime()
    for (let i = 0; i < snowCount; i++) {
      const z = pos[i * 3 + 2]
      const depthFactor = 1 - Math.abs(z) / 7.5
      const fallSpeed = 0.015 + 0.02 * depthFactor + 0.005 * Math.random()
      pos[i * 3 + 1] -= fallSpeed
      pos[i * 3] += Math.sin(time * 0.2 + i) * 0.003 * depthFactor
      pos[i * 3 + 2] += Math.cos(time * 0.1 + i) * 0.002 * depthFactor
      if (pos[i * 3 + 1] < -8) {
        pos[i * 3] = (Math.random() - 0.5) * 15
        pos[i * 3 + 1] = 10
        pos[i * 3 + 2] = (Math.random() - 0.5) * 15
      }
    }
    particles.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        sizeAttenuation
        color="white"
        transparent
        opacity={0.8}
        depthWrite={false}
        vertexColors={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function StartSnow() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 5], fov: 40 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} />
        <Snow />
      </Canvas>
    </div>
  )
}


