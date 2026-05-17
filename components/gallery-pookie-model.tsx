"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Center, Environment, useGLTF } from "@react-three/drei"
import * as THREE from "three"

type PointerTarget = {
  x: number
  y: number
}

function GalleryPookie({ pointer, onReady = () => undefined }: { pointer: PointerTarget; onReady?: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF("/models/POOKIE.glb")

  const model = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          materials.forEach((material) => {
            material.needsUpdate = true
          })
        }
      }
    })

    return clone
  }, [scene])

  useEffect(() => {
    onReady()
  }, [onReady])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const elapsed = clock.getElapsedTime()
    const targetY = pointer.x * 0.62
    const targetX = THREE.MathUtils.clamp(-pointer.y * 0.22, -0.18, 0.2)
    const targetZ = THREE.MathUtils.clamp(-pointer.x * 0.08, -0.08, 0.08)
    const targetXPosition = pointer.x * 0.12

    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.075)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.065)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.055)
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetXPosition, 0.06)
    groupRef.current.position.y = -0.08 + Math.sin(elapsed * 1.25) * 0.055
  })

  return (
    <group ref={groupRef} scale={0.66} rotation={[0.04, -0.08, 0]}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  )
}

function PookieModelFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
      }}
    >
      <img
        src="/website/pookie 3D spin.gif"
        alt=""
        aria-hidden="true"
        style={{ width: "min(78%, 360px)", height: "auto", objectFit: "contain" }}
      />
    </div>
  )
}

export default function GalleryPookieModel() {
  const [pointer, setPointer] = useState<PointerTarget>({ x: 0, y: 0 })
  const [isLoaded, setIsLoaded] = useState(false)
  const handleModelReady = useCallback(() => setIsLoaded(true), [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      setPointer({
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      })
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    return () => window.removeEventListener("pointermove", handlePointerMove)
  }, [])

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!isLoaded ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <PookieModelFallback />
        </div>
      ) : null}
      <Canvas
        camera={{ position: [0, 0.85, 7.2], fov: 38 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        shadows
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} color="#d8fff0" castShadow />
        <pointLight position={[-3.4, 1.8, 3.2]} intensity={2.2} color="#7df9ff" />
        <pointLight position={[3.6, -0.5, 2.8]} intensity={1.8} color="#a3ff43" />
        <Suspense fallback={null}>
          <GalleryPookie pointer={pointer} onReady={handleModelReady} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}

export { PookieModelFallback }

useGLTF.preload("/models/POOKIE.glb")
