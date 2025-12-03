'use client'

import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useGLTF, useTexture, Torus } from '@react-three/drei'
import { Physics, RigidBody, CylinderCollider, BallCollider, TrimeshCollider } from '@react-three/rapier'
import { PookieInBallEffect } from '@/components/plug-penguin/minigames/superpookieball/pookie-in-ball-effect'
import PushEffect from '@/components/plug-penguin/effects/PushEffect'
import * as THREE from 'three'

// Preload models
useGLTF.preload('/models/POOKIE.glb')
useGLTF.preload('/models/pookie_blimp.glb')

const platformRadius = 20
const platformHeight = 4

type Shot = {
  position: THREE.Vector3
  target: THREE.Vector3
  fov: number
  duration: number
  driftAmp?: number
  driftFreq?: number
}

// Cinematic shots (varying “lenses”/angles)
const SHOTS: Shot[] = [
  { position: new THREE.Vector3(35, 15, 35), target: new THREE.Vector3(0, 2, 0), fov: 50, duration: 8000, driftAmp: 0.15, driftFreq: 0.2 },
  { position: new THREE.Vector3(-25, 20, 30), target: new THREE.Vector3(5, 0, -5), fov: 45, duration: 8000, driftAmp: 0.15, driftFreq: 0.18 },
  // Top-down shot — reduce drift amplitude and frequency to avoid dizzy spin
  { position: new THREE.Vector3(0, 40, 0), target: new THREE.Vector3(0, 0, 0), fov: 60, duration: 8000, driftAmp: 0.04, driftFreq: 0.06 },
  { position: new THREE.Vector3(30, 8, -30), target: new THREE.Vector3(-10, 2, 10), fov: 40, duration: 8000, driftAmp: 0.12, driftFreq: 0.16 },
  { position: new THREE.Vector3(-40, 12, -20), target: new THREE.Vector3(0, 5, 0), fov: 55, duration: 8000, driftAmp: 0.12, driftFreq: 0.18 },
]

function PaddedEdges() {
  const tubeRadius = 0.75
  const radialSegments = 16
  const tubularSegments = 48
  // Build a torus geometry and reuse the vertices/indices for a collision mesh
  const geometry = useMemo(() => {
    const geo = new THREE.TorusGeometry(platformRadius, tubeRadius, radialSegments, tubularSegments)
    geo.rotateX(Math.PI / 2)
    geo.translate(0, platformHeight / 2, 0)
    return geo
  }, [tubeRadius, radialSegments, tubularSegments])
  const vertices = geometry.attributes.position.array as Float32Array
  const indices = geometry.index!.array as Uint32Array
  return (
    <group>
      <Torus
        args={[platformRadius, tubeRadius, radialSegments, tubularSegments]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, platformHeight / 2, 0]}
        castShadow
      >
        <meshStandardMaterial color="#e0e0e0" roughness={0.6} metalness={0.1} />
      </Torus>
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[vertices, indices]} restitution={0.4} friction={0.8} />
      </RigidBody>
    </group>
  )
}

function GlowingTrim() {
  const trimTubeRadius = 0.15
  const radialSegments = 16
  const tubularSegments = 48
  const pastelLavender = new THREE.Color('#E6E6FA')
  return (
    <Torus
      args={[platformRadius, trimTubeRadius, radialSegments, tubularSegments]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, platformHeight / 2 + 0.01, 0]}
    >
      <meshStandardMaterial
        color={pastelLavender}
        emissive={pastelLavender}
        emissiveIntensity={1.5}
        toneMapped={false}
        roughness={0.5}
        metalness={0.2}
      />
    </Torus>
  )
}

function ArenaPlatform() {
  const [diffuseMap, aoMap] = useTexture([
    '/textures/granite_tile/granite_tile_diff_1k.jpg',
    '/textures/granite_tile/granite_tile_ao_1k.jpg',
  ])
  ;[diffuseMap, aoMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
  })
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[platformHeight / 2, platformRadius]} />
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[platformRadius, platformRadius, platformHeight, 64]} />
          <meshStandardMaterial
            map={diffuseMap}
            aoMap={aoMap}
            aoMapIntensity={1}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      </RigidBody>
      <PaddedEdges />
      <GlowingTrim />
    </group>
  )
}

