"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, useGLTF } from "@react-three/drei"
import * as THREE from "three"

type PointerTarget = {
  // Cursor direction relative to the model's on-screen center (x right, y up).
  // The head points along this direction; below center => handstand.
  aimX: number
  aimY: number
}

// The GLB's natural orientation is a side profile, so spin it a quarter turn
// so its front rests facing the camera. Flip the sign if Pookie faces away.
const MODEL_BASE_YAW = Math.PI / 2

// Flip to -1 if the head sweeps the mirror-image way around the cursor.
const ROLL_DIR = 1

// Lerp between angles along the shortest arc so the model never whips the
// long way around when the target crosses the -π / π seam (e.g. near handstand).
function lerpAngle(current: number, target: number, t: number) {
  let diff = (target - current) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return current + diff * t
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

    // Pin the pivot to the geometry's bounding-box center so the model rotates
    // in place instead of orbiting an off-center origin.
    const box = new THREE.Box3().setFromObject(clone)
    const center = box.getCenter(new THREE.Vector3())
    clone.position.sub(center)

    return clone
  }, [scene])

  useEffect(() => {
    onReady()
  }, [onReady])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const elapsed = clock.getElapsedTime()

    // Spin in the screen plane so the head points straight at the cursor.
    // Head rests pointing up (+Y); rotate it toward the cursor's direction.
    const targetRoll = ROLL_DIR * (Math.atan2(pointer.aimY, pointer.aimX) - Math.PI / 2)

    groupRef.current.rotation.z = lerpAngle(groupRef.current.rotation.z, targetRoll, 0.12)
    groupRef.current.position.y = -0.08 + Math.sin(elapsed * 1.25) * 0.055
  })

  return (
    <group ref={groupRef}>
      {/* Inner group faces the model toward the camera; the outer group rolls
          it in the screen plane to point the head at the cursor. */}
      <group rotation={[0, MODEL_BASE_YAW, 0]} scale={0.66}>
        <primitive object={model} />
      </group>
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
  const [pointer, setPointer] = useState<PointerTarget>({ aimX: 0, aimY: 1 })
  const [isLoaded, setIsLoaded] = useState(false)
  const [inView, setInView] = useState(true)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const handleModelReady = useCallback(() => setIsLoaded(true), [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Cursor offset from the model's on-screen center, normalized by its
      // half-size so the look-at intensity is independent of viewport size.
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return

      const aimX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
      const aimY = (rect.top + rect.height / 2 - event.clientY) / (rect.height / 2)

      // Ignore the dead zone right at the pivot where direction is undefined.
      if (Math.hypot(aimX, aimY) < 0.04) return

      setPointer({ aimX, aimY })
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    return () => window.removeEventListener("pointermove", handlePointerMove)
  }, [])

  // Stop rendering the WebGL scene while it is scrolled out of view to save GPU/battery.
  useEffect(() => {
    const node = wrapRef.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "120px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {!isLoaded ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <PookieModelFallback />
        </div>
      ) : null}
      <Canvas
        frameloop={inView ? "always" : "never"}
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
