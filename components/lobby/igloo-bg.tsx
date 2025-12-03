'use client'

import React, { Suspense, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function IglooModel() {
  const { scene } = useGLTF('/models/IGLOO.glb', true) as any
  const cloned = useMemo(() => scene.clone(), [scene])
  return (
    <group position={[0, -3, 0]} rotation={[0, Math.PI * 0.2, 0]} scale={[1.6, 1.6, 1.6]}>
      <primitive object={cloned} />
    </group>
  )
}

function CameraFramer() {
  const { camera } = useThree()
  React.useEffect(() => {
    // Raise camera significantly higher for better interior view
    camera.position.set(-8.0, 5.5, -10.0)
    // keep narrow FOV, zoom out by distance instead (only if perspective)
    const pCam = camera as THREE.PerspectiveCamera & { isPerspectiveCamera?: boolean }
    if (pCam && (pCam as any).isPerspectiveCamera) {
      pCam.fov = 45
      pCam.updateProjectionMatrix()
    }
    // Aim at interior focal point (raised to match camera height)
    camera.lookAt(new THREE.Vector3(0, 2.2, 0.2))
  }, [camera])
  return null
}

export default function IglooBackground() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [-8.0, 5.5, -10.0], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      shadows={false}
    >
      <CameraFramer />
      {/* Removed manual lighting per request; rely on model and environment */}
      <Suspense fallback={null}>
        <IglooModel />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}