function SumoArena() {
  return (
    <group>
      <Physics gravity={[0, -30, 0]}>
        <ArenaPlatform />
        {/* Pookie Blimp circling the arena */}
        <PookieBlimp />
        {/* Real physics-based rolling players */}
        <RollingPlayer color="#ff4444" spawnAngle={0} />
        <RollingPlayer color="#44a5ff" spawnAngle={Math.PI / 2} />
        <RollingPlayer color="#00ff88" spawnAngle={Math.PI} />
        <RollingPlayer color="#ffd44d" spawnAngle={-Math.PI / 2} />
      </Physics>
      <FallingSnowParticles />
    </group>
  )
}

function PookieBlimp() {
  const { scene: blimpScene } = useGLTF('/models/pookie_blimp.glb') as any
  const cloned = useMemo(() => blimpScene.clone(), [blimpScene])
  const blimpRef = useRef<THREE.Group>(null!)
  const blimpPathRadius = platformRadius + 18
  const blimpAltitude = platformHeight + 5
  const blimpSpeed = 0.15

  // Prepare clone materials for better visuals
  useEffect(() => {
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [cloned])

  useFrame((clock) => {
    if (!blimpRef.current) return
    const angle = -clock.clock.elapsedTime * blimpSpeed
    blimpRef.current.position.x = Math.cos(angle) * blimpPathRadius
    blimpRef.current.position.z = Math.sin(angle) * blimpPathRadius
    blimpRef.current.position.y = blimpAltitude
    // Rotate 90° counter-clockwise relative to previous heading
    blimpRef.current.rotation.y = -angle + Math.PI
  })

  return (
    <group ref={blimpRef} scale={4.5}>
      <primitive object={cloned} />
    </group>
  )
}

// Simple registry so AI players can interact (push) with each other
type BodyEntry = { id: string; body: any }
const CINEMATIC_PLAYER_BODIES: BodyEntry[] = []

function RollingPlayer({ color, spawnAngle }: { color: string; spawnAngle: number }) {
  const bodyRef = useRef<any>(null)
  const targetDirRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const lastChangeRef = useRef(0)
  const lastPushRef = useRef(0)
  const [fxId, setFxId] = useState<string | null>(null)
  const idRef = useRef<string>(() => Math.random().toString(36).slice(2)) as React.MutableRefObject<any>
  if (typeof idRef.current === 'function') idRef.current = idRef.current()

  // Initial spawn around a ring
  const spawnRadius = platformRadius * 0.55
  const spawnHeight = platformHeight / 2 + 1.2
  const spawnX = Math.cos(spawnAngle) * spawnRadius
  const spawnZ = Math.sin(spawnAngle) * spawnRadius

  // Register/unregister in global registry
  useEffect(() => {
    CINEMATIC_PLAYER_BODIES.push({ id: idRef.current, body: bodyRef })
    return () => {
      const idx = CINEMATIC_PLAYER_BODIES.findIndex(e => e.id === idRef.current)
      if (idx >= 0) CINEMATIC_PLAYER_BODIES.splice(idx, 1)
    }
  }, [])

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return

    const now = state.clock.elapsedTime
    // Change target direction every 1.5-2.5 seconds
    if (now - lastChangeRef.current > 1.5 + Math.random() * 1.0) {
      // Prefer directions that keep players interacting: slight bias toward center
      const toCenter = new THREE.Vector3(0, 0, 0)
      const pos = body.translation() as { x: number; y: number; z: number }
      const dirToCenter = new THREE.Vector3(toCenter.x - pos.x, 0, toCenter.z - pos.z).normalize()
      const random = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
      targetDirRef.current.copy(dirToCenter.multiplyScalar(0.7).add(random.multiplyScalar(0.3)).normalize())
      lastChangeRef.current = now
    }

    // If near outer edge, force inward
    const pos = body.translation() as { x: number; y: number; z: number }
    const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
    if (r > platformRadius * 0.8) {
      targetDirRef.current.set(-pos.x, 0, -pos.z).normalize()
    }

    // Apply impulse toward target direction if speed is low
    const vel = body.linvel() as { x: number; y: number; z: number }
    const speed = Math.hypot(vel.x, vel.z)
    const desired = 16
    if (speed < desired) {
      const impulseStrength = 1.0
      body.applyImpulse(
        { x: targetDirRef.current.x * impulseStrength, y: 0, z: targetDirRef.current.z * impulseStrength },
        true
      )
      // Add a little torque to simulate rolling spin
      body.applyTorqueImpulse(
        { x: (Math.random() - 0.5) * 0.04, y: (Math.random() - 0.5) * 0.04, z: (Math.random() - 0.5) * 0.04 },
        true
      )
    }

    // Attempt a PUSH action when close to another player
    try {
      const pushCooldown = 1.2
      const pushRange = 2.2
      const pushStrength = 9.0 // stronger cinematic push, closer to gameplay vibe
      if (now - lastPushRef.current > pushCooldown) {
        const myPos = body.translation() as { x: number; y: number; z: number }
        const nearby: any[] = []
        for (const entry of CINEMATIC_PLAYER_BODIES) {
          if (entry.id === idRef.current) continue
          const otherBody = entry.body?.current
          if (!otherBody) continue
          const op = otherBody.translation() as { x: number; y: number; z: number }
          const dx = op.x - myPos.x
          const dz = op.z - myPos.z
          const d = Math.hypot(dx, dz)
          if (d < pushRange) nearby.push(otherBody)
        }
        if (nearby.length > 0) {
          // Radial AoE push: apply to all nearby
          for (const oth of nearby) {
            const op = oth.translation() as { x: number; y: number; z: number }
            const dir = new THREE.Vector3(op.x - myPos.x, 0, op.z - myPos.z).normalize()
            oth.applyImpulse({ x: dir.x * pushStrength, y: 0, z: dir.z * pushStrength }, true)
            // Extra spin on target
            oth.applyTorqueImpulse({ x: 0, y: (Math.random() - 0.5) * 0.09, z: 0 }, true)
          }
          // Reaction on pusher
          body.applyImpulse({ x: 0, y: 0, z: 0 }, true)
          body.applyTorqueImpulse({ x: 0, y: (Math.random() - 0.5) * 0.08, z: 0 }, true)
          // Visual ring
          try { setFxId(Math.random().toString(36).slice(2)) } catch {}
          lastPushRef.current = now
        }
      }
    } catch {}
  })

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      canSleep={false}
      linearDamping={0.12}
      angularDamping={0.08}
      friction={1.0}
      restitution={0.2}
      position={[spawnX, spawnHeight, spawnZ]}
      name="cinematic-player"
    >
      <BallCollider args={[1]} />
      <PookieInBallEffect position={[0, 0, 0]} scale={1.0} color={color} />
      {fxId && (
        <PushEffect
          id={fxId}
          position={new THREE.Vector3(0, 0.01, 0)}
          onComplete={() => setFxId(null)}
          duration={420}
          initialRadius={0.4}
          maxRadius={2.6}
          color="#00ffea"
        />
      )}
    </RigidBody>
  )
}

