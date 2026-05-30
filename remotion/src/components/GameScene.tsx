import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Environment } from '@react-three/drei';
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { Arena, CloudCluster, PLATFORM_RADIUS, PLATFORM_HEIGHT } from './Arena';
import { PookieBall } from './PookieBall';
import { Snow } from './Snow';
import { Blimp } from './Blimp';
import {
  type GameplayScript,
  evaluatePosition,
  evaluateCamera,
} from '../lib/gameplay-scripts';

/**
 * GameScene — Full 3D scene rendered via @remotion/three ThreeCanvas.
 *
 * Two rendering modes:
 *   1. SCRIPTED mode (pass `script` prop) — Uses keyframe-based choreography
 *      for realistic gameplay: charges, pushes, eliminations, falling off.
 *   2. LEGACY orbit mode (pass `players` prop) — Simple circular motion.
 *
 * Always renders: real POOKIE.glb models, granite-textured arena, HDRI sky,
 * snow, blimp, clouds, and proper lighting from SumoArenaScene.
 */

export interface PlayerData {
  id: string;
  ballColor: string;
  phase: number;
  orbitRadius?: number;
  username?: string;
}

interface GameSceneProps {
  /** Legacy orbit-based players (used if `script` is not provided) */
  players?: PlayerData[];
  /** Scripted choreography — overrides players/cameraMode when provided */
  script?: GameplayScript;
  /** Time offset in seconds (for compositions that start the script mid-video) */
  timeOffset?: number;
  cameraMode?: 'orbit' | 'flythrough' | 'static' | 'chase';
  chaseTarget?: number;
  showBlimp?: boolean;
  showSnow?: boolean;
  showClouds?: boolean;
  orbitSpeed?: number;
}

export const GameScene: React.FC<GameSceneProps> = ({
  players = [],
  script,
  timeOffset = 0,
  cameraMode = 'orbit',
  chaseTarget = 0,
  showBlimp = true,
  showSnow = true,
  showClouds = true,
  orbitSpeed = 0.08,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps - timeOffset;

  // ══════════════════════════════════════════════════════════════
  // SCRIPTED MODE — keyframe choreography
  // ══════════════════════════════════════════════════════════════
  const isScripted = !!script;

  // Camera
  let camX: number, camY: number, camZ: number;
  let lookX = 0, lookY = PLATFORM_HEIGHT / 2 + 1, lookZ = 0;

  if (isScripted) {
    const cam = evaluateCamera(script.camera, time);
    [camX, camY, camZ] = cam.position;
    [lookX, lookY, lookZ] = cam.lookAt;
  } else {
    const cameraRadius = 35;
    if (cameraMode === 'orbit') {
      const angle = time * orbitSpeed * Math.PI * 2;
      camX = Math.cos(angle) * cameraRadius;
      camZ = Math.sin(angle) * cameraRadius;
      camY = 14 + Math.sin(time * 0.3) * 3;
    } else if (cameraMode === 'flythrough') {
      const progress = Math.min(time / 4, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      camX = THREE.MathUtils.lerp(60, 25, ease);
      camY = THREE.MathUtils.lerp(50, 8, ease);
      camZ = THREE.MathUtils.lerp(60, 25, ease);
      if (time > 4) {
        const postAngle = (time - 4) * 0.12;
        camX = Math.cos(postAngle) * 28;
        camZ = Math.sin(postAngle) * 28;
        camY = 10 + Math.sin(time * 0.2) * 2;
      }
    } else if (cameraMode === 'chase') {
      const target = players[chaseTarget] || players[0];
      if (target) {
        const orbitR = target.orbitRadius ?? PLATFORM_RADIUS * 0.4;
        const pAngle = time * 1.2 + target.phase;
        const px = Math.cos(pAngle) * orbitR;
        const pz = Math.sin(pAngle) * orbitR;
        const py = PLATFORM_HEIGHT / 2 + 1.2 + Math.sin(time * 3 + target.phase) * 0.3;
        const dir = new THREE.Vector3(px, 0, pz).normalize();
        camX = px + dir.x * 8.5;
        camZ = pz + dir.z * 8.5;
        camY = py + 4.2;
        lookX = px; lookY = py + 0.65; lookZ = pz;
      } else {
        camX = 30; camY = 15; camZ = 30;
      }
    } else {
      camX = 30; camY = 20; camZ = 30;
    }
  }

  // Players
  const resolvedPlayers = useMemo(() => {
    if (isScripted) {
      return script.players.map((sp) => {
        const { position, visible } = evaluatePosition(sp.keyframes, time);
        return {
          id: sp.id,
          ballColor: sp.ballColor,
          position,
          visible,
        };
      });
    }
    // Legacy orbit mode
    return players.map((p) => {
      const orbitR = p.orbitRadius ?? PLATFORM_RADIUS * 0.4;
      const angle = time * 1.2 + p.phase;
      const x = Math.cos(angle) * orbitR;
      const z = Math.sin(angle) * orbitR;
      const y = PLATFORM_HEIGHT / 2 + 1.2 + Math.sin(time * 3 + p.phase) * 0.3;
      return { id: p.id, ballColor: p.ballColor, position: [x, y, z] as [number, number, number], visible: true };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, players, script]);

  // Clouds
  const clouds = useMemo(() => {
    if (!showClouds) return [];
    return [
      { pos: [25, 18, -15] as [number, number, number], scale: 1.8 },
      { pos: [-30, 22, 10] as [number, number, number], scale: 2.2 },
      { pos: [10, 20, 30] as [number, number, number], scale: 1.5 },
      { pos: [-20, 16, -25] as [number, number, number], scale: 1.3 },
      { pos: [35, 24, 20] as [number, number, number], scale: 2.0 },
    ];
  }, [showClouds]);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{
        position: [camX, camY, camZ],
        fov: 50,
      }}
    >
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <Environment files={staticFile('HDRI/passendorf_snow_1k.hdr')} background />

      <Arena />

      {resolvedPlayers
        .filter((p) => p.visible)
        .map((p) => (
          <PookieBall
            key={p.id}
            position={p.position}
            ballColor={p.ballColor}
          />
        ))}

      {showBlimp && <Blimp />}
      {showSnow && <Snow count={300} radius={50} speed={0.25} />}
      {clouds.map((c, i) => (
        <CloudCluster key={i} position={c.pos} scale={c.scale} />
      ))}

      <fog attach="fog" args={['#020617', 60, 120]} />
    </ThreeCanvas>
  );
};
