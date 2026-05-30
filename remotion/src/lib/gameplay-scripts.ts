/**
 * gameplay-scripts.ts — Scripted gameplay choreography for Remotion videos.
 *
 * Instead of dumb circular orbiting, these are keyframe-based sequences
 * that simulate REAL gameplay: charges, pushes, bounces, eliminations,
 * and players falling off the arena.
 */

import { PLATFORM_HEIGHT, PLATFORM_RADIUS } from '../components/Arena';

export interface PlayerKeyframe {
  /** Time in seconds this keyframe starts */
  time: number;
  /** Position [x, y, z] */
  position: [number, number, number];
  /** Whether the player is visible (false = eliminated / fell off) */
  visible?: boolean;
}

export interface ScriptedPlayer {
  id: string;
  ballColor: string;
  username: string;
  keyframes: PlayerKeyframe[];
}

export interface CameraKeyframe {
  time: number;
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface GameplayScript {
  players: ScriptedPlayer[];
  camera: CameraKeyframe[];
  duration: number; // total seconds
}

const Y_ON_PLATFORM = PLATFORM_HEIGHT / 2 + 1.2;
const Y_FALLING = -15;
const R = PLATFORM_RADIUS;

/** Lerp between two 3D positions */
function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * ct,
    a[1] + (b[1] - a[1]) * ct,
    a[2] + (b[2] - a[2]) * ct,
  ];
}

/** Ease out cubic */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

/** Ease in quad (for falling — available for future use) */
export function easeIn(t: number): number {
  const ct = Math.max(0, Math.min(1, t));
  return ct * ct;
}

/** Evaluate a player's position at a given time from their keyframes */
export function evaluatePosition(
  keyframes: PlayerKeyframe[],
  time: number,
): { position: [number, number, number]; visible: boolean } {
  if (keyframes.length === 0) return { position: [0, Y_ON_PLATFORM, 0], visible: true };

  // Before first keyframe
  if (time <= keyframes[0].time) {
    return { position: keyframes[0].position, visible: keyframes[0].visible !== false };
  }

  // After last keyframe
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) {
    return { position: last.position, visible: last.visible !== false };
  }

  // Find surrounding keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf = keyframes[i];
    const next = keyframes[i + 1];
    if (time >= kf.time && time < next.time) {
      const t = (time - kf.time) / (next.time - kf.time);
      const easedT = easeOut(t);
      const pos = lerp3(kf.position, next.position, easedT);
      const vis = kf.visible !== false; // visible during transition from this kf
      return { position: pos, visible: vis };
    }
  }

  return { position: last.position, visible: last.visible !== false };
}

/** Evaluate camera position/lookAt at a given time */
export function evaluateCamera(
  keyframes: CameraKeyframe[],
  time: number,
): { position: [number, number, number]; lookAt: [number, number, number] } {
  if (keyframes.length === 0) return { position: [30, 15, 30], lookAt: [0, 2, 0] };

  if (time <= keyframes[0].time) return keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf = keyframes[i];
    const next = keyframes[i + 1];
    if (time >= kf.time && time < next.time) {
      const t = (time - kf.time) / (next.time - kf.time);
      const easedT = easeOut(t);
      return {
        position: lerp3(kf.position, next.position, easedT),
        lookAt: lerp3(kf.lookAt, next.lookAt, easedT),
      };
    }
  }

  return last;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPTED SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GAMEPLAY FIGHT SEQUENCE — ~18 seconds of actual sumo combat.
 *
 * 4 players spawn → move around → Player 1 charges Player 3 → Player 3 launched
 * to edge and falls → Player 2 charges Player 4 → Player 4 barely survives on
 * edge → Player 1 finishes Player 4 → Player 1 vs Player 2 final showdown →
 * Player 1 wins.
 */