// Removed custom PookieBall in favor of shared PookieInBallEffect

function FallingSnowParticles() {
  const count = 500
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100
      pos[i * 3 + 1] = Math.random() * 50
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    return pos
  }, [])

  const ref = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (!ref.current) return
    const positions = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= 0.05
      if (positions[i * 3 + 1] < -10) {
        positions[i * 3 + 1] = 50
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.6} />
    </points>
  )
}

function CinematicLayer({ shot, seed = 0 }: { shot: Shot; seed?: number }) {
  const { camera } = useThree()
  const t0 = useRef(0)

  useEffect(() => {
    camera.position.copy(shot.position)
    camera.fov = shot.fov
    camera.updateProjectionMatrix()
    camera.lookAt(shot.target)
    t0.current = performance.now()
  }, [camera, shot])

  // Subtle handheld drift per layer to add life (very small)
  useFrame(() => {
    const t = (performance.now() - t0.current) / 1000
    const amp = shot.driftAmp ?? 0.15
    const freq = shot.driftFreq ?? 0.2
    camera.position.x = shot.position.x + Math.sin(t * freq + seed) * amp
    camera.position.y = shot.position.y + Math.sin(t * (freq * 0.85) + seed * 2) * amp
    camera.position.z = shot.position.z + Math.cos(t * (freq * 1.1) + seed * 3) * amp
    camera.lookAt(shot.target)
  })

  return null
}

