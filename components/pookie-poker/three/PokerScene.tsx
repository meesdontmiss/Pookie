'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SeatVisualState } from '@/shared/pookie-poker'
import { POKIE_POKER_SEAT_ANCHORS } from '@/shared/pookie-poker'

export function PokerScene({ seats }: { seats: SeatVisualState[] }) {
  const [webglSupported, setWebglSupported] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setWebglSupported(Boolean(gl))
    } catch {
      setWebglSupported(false)
    }
  }, [])

  if (!webglSupported) return <RooftopSceneFallback seats={seats} />

  return (
    <Canvas camera={{ position: [0, 5.4, 7.2], fov: 46 }} shadows dpr={[1, 1.5]}>
      <color attach="background" args={['#070815']} />
      <fog attach="fog" args={['#070815', 9, 22]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 4, 0]} intensity={3} color="#f5d06f" castShadow />
      <pointLight position={[-4, 3, -3]} intensity={2.2} color="#33d7ff" />
      <pointLight position={[4, 3, 3]} intensity={1.8} color="#e879f9" />
      <RooftopEnvironment />
      <PokerTableModel />
      <PotGlow />
      <ChipStacks />
      {POKIE_POKER_SEAT_ANCHORS.map((anchor) => (
        <SeatAvatar
          key={anchor.seatIndex}
          position={anchor.position}
          state={seats.find((seat) => seat.seatIndex === anchor.seatIndex)}
        />
      ))}
      <Text position={[0, 2.2, -3.2]} fontSize={0.32} color="#f8e7a4" anchorX="center">
        POOKIE POKER
      </Text>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.75} maxPolarAngle={1.25} autoRotate autoRotateSpeed={0.25} />
    </Canvas>
  )
}

function RooftopSceneFallback({ seats }: { seats: SeatVisualState[] }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(14,165,233,0.32),transparent_24%),linear-gradient(180deg,#17133b_0%,#070815_64%,#020617_100%)]">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.2),transparent_35%)]" />
      <div className="absolute left-1/2 top-1/2 h-52 w-80 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-amber-200/50 bg-emerald-950/80 shadow-[0_0_70px_rgba(34,211,238,0.22)]" />
      {POKIE_POKER_SEAT_ANCHORS.map((anchor) => {
        const seat = seats.find((candidate) => candidate.seatIndex === anchor.seatIndex)
        return (
          <div
            key={anchor.seatIndex}
            className={[
              'absolute grid h-12 w-12 place-items-center rounded-full border text-xs font-black',
              seat?.activeTurn ? 'border-amber-200 bg-amber-300 text-zinc-950' : seat?.occupied ? 'border-cyan-200/60 bg-cyan-950 text-cyan-100' : 'border-white/15 bg-white/10 text-zinc-400',
            ].join(' ')}
            style={{
              left: `${50 + anchor.position[0] * 10}%`,
              top: `${48 + anchor.position[2] * 12}%`,
            }}
          >
            {seat?.occupied ? seat.displayName?.slice(0, 2).toUpperCase() : anchor.seatIndex + 1}
          </div>
        )
      })}
    </div>
  )
}

function RooftopEnvironment() {
  const skyline = useMemo(() => Array.from({ length: 30 }, (_, index) => ({
    x: -9 + index * 0.62,
    h: 0.8 + ((index * 37) % 9) * 0.28,
    z: -6.5 - ((index * 13) % 5) * 0.18,
  })), [])

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[7.5, 96]} />
        <meshStandardMaterial color="#1f2232" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[4.2, 7.4, 96]} />
        <meshStandardMaterial color="#34364a" roughness={0.7} />
      </mesh>
      {skyline.map((building, index) => (
        <group key={index} position={[building.x, building.h / 2 - 0.04, building.z]}>
          <mesh>
            <boxGeometry args={[0.42, building.h, 0.35]} />
            <meshStandardMaterial color={index % 3 === 0 ? '#17203a' : '#111827'} emissive={index % 5 === 0 ? '#0ea5e9' : '#000000'} emissiveIntensity={0.35} />
          </mesh>
          {index % 2 === 0 ? (
            <mesh position={[0, 0.15, 0.181]}>
              <planeGeometry args={[0.18, Math.max(0.24, building.h * 0.42)]} />
              <meshBasicMaterial color="#bae6fd" transparent opacity={0.28} />
            </mesh>
          ) : null}
        </group>
      ))}
      {[-5.4, -3.8, 4.4, 5.6].map((x, index) => (
        <Palm key={index} position={[x, 0, index % 2 ? -3.8 : 3.6]} />
      ))}
    </group>
  )
}

function Palm({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 1.8, 8]} />
        <meshStandardMaterial color="#4b3528" />
      </mesh>
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={index} position={[0, 1.85, 0]} rotation={[0.45, (index / 7) * Math.PI * 2, 0.25]}>
          <coneGeometry args={[0.12, 1.05, 4]} />
          <meshStandardMaterial color="#134e4a" emissive="#0f766e" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function PokerTableModel() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]} scale={[1.55, 0.16, 1]}>
        <cylinderGeometry args={[1.65, 1.65, 0.34, 80]} />
        <meshStandardMaterial color="#05070c" roughness={0.22} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1, 1]}>
        <circleGeometry args={[1.42, 80]} />
        <meshStandardMaterial color="#064e3b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1, 1]}>
        <ringGeometry args={[1.42, 1.52, 80]} />
        <meshStandardMaterial color="#f6d36d" emissive="#f59e0b" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

function SeatAvatar({ position, state }: { position: readonly [number, number, number]; state?: SeatVisualState }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.5 + position[0]) * 0.025
  })

  const occupied = state?.occupied
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <mesh castShadow position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.15, 24]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>
      <mesh castShadow position={[0, -0.2, 0]}>
        <capsuleGeometry args={[0.19, 0.42, 8, 16]} />
        <meshStandardMaterial color={occupied ? '#c084fc' : '#334155'} emissive={state?.activeTurn ? '#facc15' : '#000000'} emissiveIntensity={state?.activeTurn ? 0.45 : 0} />
      </mesh>
      <mesh position={[0, -0.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 32]} />
        <meshStandardMaterial color={state?.winner ? '#facc15' : state?.activeTurn ? '#22d3ee' : '#1e293b'} emissive={state?.winner ? '#facc15' : state?.activeTurn ? '#22d3ee' : '#000000'} emissiveIntensity={0.65} transparent opacity={0.9} />
      </mesh>
      {state?.lastAction ? (
        <Text position={[0, 0.52, 0]} fontSize={0.16} color="#ffffff" anchorX="center">
          {state.lastAction.toUpperCase()}
        </Text>
      ) : null}
    </group>
  )
}

function PotGlow() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.08
      ref.current.scale.set(scale, scale, scale)
    }
  })
  return (
    <mesh ref={ref} position={[0, 0.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.46, 48]} />
      <meshBasicMaterial color="#facc15" transparent opacity={0.26} />
    </mesh>
  )
}

function ChipStacks() {
  return (
    <group position={[0, 0.94, 0]}>
      {[
        [-0.18, 0, '#facc15'],
        [0, 0.05, '#38bdf8'],
        [0.18, 0.02, '#f472b6'],
      ].map(([x, y, color], index) => (
        <group key={index} position={[Number(x), Number(y), 0]}>
          {Array.from({ length: 4 }).map((_, chipIndex) => (
            <mesh key={chipIndex} position={[0, chipIndex * 0.035, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.028, 24]} />
              <meshStandardMaterial color={String(color)} roughness={0.35} metalness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