export const FIGHT_SEQUENCE: GameplayScript = {
  duration: 18,
  players: [
    {
      id: 'hero',
      ballColor: '#ff66cc',
      username: 'YOU',
      keyframes: [
        // Spawn
        { time: 0, position: [0, Y_ON_PLATFORM, R * 0.4] },
        // Idle aggressive positioning
        { time: 1.5, position: [2, Y_ON_PLATFORM, R * 0.3] },
        // Charge toward player 3
        { time: 3.0, position: [3, Y_ON_PLATFORM, R * 0.15] },
        { time: 3.5, position: [-6, Y_ON_PLATFORM, -3] },
        // Impact! bounce back slightly
        { time: 3.8, position: [-4, Y_ON_PLATFORM, -1] },
        // Reposition
        { time: 5.0, position: [0, Y_ON_PLATFORM, 2] },
        // Move to finish player 4 at the edge
        { time: 8.0, position: [5, Y_ON_PLATFORM, -5] },
        { time: 9.0, position: [R * 0.7, Y_ON_PLATFORM, -R * 0.3] },
        { time: 9.5, position: [R * 0.8, Y_ON_PLATFORM, -R * 0.35] },
        // Bounce back from the push
        { time: 10.0, position: [R * 0.5, Y_ON_PLATFORM, -R * 0.2] },
        // Final showdown — circle player 2
        { time: 11.5, position: [3, Y_ON_PLATFORM, 4] },
        { time: 13.0, position: [-3, Y_ON_PLATFORM, 5] },
        { time: 14.0, position: [-5, Y_ON_PLATFORM, 3] },
        // Charge!
        { time: 15.0, position: [-2, Y_ON_PLATFORM, -1] },
        { time: 15.5, position: [4, Y_ON_PLATFORM, -4] },
        // Victory position (center)
        { time: 16.5, position: [0, Y_ON_PLATFORM, 0] },
        { time: 18, position: [0, Y_ON_PLATFORM + 0.5, 0] },
      ],
    },
    {
      id: 'rival',
      ballColor: '#00e5ff',
      username: 'xBlueIce',
      keyframes: [
        // Spawn opposite side
        { time: 0, position: [0, Y_ON_PLATFORM, -R * 0.4] },
        { time: 1.5, position: [-3, Y_ON_PLATFORM, -R * 0.3] },
        // Move to fight player 4
        { time: 3.5, position: [-5, Y_ON_PLATFORM, -5] },
        { time: 5.0, position: [-R * 0.4, Y_ON_PLATFORM, -R * 0.2] },
        // Charge player 4
        { time: 6.0, position: [-R * 0.3, Y_ON_PLATFORM, R * 0.1] },
        { time: 6.5, position: [R * 0.3, Y_ON_PLATFORM, R * 0.3] },
        // Recoil
        { time: 7.0, position: [R * 0.1, Y_ON_PLATFORM, R * 0.15] },
        // Reposition for final fight
        { time: 9.0, position: [-4, Y_ON_PLATFORM, -3] },
        { time: 11.0, position: [-2, Y_ON_PLATFORM, -4] },
        // Circle the hero
        { time: 13.0, position: [4, Y_ON_PLATFORM, -3] },
        { time: 14.0, position: [5, Y_ON_PLATFORM, -1] },
        // Gets pushed! Launched toward edge
        { time: 15.5, position: [R * 0.6, Y_ON_PLATFORM, -R * 0.5] },
        { time: 16.0, position: [R * 0.9, Y_ON_PLATFORM - 0.5, -R * 0.8] },
        // Falls off!
        { time: 16.8, position: [R * 1.1, Y_FALLING, -R * 1.0], visible: false },
        { time: 18, position: [R * 1.2, Y_FALLING - 10, -R * 1.1], visible: false },
      ],
    },
    {
      id: 'victim1',
      ballColor: '#ffab00',
      username: 'GoldRush99',
      keyframes: [
        // Spawn
        { time: 0, position: [-R * 0.35, Y_ON_PLATFORM, -R * 0.1] },
        { time: 1.5, position: [-R * 0.3, Y_ON_PLATFORM, -R * 0.15] },
        // Moving around
        { time: 2.5, position: [-7, Y_ON_PLATFORM, -2] },
        // Gets HIT by hero! Launched!
        { time: 3.5, position: [-8, Y_ON_PLATFORM, -4] },
        { time: 3.8, position: [-R * 0.7, Y_ON_PLATFORM + 1, -R * 0.5] },
        { time: 4.2, position: [-R * 0.95, Y_ON_PLATFORM, -R * 0.85] },
        // Flying off the edge
        { time: 4.8, position: [-R * 1.1, Y_ON_PLATFORM - 2, -R * 1.0] },
        { time: 5.5, position: [-R * 1.2, Y_FALLING, -R * 1.1], visible: false },
        { time: 18, position: [-R * 1.3, Y_FALLING - 20, -R * 1.2], visible: false },
      ],
    },
    {
      id: 'victim2',
      ballColor: '#76ff03',
      username: 'LimeTime',
      keyframes: [
        // Spawn
        { time: 0, position: [R * 0.35, Y_ON_PLATFORM, R * 0.1] },
        { time: 2.0, position: [R * 0.3, Y_ON_PLATFORM, R * 0.2] },
        { time: 4.0, position: [R * 0.2, Y_ON_PLATFORM, R * 0.3] },
        // Gets hit by rival — pushed to edge
        { time: 6.5, position: [R * 0.6, Y_ON_PLATFORM, R * 0.5] },
        { time: 7.0, position: [R * 0.85, Y_ON_PLATFORM, R * 0.6] },
        // Teetering on edge! survives barely
        { time: 7.5, position: [R * 0.9, Y_ON_PLATFORM - 0.3, R * 0.65] },
        { time: 8.0, position: [R * 0.82, Y_ON_PLATFORM, R * 0.55] },
        // Tries to escape back to center
        { time: 8.5, position: [R * 0.7, Y_ON_PLATFORM, R * 0.4] },
        // Hero arrives — FINAL PUSH
        { time: 9.5, position: [R * 0.8, Y_ON_PLATFORM, R * 0.4] },
        { time: 10.0, position: [R * 1.0, Y_ON_PLATFORM + 0.5, R * 0.7] },
        // Falls off!
        { time: 10.5, position: [R * 1.15, Y_ON_PLATFORM - 3, R * 0.9] },
        { time: 11.0, position: [R * 1.3, Y_FALLING, R * 1.0], visible: false },
        { time: 18, position: [R * 1.4, Y_FALLING - 20, R * 1.1], visible: false },
      ],
    },
  ],
  camera: [
    // Wide establishing shot
    { time: 0, position: [35, 18, 35], lookAt: [0, 2, 0] },
    // Zoom in as action starts
    { time: 2.5, position: [20, 12, 20], lookAt: [0, 2, 0] },
    // Track the first hit (hero vs victim1)
    { time: 3.0, position: [8, 6, 10], lookAt: [-5, 2, -2] },
    { time: 4.0, position: [-5, 8, 12], lookAt: [-R * 0.7, 2, -R * 0.5] },
    // Pull back to see the elimination
    { time: 5.0, position: [-15, 12, 15], lookAt: [-R * 0.5, 0, -R * 0.3] },
    // Pan to the rival vs victim2 fight
    { time: 5.5, position: [10, 10, -15], lookAt: [R * 0.3, 2, R * 0.2] },
    { time: 6.5, position: [15, 8, 5], lookAt: [R * 0.5, 2, R * 0.4] },
    // Watch victim2 teeter on edge
    { time: 7.5, position: [20, 6, 12], lookAt: [R * 0.85, 2, R * 0.6] },
    // Hero finishes victim2
    { time: 9.0, position: [18, 8, 8], lookAt: [R * 0.7, 2, R * 0.4] },
    { time: 10.0, position: [22, 10, 15], lookAt: [R * 0.9, 1, R * 0.6] },
    // Pull back for final showdown
    { time: 11.0, position: [25, 14, 25], lookAt: [0, 2, 0] },
    // Intense close-up for the final fight
    { time: 13.0, position: [12, 7, 12], lookAt: [0, 2, 0] },
    { time: 15.0, position: [-5, 5, 10], lookAt: [2, 2, -2] },
    // Watch rival get launched
    { time: 15.5, position: [10, 8, -5], lookAt: [R * 0.6, 2, -R * 0.4] },
    // Victory shot — pull back triumphant
    { time: 16.5, position: [0, 22, 30], lookAt: [0, 3, 0] },
    { time: 18, position: [0, 25, 35], lookAt: [0, 3, 0] },
  ],
};