export default function CinematicSumoBg({ singleLayer = false }: { singleLayer?: boolean } = {}) {
  if (singleLayer) {
    // Single-canvas variant (better for recording/capture)
    function CinematicCameraSingle() {
      const { camera } = useThree()
      const startTime = useRef(performance.now())
      const idxRef = useRef(0)
      const startPos = useRef(new THREE.Vector3())
      const startTar = useRef(new THREE.Vector3())
      const endPos = useRef(new THREE.Vector3())
      const endTar = useRef(new THREE.Vector3())
      const startFov = useRef(50)
      const endFov = useRef(50)
      const durRef = useRef(SHOTS[0].duration)
      useEffect(() => {
        const a = SHOTS[0]
        const b = SHOTS[1]
        startPos.current.copy(a.position); startTar.current.copy(a.target); startFov.current = a.fov
        endPos.current.copy(b.position); endTar.current.copy(b.target); endFov.current = b.fov
        camera.position.copy(a.position); camera.fov = a.fov; camera.updateProjectionMatrix(); camera.lookAt(a.target)
        startTime.current = performance.now()
        durRef.current = a.duration
      }, [camera])
      useFrame(() => {
        const now = performance.now()
        const t = Math.min(1, (now - startTime.current) / durRef.current)
        const eased = 0.5 - Math.cos(t * Math.PI) / 2
        camera.position.lerpVectors(startPos.current, endPos.current, eased)
        const curTar = new THREE.Vector3().lerpVectors(startTar.current, endTar.current, eased)
        camera.fov = startFov.current + (endFov.current - startFov.current) * eased
        camera.updateProjectionMatrix()
        camera.lookAt(curTar)
        if (t >= 1) {
          idxRef.current = (idxRef.current + 1) % SHOTS.length
          const a = SHOTS[idxRef.current]
          const b = SHOTS[(idxRef.current + 1) % SHOTS.length]
          startPos.current.copy(a.position); startTar.current.copy(a.target); startFov.current = a.fov
          endPos.current.copy(b.position); endTar.current.copy(b.target); endFov.current = b.fov
          startTime.current = performance.now()
          durRef.current = a.duration
        }
      })
      return null
    }
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ position: [35, 15, 35], fov: 50 }} style={{ width: '100%', height: '100%' }} shadows>
          <CinematicCameraSingle />
          <ambientLight intensity={0.6} />
          <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
          <Suspense fallback={null}>
            <SumoArena />
            <Environment files="/HDRI/passendorf_snow_1k.hdr" background />
          </Suspense>
          <fog attach="fog" args={['#0e1a2c', 80, 160]} />
        </Canvas>
      </div>
    )
  }
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [nextIdx, setNextIdx] = React.useState(1)
  const [fade, setFade] = React.useState(0) // 0 = only A visible, 1 = only B visible
  const [aOnTop, setAOnTop] = React.useState(true)

  // Scheduling crossfades between shots
  React.useEffect(() => {
    let raf: number | null = null
    let shotTimer: number | null = null
    const CROSS = 900 // ms

    const run = () => {
      const shot = SHOTS[activeIdx]
      // Start crossfade before shot end
      const startFadeIn = window.setTimeout(() => {
        const start = performance.now()
        const step = () => {
          const p = Math.min(1, (performance.now() - start) / CROSS)
          setFade(p)
          if (p < 1) {
            raf = requestAnimationFrame(step)
          } else {
            // Swap layers and advance indices
            setActiveIdx((i) => (i + 1) % SHOTS.length)
            setNextIdx((i) => (i + 1) % SHOTS.length)
            setFade(0)
            setAOnTop((prev) => !prev)
            // Schedule next cycle
            run()
          }
        }
        step()
      }, Math.max(0, shot.duration - CROSS))
      shotTimer = startFadeIn
    }
    run()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (shotTimer) clearTimeout(shotTimer)
    }
  }, [activeIdx])

  const shotA = SHOTS[aOnTop ? activeIdx : nextIdx]
  const shotB = SHOTS[aOnTop ? nextIdx : activeIdx]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Layer A */}
      <div style={{ position: 'absolute', inset: 0, opacity: aOnTop ? 1 - fade : fade, transition: 'opacity 100ms linear' }}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: [35, 15, 35], fov: 50 }} style={{ width: '100%', height: '100%' }} shadows>
          <CinematicLayer shot={shotA} seed={1} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
          <Suspense fallback={null}>
            <SumoArena />
            <Environment files="/HDRI/passendorf_snow_1k.hdr" background />
          </Suspense>
          <fog attach="fog" args={['#0e1a2c', 80, 160]} />
        </Canvas>
      </div>
      {/* Layer B */}
      <div style={{ position: 'absolute', inset: 0, opacity: aOnTop ? fade : 1 - fade, transition: 'opacity 100ms linear' }}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: [35, 15, 35], fov: 50 }} style={{ width: '100%', height: '100%' }} shadows>
          <CinematicLayer shot={shotB} seed={2} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
          <Suspense fallback={null}>
            <SumoArena />
            <Environment files="/HDRI/passendorf_snow_1k.hdr" background />
          </Suspense>
          <fog attach="fog" args={['#0e1a2c', 80, 160]} />
        </Canvas>
      </div>
    </div>
  )
}