/**
 * SHORT INTRO SEQUENCE — 5 seconds of atmosphere.
 * Players enter, take positions, tense standoff.
 */
export const INTRO_SEQUENCE: GameplayScript = {
  duration: 5,
  players: [
    {
      id: 'p1', ballColor: '#ff66cc', username: 'Player 1',
      keyframes: [
        { time: 0, position: [0, Y_ON_PLATFORM + 8, R * 0.4], visible: false },
        { time: 1.0, position: [0, Y_ON_PLATFORM + 4, R * 0.4] },
        { time: 1.8, position: [0, Y_ON_PLATFORM, R * 0.4] },
        { time: 5, position: [1, Y_ON_PLATFORM, R * 0.35] },
      ],
    },
    {
      id: 'p2', ballColor: '#00e5ff', username: 'Player 2',
      keyframes: [
        { time: 0, position: [0, Y_ON_PLATFORM + 8, -R * 0.4], visible: false },
        { time: 1.2, position: [0, Y_ON_PLATFORM + 4, -R * 0.4] },
        { time: 2.0, position: [0, Y_ON_PLATFORM, -R * 0.4] },
        { time: 5, position: [-1, Y_ON_PLATFORM, -R * 0.35] },
      ],
    },
    {
      id: 'p3', ballColor: '#ffab00', username: 'Player 3',
      keyframes: [
        { time: 0, position: [R * 0.4, Y_ON_PLATFORM + 8, 0], visible: false },
        { time: 1.4, position: [R * 0.4, Y_ON_PLATFORM + 4, 0] },
        { time: 2.2, position: [R * 0.4, Y_ON_PLATFORM, 0] },
        { time: 5, position: [R * 0.35, Y_ON_PLATFORM, 1] },
      ],
    },
    {
      id: 'p4', ballColor: '#76ff03', username: 'Player 4',
      keyframes: [
        { time: 0, position: [-R * 0.4, Y_ON_PLATFORM + 8, 0], visible: false },
        { time: 1.6, position: [-R * 0.4, Y_ON_PLATFORM + 4, 0] },
        { time: 2.4, position: [-R * 0.4, Y_ON_PLATFORM, 0] },
        { time: 5, position: [-R * 0.35, Y_ON_PLATFORM, -1] },
      ],
    },
  ],
  camera: [
    { time: 0, position: [0, 45, 50], lookAt: [0, 0, 0] },
    { time: 2.5, position: [25, 15, 25], lookAt: [0, 2, 0] },
    { time: 5, position: [20, 10, 20], lookAt: [0, 2, 0] },
  ],
};

/**
 * VICTORY CELEBRATION — 4 seconds.
 * Single player in center, camera rotates around triumphantly.
 */
export const VICTORY_SEQUENCE: GameplayScript = {
  duration: 4,
  players: [
    {
      id: 'winner', ballColor: '#ff66cc', username: 'WINNER',
      keyframes: [
        { time: 0, position: [0, Y_ON_PLATFORM, 0] },
        { time: 0.5, position: [0, Y_ON_PLATFORM + 1, 0] },
        { time: 1.0, position: [0, Y_ON_PLATFORM + 2, 0] },
        { time: 1.5, position: [0, Y_ON_PLATFORM + 1.5, 0] },
        { time: 2.0, position: [0, Y_ON_PLATFORM + 2.5, 0] },
        { time: 3.0, position: [0, Y_ON_PLATFORM + 2, 0] },
        { time: 4, position: [0, Y_ON_PLATFORM + 1.5, 0] },
      ],
    },
  ],
  camera: [
    { time: 0, position: [15, 8, 0], lookAt: [0, 4, 0] },
    { time: 1, position: [0, 8, 15], lookAt: [0, 4, 0] },
    { time: 2, position: [-15, 8, 0], lookAt: [0, 4, 0] },
    { time: 3, position: [0, 8, -15], lookAt: [0, 4, 0] },
    { time: 4, position: [12, 10, 12], lookAt: [0, 4, 0] },
  ],
};
