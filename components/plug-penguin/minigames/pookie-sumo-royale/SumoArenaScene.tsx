'use client';

import React, { Suspense, useMemo, useRef, useState, useEffect, useCallback, ForwardedRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture, Torus, Sphere, Box, Cylinder, Plane, Points, Point, Text, Capsule, useGLTF, KeyboardControls, Html } from '@react-three/drei';
import * as THREE from 'three'; // Import THREE for texture repeat
import { Howl } from 'howler'; // ADDED Howler import
import { FallingSnow } from '../../effects/falling-snow'; // Import FallingSnow
import { Physics, RigidBody, BallCollider, CylinderCollider, TrimeshCollider, CuboidCollider, useRapier } from '@react-three/rapier'; // Added Rapier imports & useRapier
import { useKeyboardControls } from '@react-three/drei'; // For keyboard controls
import io, { Socket } from 'socket.io-client'; // Added socket.io-client
import PushEffect from '../../effects/PushEffect'; // Import the new effect

// Preload the Pookie model
useGLTF.preload('/models/POOKIE.glb');
useGLTF.preload('/models/pookie_blimp.glb'); // Preload the Pookie Blimp model

// Keyboard control mapping - changed to enum
export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  push = 'push', // Added push control
}

// At the top of the file, ensure GameState is defined ONCE.
// If it's also defined around line 1024, that one needs to be removed.
export type GameState = 'WAITING' | 'STARTING_COUNTDOWN' | 'ACTIVE' | 'ROUND_OVER' | 'GAME_OVER';

export interface SumoArenaSceneProps {
  gameState: GameState; // This is the gameState passed from RoyaleGameScene
  onMatchComplete: () => void;
  socket: Socket | null;
  localUsername: string | null;
  lobbyId: string;
  isPractice: boolean; // Added isPractice prop
  playerWalletAddress: string; // Added to receive the wallet address of the local player
}

const platformRadius = 20;
const platformHeight = 4;
const Y_ELIMINATION_THRESHOLD = -10; // Players falling below this Y are out
const AOE_PUSH_RADIUS = 2; // Radius for AoE push - Reduced from 5 to 2
const AOE_PUSH_STRENGTH = 30; // Strength for AoE push

// Updated PlayerProps to include socket and initialPosition
interface PlayerProps {
  ballColor: string;
  socket: Socket | null; // Socket for sending updates
  isSpectatingOrEliminated: boolean; // To disable controls if player is out or game ended
  onFallenOff: () => void; // Callback when player falls off
  username: string; // Display name above the player
  initialPosition?: [number, number, number]; // New: For setting initial position
  initialYawAngle?: number; // New: For initial Y-axis rotation (facing direction)
  onPushAction?: (pusherPosition: THREE.Vector3, pusherRef: React.RefObject<any>) => void; // New callback
  platformHeightActual: number; // New: Pass platformHeight for accurate calculations
}

// Define LivePlayer interface for HUD
interface LivePlayer {
  id: string; // Socket ID or a unique player ID from the server
  username: string; // Username
  status: 'In' | 'Out'; // Player status
}

// Define RemotePlayerStateData interface for full player state from server
interface RemotePlayerStateData {
  id: string;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  username: string;
  status: 'In' | 'Out'; // Or other relevant statuses
  ballColor?: string;
  initialPosition?: { x: number; y: number; z: number };
  // Add other fields your server sends
}

// Expected payload from server for 'gameStatusUpdate'
interface GameStatusUpdatePayload {
  gameState: GameState; // Ensure this uses the correct GameState type
  players?: RemotePlayerStateData[]; // Make sure this matches what server sends
  winnerInfo?: { id: string; username: string; score: number }; // Ensure score is part of winnerInfo
  countdown?: number;
  message?: string;
  // any other fields
}

const JUMP_FORCE = 7; // Define jump force
const PUSH_IMPULSE_STRENGTH = 20; // Strength of the push
const PUSH_COOLDOWN_DURATION = 1500; // 1.5 seconds in milliseconds

// --- START: Constants for Client-Side Game Simulation ---
const TOTAL_PLAYERS = 8; // 1 local + 7 AI
const SIMULATED_WAITING_DURATION = 3000; // 3 seconds
const SIMULATED_COUNTDOWN_DURATION = 3; // 3 seconds
const AI_ELIMINATION_BASE_DURATION = 10000; // 10 seconds base for AI to be "eliminated"
const AI_ELIMINATION_RANDOM_FACTOR = 5000; // Plus up to 5 random seconds
// --- END: Constants for Client-Side Game Simulation ---

interface AIPlayerState {
  id: string;
  username: string;
  ballColor: string;
  initialPosition: [number, number, number];
  initialYawAngle: number;
  isEliminated: boolean; // For client-side tracking of AI status
  eliminationTimerId?: NodeJS.Timeout; // To clear elimination timer if needed
  ref?: React.RefObject<any>; // Made ref optional
}

// Player Component - Now uses React.forwardRef and React.memo
const Player = React.memo(React.forwardRef<any, PlayerProps>((
  { ballColor, socket, isSpectatingOrEliminated, onFallenOff, username, initialPosition, initialYawAngle, onPushAction, platformHeightActual }, 
  ref // This ref will be attached to the RigidBody
) => {
  const { scene: pookieScene } = useGLTF('/models/POOKIE.glb');
  const { camera } = useThree(); // Get camera for initial setup
  const initialCameraSetupDone = useRef(false); // Ensure one-time setup
  // Reverted to original simpler useState initialization
  const [smoothedCameraPosition] = useState(() => new THREE.Vector3(10, 10, 10));
  const [smoothedCameraTarget] = useState(() => new THREE.Vector3());
  const [isGrounded, setIsGrounded] = useState(false);
  const [canPush, setCanPush] = useState(true);
  const pushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pushAudioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for controlling playerStateUpdate emit rate
  const lastEmitTimeRef = useRef(0);
  const emitInterval = 100; // Emit 10 times per second (100ms interval)

  const [, getKeys] = useKeyboardControls<Controls>();
  const { rapier, world } = useRapier();
  // Removed { camera } from useThree() here as it's not used if the useEffect is removed

  const playerRadius = 0.7;
  const MAX_LINEAR_VELOCITY = 10;
  const pookieModelScale = 0.25;
  const pookieModelPositionOffset = new THREE.Vector3(0, -playerRadius * 0.65, 0);
  const hasFallenOff = useRef(false);
  const isLocalPlayerInstance = !!onPushAction; // Determine if this is the local player

  // REMOVED the useEffect for initial camera positioning based on initialYawAngle

  useEffect(() => { // Pre-load audio for responsiveness if possible
    if (isLocalPlayerInstance) { // Only local player needs to play their push sound
        pushAudioRef.current = new Audio('/sounds/ping.mp3');
        if (pushAudioRef.current) pushAudioRef.current.volume = 0.5; 
    }
  }, [isLocalPlayerInstance]);

  // Initial camera setup for the local player
  useEffect(() => {
    if (isLocalPlayerInstance && initialPosition && initialYawAngle !== undefined && !initialCameraSetupDone.current) {
      // Conditional logging for development
      if (process.env.NODE_ENV === 'development') {
      console.log('[Player LOCAL] Applying initial camera setup. Player Initial Pos:', initialPosition);
      }
      const playerWorldPos = new THREE.Vector3(...initialPosition);
      
      const arenaCenterTarget = new THREE.Vector3(0, platformHeightActual / 2 + 0.5, 0);
      const directionToCenter = new THREE.Vector3().subVectors(arenaCenterTarget, playerWorldPos).normalize();

      const cameraDistanceBehindPlayer = 7.0; 
      const cameraHeightAbovePlayerOrigin = 2.5;

      // 1. Get the vector pointing directly "behind" the player (away from arena center)
      const vectorPointingBehindPlayer = directionToCenter.clone().negate(); // Normalized

      // 2. Rotate this vector 90 degrees clockwise around the world Y-axis
      //    A clockwise rotation around Y by 90 degrees is -PI/2 radians.
      const rotationEuler = new THREE.Euler(0, -Math.PI / 2, 0);
      const rotatedOffsetDirection = vectorPointingBehindPlayer.clone().applyEuler(rotationEuler);

      // 3. Scale this rotated direction to get the final offset
      const finalCameraOffset = rotatedOffsetDirection.setLength(cameraDistanceBehindPlayer);

      // 4. Calculate camera position
      const cameraPosition = playerWorldPos.clone().add(finalCameraOffset);
      cameraPosition.y = playerWorldPos.y + cameraHeightAbovePlayerOrigin;
      
      camera.position.copy(cameraPosition);
      camera.lookAt(arenaCenterTarget);

      smoothedCameraPosition.copy(cameraPosition);
      smoothedCameraTarget.copy(arenaCenterTarget);

      initialCameraSetupDone.current = true;
      // Conditional logging for development
      if (process.env.NODE_ENV === 'development') {
      console.log('[Player LOCAL] Initial camera POS:', camera.position.toArray(), 'LOOKING AT:', arenaCenterTarget.toArray());
      console.log('[Player LOCAL] Player Pos:', playerWorldPos.toArray(), 'DirectionToCenter:', directionToCenter.toArray(), 'RotatedOffsetDirection:', rotatedOffsetDirection.toArray());
      }
    }
  }, [isLocalPlayerInstance, initialPosition, initialYawAngle, camera, smoothedCameraPosition, smoothedCameraTarget, platformHeightActual]);

  useFrame((state, delta) => {
    const isLocalPlayerInstance = !!onPushAction;
    const rigidBody = (ref && typeof ref !== 'function') ? ref.current : null;

    if (!onPushAction && !rigidBody) { // AI player and its own rigidBody ref is null
      // Conditional logging for development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Player AI ID: ${initialPosition ? initialPosition.join(',') : 'N/A'}] CRITICAL: AI's own rigidBody ref is NULL in its useFrame.`);
      }
    }

    if (!rigidBody) {
      // Conditional logging for development
      if (isLocalPlayerInstance && process.env.NODE_ENV === 'development') console.log(`[Player LOCAL] useFrame: rigidBody is NULL.`);
        return;
    }

    // Conditional logging for development
    if (isLocalPlayerInstance && process.env.NODE_ENV === 'development') {
      console.log(`[Player ${isLocalPlayerInstance ? 'LOCAL' : 'AI/Remote'}] useFrame TICK. isSpectatingOrEliminated: ${isSpectatingOrEliminated}`);
    }
    
    // Ground Check (only for local player with socket that can jump)
    if (socket) {
      const playerPosition = rigidBody.translation();
      const rayOrigin = { x: playerPosition.x, y: playerPosition.y - playerRadius - 0.1, z: playerPosition.z };
      const rayDirection = { x: 0, y: -1, z: 0 };
      const ray = new rapier.Ray(rayOrigin, rayDirection);
      const maxDistance = 0.2; 
      const hit = world.castRay(ray, maxDistance, true, undefined, undefined, rigidBody, undefined);
      setIsGrounded(hit ? true : false);
    }

    if (!hasFallenOff.current) {
        const currentPosition = rigidBody.translation();
        if (currentPosition.y < Y_ELIMINATION_THRESHOLD) {
          hasFallenOff.current = true;
            onFallenOff();
        }
    }

    // Player controls/movement and state updates
    if (socket && !isSpectatingOrEliminated && !hasFallenOff.current) {
        const { forward, back, left, right, jump, push } = getKeys();
    const impulse = { x: 0, y: 0, z: 0 };
    const torque = { x: 0, y: 0, z: 0 };
        const currentVel = rigidBody.linvel();

        const forwardImpulseStrength = 10 * delta; // Adjusted from 9 * delta for responsiveness
        const strafeImpulseStrength = 7 * delta;  // Adjusted from 6 * delta for responsiveness
        const torqueStrength = 2.75 * delta; // Adjusted from 2.5 * delta for responsiveness

        // Get camera direction (projected onto XZ plane)
        const cameraDirection = new THREE.Vector3();
        state.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Project onto XZ plane
        cameraDirection.normalize();

        // Calculate right vector (90 degrees to camera direction on XZ plane)
        const cameraRight = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x);

        let appliedImpulse = false;

        if (forward) {
            const forwardImpulseVec = cameraDirection.clone().multiplyScalar(forwardImpulseStrength);
            if (new THREE.Vector3(currentVel.x, 0, currentVel.z).dot(cameraDirection) < MAX_LINEAR_VELOCITY) {
                impulse.x += forwardImpulseVec.x;
                impulse.z += forwardImpulseVec.z;
                // Torque to roll forward relative to camera
                torque.x += cameraRight.x * torqueStrength; 
                torque.z += cameraRight.z * torqueStrength;
                appliedImpulse = true;
            }
        }
        if (back) {
            const backImpulseVec = cameraDirection.clone().multiplyScalar(-forwardImpulseStrength); // Use forwardImpulseStrength
            if (new THREE.Vector3(currentVel.x, 0, currentVel.z).dot(cameraDirection) > -MAX_LINEAR_VELOCITY) {
                impulse.x += backImpulseVec.x;
                impulse.z += backImpulseVec.z;
                // Torque to roll backward relative to camera
                torque.x -= cameraRight.x * torqueStrength;
                torque.z -= cameraRight.z * torqueStrength;
                appliedImpulse = true;
            }
        }
        if (left) {
            const leftImpulseVec = cameraRight.clone().multiplyScalar(-strafeImpulseStrength); // Use strafeImpulseStrength
            if (new THREE.Vector3(currentVel.x, 0, currentVel.z).dot(cameraRight) > -MAX_LINEAR_VELOCITY) {
                impulse.x += leftImpulseVec.x;
                impulse.z += leftImpulseVec.z;
                // Torque for strafing left
                torque.x -= cameraDirection.x * torqueStrength;
                torque.z -= cameraDirection.z * torqueStrength;
                appliedImpulse = true;
            }
        }
        if (right) {
            const rightImpulseVec = cameraRight.clone().multiplyScalar(strafeImpulseStrength); // Use strafeImpulseStrength
            if (new THREE.Vector3(currentVel.x, 0, currentVel.z).dot(cameraRight) < MAX_LINEAR_VELOCITY) {
                impulse.x += rightImpulseVec.x;
                impulse.z += rightImpulseVec.z;
                // Torque for strafing right
                torque.x += cameraDirection.x * torqueStrength;
                torque.z += cameraDirection.z * torqueStrength;
                appliedImpulse = true;
            }
    }

        if (jump && isGrounded) {
            impulse.y += JUMP_FORCE;
            setIsGrounded(false);
            appliedImpulse = true; // Also an impulse
        }

        if (push && canPush) {
            const playerPositionVec = rigidBody.translation();
            if (onPushAction) {
                onPushAction(new THREE.Vector3(playerPositionVec.x, playerPositionVec.y, playerPositionVec.z), ref as React.RefObject<any>);
                if (pushAudioRef.current) {
                    pushAudioRef.current.currentTime = 0;
                    pushAudioRef.current.play().catch(error => console.warn("Error playing push sound:", error));
                }
            }
            setCanPush(false);
            if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
            pushTimeoutRef.current = setTimeout(() => {
                setCanPush(true);
            }, PUSH_COOLDOWN_DURATION);
        }

        // Apply impulses only if there was movement or jump input
        // This check might need refinement if we want continuous physics updates for other reasons.
        if (appliedImpulse) { 
        rigidBody.applyImpulse(impulse, true);
        rigidBody.applyTorqueImpulse(torque, true);
        }
        
        // Emit player state at a controlled interval
        const now = performance.now();
        if (now - lastEmitTimeRef.current > emitInterval) {
        const currentPos = rigidBody.translation(); 
        const currentRot = rigidBody.rotation(); 
      socket.emit('playerStateUpdate', {
            position: [currentPos.x, currentPos.y, currentPos.z],
            rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
        });
          lastEmitTimeRef.current = now;
        }
    }

    // Camera follow logic - TEMP OVERRIDE still in place for testing basic follow
    if (onPushAction) { 
      // if (isLocalPlayerInstance) console.log(`[Player LOCAL] Camera logic ACTIVATED. isSpectatingOrEliminated was: ${isSpectatingOrEliminated}`);
      
      const playerPosition = rigidBody.translation(); 
      
      // --- TEMPORARY SIMPLIFIED CAMERA ---
      const simpleOffset = new THREE.Vector3(10, 5, 0); // User preferred this angle for viewing
      const cameraPosition = new THREE.Vector3(
        playerPosition.x + simpleOffset.x,
        playerPosition.y + simpleOffset.y,
        playerPosition.z + simpleOffset.z
      );
      const lookAtPosition = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);

      // Directly set camera, bypassing smoothing for this test
      state.camera.position.copy(cameraPosition);
      state.camera.lookAt(lookAtPosition);
      // --- END TEMPORARY SIMPLIFIED CAMERA ---

      /* // Original more complex camera logic - commented out again
      const playerRotation = rigidBody.rotation();
      const desiredOffset = new THREE.Vector3(0, 2.5, -7); 
      const threePlayerRotation = new THREE.Quaternion(playerRotation.x, playerRotation.y, playerRotation.z, playerRotation.w);
      const cameraOffset = desiredOffset.clone().applyQuaternion(threePlayerRotation);
      const idealCameraPosition = new THREE.Vector3(
        playerPosition.x + cameraOffset.x,
        playerPosition.y + cameraOffset.y,
        playerPosition.z + cameraOffset.z
      );
      const idealLookAt = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.5, playerPosition.z);

      smoothedCameraPosition.lerp(idealCameraPosition, 5 * delta);
      smoothedCameraTarget.lerp(idealLookAt, 5 * delta);

    state.camera.position.copy(smoothedCameraPosition);
    state.camera.lookAt(smoothedCameraTarget);
      */
    } else {
      if (isLocalPlayerInstance) {
          console.log(`[Player LOCAL] Camera logic SKIPPED. onPushAction: ${!!onPushAction}, isSpectatingOrEliminated (ignored by temp override): ${isSpectatingOrEliminated}`);
      }
    }
  }); // End of useFrame

  useEffect(() => {
    // Clear push cooldown timer on unmount
    return () => {
        if (pushTimeoutRef.current) {
            clearTimeout(pushTimeoutRef.current);
        }
    };
  }, []); 

  useEffect(() => {
    if (!isSpectatingOrEliminated) {
        hasFallenOff.current = false;
    }
  }, [isSpectatingOrEliminated]);

  const clonedPookieScene = useMemo(() => {
    const clone = pookieScene.clone();
    // Removed: clone.rotation.y += Math.PI / 2; 
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
    return clone;
  }, [pookieScene]);

  const emissiveColor = useMemo(() => new THREE.Color(ballColor).multiplyScalar(0.5), [ballColor]);

  if (!onPushAction && process.env.NODE_ENV === 'development') { // This is an AI player instance, log only in dev
    const calculatedType = (isSpectatingOrEliminated && hasFallenOff.current) ? "fixed" : "dynamic";
    console.log(`[Player AI ID: ${initialPosition ? initialPosition.join(',') : 'DEBUG_NO_INITIAL_POS'}] PROPS: isSpectatingOrEliminated=${isSpectatingOrEliminated}, hasFallenOff=${hasFallenOff.current}. RB Type CALC: ${calculatedType}`);
  }

  return (
    <RigidBody
      ref={ref} 
      colliders={false} 
      position={initialPosition || [0, platformHeight + 2, 0]}
      rotation={initialYawAngle !== undefined ? [0, initialYawAngle, 0] : [0, 0, 0]}
      mass={1.5} 
      restitution={0.5} 
      friction={0.7}
      linearDamping={0.2}
      angularDamping={0.3}
      canSleep={false}
      name={socket ? "player-sumo-ball-local" : "player-sumo-ball-ai"}
      type={isSpectatingOrEliminated && hasFallenOff.current ? "fixed" : "dynamic"}
    >
      <BallCollider args={[playerRadius]} />
      
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}> 
        <sphereGeometry args={[playerRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
            color="#e0f0ff" 
            roughness={0.1}
            metalness={0.05}
            transparent={true}
            opacity={0.25} 
            clearcoat={0.95}
            clearcoatRoughness={0.05}
            transmission={0.95} 
            thickness={0.1}
            ior={1.5}
            envMapIntensity={0.7}
            side={THREE.DoubleSide}
        />
      </mesh>
      <mesh castShadow receiveShadow rotation={[0, 0, -Math.PI / 2]}> 
        <sphereGeometry args={[playerRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
            color={ballColor} 
            roughness={0.2}
            metalness={0.3}
            transparent={true}
            opacity={0.75} 
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            emissive={emissiveColor} 
            emissiveIntensity={0.4} 
            side={THREE.DoubleSide}
        />
      </mesh>

      <primitive 
        object={clonedPookieScene} 
        scale={pookieModelScale} 
        position={pookieModelPositionOffset}
        rotation={[0, Math.PI / 2, 0]} // Apply 90-degree left turn here
      />
    </RigidBody>
  );

})); 
Player.displayName = "Player"; // Ensure displayName is set after memo

// OtherPlayer Component - Represents remote players, kinematically controlled, now memoized
interface OtherPlayerProps {
  playerId: string;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number, number]; // Quaternion [x, y, z, w]
  ballColor: string;
  username: string;
  visible: boolean; // To control visibility if player is 'Out'
}

const OtherPlayer: React.FC<OtherPlayerProps> = React.memo(({
  playerId,
  targetPosition,
  targetRotation,
  ballColor,
  username,
  visible,
}) => {
  const rigidBodyRef = useRef<any>();
  const { scene: pookieScene } = useGLTF('/models/POOKIE.glb');

  const playerRadius = 0.7;
  const pookieModelScale = 0.25;
  const pookieModelPositionOffset = new THREE.Vector3(0, -playerRadius * 0.65, 0); // Lowered from -playerRadius * 0.5

  const clonedPookieScene = useMemo(() => {
    const clone = pookieScene.clone();
    // Removed: clone.rotation.y += Math.PI / 2;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
    return clone;
  }, [pookieScene]);

  const emissiveColor = useMemo(() => new THREE.Color(ballColor).multiplyScalar(0.5), [ballColor]);

  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !visible) return;

    const currentPositionVec = rigidBodyRef.current.translation();
    const targetPositionVec = new THREE.Vector3(...targetPosition);
    const interpolatedPosition = new THREE.Vector3().lerpVectors(
      currentPositionVec,
      targetPositionVec,
      15 * delta // interpolation factor, adjust for smoothness
    );
    rigidBodyRef.current.setNextKinematicTranslation(interpolatedPosition);

    const currentRotationQuat = rigidBodyRef.current.rotation(); // RapierQuaternion {x,y,z,w}
    const targetRotationQuat = new THREE.Quaternion(...targetRotation);
    // Ensure currentRotationQuat is a THREE.Quaternion for slerp
    const threeCurrentRotation = new THREE.Quaternion(currentRotationQuat.x, currentRotationQuat.y, currentRotationQuat.z, currentRotationQuat.w);
    
    const interpolatedRotation = new THREE.Quaternion().slerpQuaternions(
      threeCurrentRotation,
      targetRotationQuat,
      15 * delta // interpolation factor
    );
    rigidBodyRef.current.setNextKinematicRotation(interpolatedRotation);
  });
  
  // Set initial position when component mounts or targetPosition changes significantly (first time)
  // This avoids a jump if the initial render is far from the first targetPosition
  useEffect(() => {
    if (rigidBodyRef.current && visible) {
      rigidBodyRef.current.setTranslation({ x: targetPosition[0], y: targetPosition[1], z: targetPosition[2] }, true);
      rigidBodyRef.current.setRotation({ x: targetRotation[0], y: targetRotation[1], z: targetRotation[2], w: targetRotation[3] }, true);
    }
  }, [visible]); // Re-run if visibility changes to set initial state when becoming visible


  if (!visible) return null;

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      // position={targetPosition} // Initial position set by useEffect or relies on first kinematic update
      mass={1.5} // Mass is still relevant for collision responses even if movement is kinematic
      restitution={0.5}
      friction={0.7}
      canSleep={false}
      name={`player-sumo-ball-remote-${playerId}`}
      type="kinematicPosition" // Key for server-driven movement
    >
      <BallCollider args={[playerRadius]} />
      {/* Visual Ball Shell (same as local Player) */}
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[playerRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
            color="#e0f0ff"
            roughness={0.1}
            metalness={0.05}
            transparent={true}
            opacity={0.25}
            clearcoat={0.95}
            clearcoatRoughness={0.05}
            transmission={0.95}
            thickness={0.1}
            ior={1.5}
            envMapIntensity={0.7}
            side={THREE.DoubleSide}
        />
      </mesh>
      <mesh castShadow receiveShadow rotation={[0, 0, -Math.PI / 2]}>
        <sphereGeometry args={[playerRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
            color={ballColor}
            roughness={0.2}
            metalness={0.3}
            transparent={true}
            opacity={0.75}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            emissive={emissiveColor}
            emissiveIntensity={0.4}
            side={THREE.DoubleSide}
        />
      </mesh>
      <primitive
        object={clonedPookieScene}
        scale={pookieModelScale}
        position={pookieModelPositionOffset}
        rotation={[0, Math.PI / 2, 0]} // Apply 90-degree left turn here
      />
      {/* Display Username above the player */}
      <Text
        position={[0, playerRadius + 0.8, 0]} // Position above the ball
        fontSize={0.35}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
        font="/fonts/Heavitas.ttf" // Ensure this font is available
      >
        {username}
      </Text>
    </RigidBody>
  );
});
OtherPlayer.displayName = "OtherPlayer"; // Add displayName for consistency

// Game HUD Component - Updated for spectator controls
interface GameHUDProps {
  players: LivePlayer[];
  onPlayerNameClick?: (playerId: string) => void;
  isSpectating?: boolean;
  spectatedPlayerId?: string | null; // To highlight the currently spectated player
  onSpectatePrevious?: () => void; // Callback for previous button
  onSpectateNext?: () => void; // Callback for next button
}

const GameHUD: React.FC<GameHUDProps> = ({ 
    players, 
    onPlayerNameClick, 
    isSpectating, 
    spectatedPlayerId, 
    onSpectatePrevious, 
    onSpectateNext 
}) => {
    const activePlayersCount = players.filter(p => p.status === 'In').length;
    const canCycleSpectatorButtons = isSpectating && activePlayersCount > 1 && onSpectatePrevious && onSpectateNext;

    const buttonStyle: React.CSSProperties = {
        padding: '5px 10px',
        fontSize: '0.8em',
        color: '#333',
        backgroundColor: '#FFFACD', // Lemon chiffon, softer yellow
        border: '1px solid #FFD700',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '0 5px',
        boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
    };

  return (
    <div style={{
            position: 'fixed', top: '70px', left: '15px', 
            backgroundColor: 'rgba(0,0,0,0.65)', padding: '10px', borderRadius: '10px', 
            color: 'white', fontFamily: 'Heavitas,Arial,sans-serif', minWidth: '220px', 
            zIndex: 100, pointerEvents: isSpectating ? 'auto' : 'none', 
            boxShadow: '0px 2px 10px rgba(0,0,0,0.5)'
        }}>
            <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.5)', paddingBottom: '8px', fontSize: '1em' }}>
                Players Alive
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 10px 0' }}>
                {players.length > 0 ? players.map(p => (
                    <li key={p.id} 
                        style={{
                            textDecoration: p.status === 'Out' ? 'line-through' : 'none',
                            opacity: p.status === 'Out' ? 0.6 : 1,
                            padding: '5px 0',
                            fontSize: '0.9em',
                            cursor: isSpectating && p.status === 'In' && onPlayerNameClick ? 'pointer' : 'default',
                            color: isSpectating && p.id === spectatedPlayerId ? '#FFD700' : 'white', // Highlight if spectated
                            fontWeight: isSpectating && p.id === spectatedPlayerId ? 'bold' : (p.status === 'In' ? 'normal' : 'normal'),
                        }} 
                        onClick={() => isSpectating && p.status === 'In' && onPlayerNameClick?.(p.id)}
                    >
                        {isSpectating && p.id === spectatedPlayerId ? `► ${p.username}` : p.username} - 
                        <span style={{ fontWeight: p.status === 'In' ? 'bold' : 'normal' }}>{p.status}</span>
          </li>
        )) : <li style={{ fontStyle: 'italic', opacity: 0.7 }}>Waiting for players...</li>}
      </ul>
            {canCycleSpectatorButtons && (
                <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'space-around' }}>
                    <button onClick={onSpectatePrevious} style={buttonStyle} title="Spectate Previous Player (Shift+P)">Prev</button>
                    <button onClick={onSpectateNext} style={buttonStyle} title="Spectate Next Player (Shift+N)">Next</button>
                </div>
            )}
    </div>
  );
};

// Fireworks Explosion Component
interface FireworksExplosionProps {
  initialPosition: THREE.Vector3;
  onComplete: () => void;
  numParticles?: number;
  color?: THREE.Color;
  size?: number;
  spread?: number;
  duration?: number; // in seconds
}

const FireworksExplosion: React.FC<FireworksExplosionProps> = ({
  initialPosition,
  onComplete,
  numParticles = 30,
  color = new THREE.Color('gold'),
  size = 0.2,
  spread = 5,
  duration = 1.5,
}) => {
  const particlesRef = useRef<THREE.Points>(null!);
  const attributeRef = useRef<THREE.BufferAttribute>(null!); // Ref for the buffer attribute

  const [particlesData, setParticlesData] = useState<Array<{ position: THREE.Vector3; velocity: THREE.Vector3; initialOffset: THREE.Vector3 }>>([]);
  const startTime = useRef(performance.now());

  const initialPositions = useMemo(() => {
    const pos = new Float32Array(numParticles * 3);
    // Particles start at the center of the explosion, their parent Points component is at initialPosition
    return pos;
  }, [numParticles]);

  useEffect(() => {
    const data = [];
    for (let i = 0; i < numParticles; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
      data.push({ position: new THREE.Vector3(0,0,0), velocity, initialOffset: new THREE.Vector3(0,0,0) });
    }
    setParticlesData(data);
  }, [numParticles, spread]);

  useFrame(() => {
    const elapsedTime = (performance.now() - startTime.current) / 1000;
    if (elapsedTime > duration) {
      onComplete();
      return;
    }

    if (attributeRef.current && particlesData.length > 0) {
      const positions = attributeRef.current.array as Float32Array;
      const progress = elapsedTime / duration;

      particlesData.forEach((p, i) => {
        positions[i * 3] = p.velocity.x * progress;
        positions[i * 3 + 1] = p.velocity.y * progress - 0.5 * 9.81 * progress * progress; 
        positions[i * 3 + 2] = p.velocity.z * progress;
      });
      attributeRef.current.needsUpdate = true;
    }
  });
  
  if (particlesData.length === 0) return null;

  return (
    <Points ref={particlesRef} position={initialPosition}>
      <bufferGeometry attach="geometry">
        <bufferAttribute 
            ref={attributeRef} // Attach ref here
            attach="attributes-position" 
            count={numParticles} 
            array={initialPositions} 
            itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={size} 
        color={color} 
        sizeAttenuation 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
      />
    </Points>
  );
};

// Blimp Component
const Blimp: React.FC = () => {
  const blimpRef = useRef<THREE.Group>(null!);
  const { scene: blimpModel } = useGLTF('/models/pookie_blimp.glb'); // Load the new blimp model

  const blimpPathRadius = platformRadius + 18; 
  const blimpAltitude = platformHeight + 5;   
  const blimpSpeed = 0.15; 
  // const bodyLength = 6; // Old procedural property
  // const bodyRadius = 1.5; // Old procedural property

  const [fireworks, setFireworks] = useState<Array<{ id: string; position: THREE.Vector3; color: THREE.Color }>>([]);
  const lastFireworkTime = useRef(0);

  useFrame(({ clock }) => {
    if (blimpRef.current) {
      const angle = -clock.elapsedTime * blimpSpeed; 
      blimpRef.current.position.x = Math.cos(angle) * blimpPathRadius;
      blimpRef.current.position.z = Math.sin(angle) * blimpPathRadius;
      blimpRef.current.position.y = blimpAltitude;
      blimpRef.current.rotation.y = -angle + Math.PI / 2; 

      if (clock.elapsedTime - lastFireworkTime.current > 30) { 
        lastFireworkTime.current = clock.elapsedTime;
        const fireworkId = `fw-${performance.now()}`;
        const colors = [new THREE.Color('gold'), new THREE.Color('red'), new THREE.Color('cyan'), new THREE.Color('lime'), new THREE.Color('magenta'), new THREE.Color('orange')];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        // Adjusted launch position for the new GLB model - assuming model origin is its center
        const launchPositionOffset = new THREE.Vector3(0, -1.5, 0); // Offset below the blimp's origin, adjust as needed
        const launchPosition = blimpRef.current.position.clone().add(launchPositionOffset); 
        // Conditional logging for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Blimp] Firing firework ${fireworkId} at`, launchPosition);
        }
        setFireworks(prev => [...prev, { id: fireworkId, position: launchPosition, color: randomColor }]);
      }
    }
  });

  const handleFireworkComplete = (id: string) => {
    setFireworks(prev => prev.filter(fw => fw.id !== id));
  };

  // const bodyColor = "#B0C4DE"; // Old procedural property
  // ... (remove other old procedural properties and geometry definitions)

  // Clone the model to allow for independent manipulation if necessary, and to ensure castShadow works on all meshes
  const clonedBlimpModel = useMemo(() => {
    const clone = blimpModel.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        // child.receiveShadow = true; // Optional: if blimp parts should receive shadows from other objects
      }
    });
    return clone;
  }, [blimpModel]);

  return (
    <group>
      <group ref={blimpRef} scale={4.5}> {/* Scale increased from 1.5 to 4.5 */}
        <primitive 
          object={clonedBlimpModel} 
          rotation={[0, Math.PI / 2, 0]} // Added 90-degree counter-clockwise rotation (around Y)
        />
        {/* Old procedural geometry removed */}
      </group>
      {fireworks.map(fw => (
        <FireworksExplosion 
          key={fw.id} 
          initialPosition={fw.position} 
          color={fw.color}
          onComplete={() => handleFireworkComplete(fw.id)} 
          spread={7} 
          duration={2} 
          size={0.25} 
        />
      ))}
    </group>
  );
};

// Cloud Component
interface CloudProps {
  initialPosition: THREE.Vector3;
  scale?: number;
}

const Cloud: React.FC<CloudProps> = ({ initialPosition, scale = 1 }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const driftSpeed = useMemo(() => (Math.random() * 0.2) + 0.05, []); // Random speed (0.05 to 0.25)
  const driftDirection = useMemo(() => new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), []);
  const bobbleSpeed = useMemo(() => Math.random() * 0.5 + 0.3, []);
  const bobbleAmount = useMemo(() => Math.random() * 0.3 + 0.2, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const newPos = groupRef.current.position.clone().add(driftDirection.clone().multiplyScalar(driftSpeed * delta * 5));
      groupRef.current.position.copy(newPos);

      const boundary = platformRadius + 25; 
      const respawnDistance = platformRadius + 24.9; // Slightly less than boundary to avoid flickering

      // Smoother wrap-around logic
      if (groupRef.current.position.x > boundary) {
        groupRef.current.position.x = -respawnDistance;
        // Keep current z: groupRef.current.position.z remains unchanged
      } else if (groupRef.current.position.x < -boundary) {
        groupRef.current.position.x = respawnDistance;
        // Keep current z: groupRef.current.position.z remains unchanged
      }

      if (groupRef.current.position.z > boundary) {
        groupRef.current.position.z = -respawnDistance;
        // Keep current x: groupRef.current.position.x remains unchanged
      } else if (groupRef.current.position.z < -boundary) {
        groupRef.current.position.z = respawnDistance;
        // Keep current x: groupRef.current.position.x remains unchanged
      }
      
      groupRef.current.position.y = initialPosition.y + Math.sin(state.clock.elapsedTime * bobbleSpeed + initialPosition.x) * bobbleAmount;
    }
  });

  // Clouds are composed of multiple spheres
  const puffColor = "#FFFFFF";
  const puffMaterial = <meshStandardMaterial color={puffColor} transparent opacity={0.85} roughness={0.9} flatShading={false} />;

  return (
    <group ref={groupRef} position={initialPosition} scale={scale}>
      <Sphere args={[1.5, 12, 8]} position={[0, 0, 0]}>{puffMaterial}</Sphere>
      <Sphere args={[1, 12, 8]} position={[1, -0.2, 0.5]}>{puffMaterial}</Sphere>
      <Sphere args={[0.8, 12, 8]} position={[-1, 0.1, -0.3]}>{puffMaterial}</Sphere>
      <Sphere args={[1.2, 12, 8]} position={[0.5, 0.3, -0.8]}>{puffMaterial}</Sphere>
      <Sphere args={[0.9, 12, 8]} position={[-0.5, -0.3, 0.7]}>{puffMaterial}</Sphere> {/* Added one more puff */}
    </group>
  );
};

const PaddedEdges: React.FC = () => {
  const tubeRadius = 0.75; // How thick the padding is
  const radialSegments = 16;
  const tubularSegments = 48;

  // For TrimeshCollider, we need vertices and indices
  const geometry = useMemo(() => {
    const geo = new THREE.TorusGeometry(platformRadius, tubeRadius, radialSegments, tubularSegments);
    geo.rotateX(Math.PI / 2); // Align with Rapier's coordinate system if needed
    geo.translate(0, platformHeight / 2, 0);
    return geo;
  }, [tubeRadius, radialSegments, tubularSegments]);

  const vertices = geometry.attributes.position.array as Float32Array;
  const indices = geometry.index!.array as Uint32Array;

  return (
    <RigidBody type="fixed" colliders={false} position={[0,0,0]} name="padded-edges">
      <TrimeshCollider args={[vertices, indices]} restitution={0.5} friction={0.5} />
      <Torus
        args={[platformRadius, tubeRadius, radialSegments, tubularSegments]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, platformHeight / 2, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#e0e0e0"
          roughness={0.6}
          metalness={0.1}
        />
      </Torus>
    </RigidBody>
  );
};

const GlowingTrim: React.FC = () => {
  const trimTubeRadius = 0.15; // Thinner tube for the trim
  const radialSegments = 16;
  const tubularSegments = 48;
  const pastelLavender = new THREE.Color('#E6E6FA');

  return (
    <Torus
      args={[platformRadius, trimTubeRadius, radialSegments, tubularSegments]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, platformHeight / 2 + 0.01, 0]} // Slightly above padded edges to avoid z-fighting
    >
      <meshStandardMaterial 
        color={pastelLavender}
        emissive={pastelLavender}
        emissiveIntensity={1.5} // Adjust for desired glow strength
        toneMapped={false} // Often good for emissive materials to make them pop
        roughness={0.5}
        metalness={0.2}
      />
    </Torus>
  );
};

const ArenaPlatform: React.FC = () => {
  const [diffuseMap, aoMap] = useTexture([
    '/textures/granite_tile/granite_tile_diff_1k.jpg',
    '/textures/granite_tile/granite_tile_ao_1k.jpg'
  ]);

  // Apply texture properties - repeat for tiling
  [diffuseMap, aoMap].forEach(texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Example: repeat texture 4 times in S and T directions
  });

  return (
    <group> {/* Group to hold platform and edges, centered at world origin [0,0,0] */}
      <RigidBody type="fixed" colliders={false} position={[0,0,0]} name="arena-platform-main">
        <CylinderCollider args={[platformHeight / 2, platformRadius]} /> {/* args: [height/2, radius] */}
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[platformRadius, platformRadius, platformHeight, 64]} /> {/* Use platformHeight */}
          <meshStandardMaterial 
            map={diffuseMap} 
            aoMap={aoMap}
            aoMapIntensity={1} // Adjust AO intensity as needed
            metalness={0.3} // Add a bit of metalness for a slightly more solid look
            roughness={0.7} // Adjust roughness
          />
        </mesh>
      </RigidBody>
      <PaddedEdges />
      <GlowingTrim />
    </group>
  );
};

// Game Status UI Component (New)
// Updated GameState type to include 'STARTING_COUNTDOWN'
interface GameStatusUIProps {
  gameState: GameState;
  winnerInfo: { username: string; score: number } | null;
  countdown: number | null;
  isSpectating?: boolean;
  localPlayerGameStatus?: 'InGame' | 'Eliminated' | 'Spectating'; // Add prop
  onMatchComplete: () => void; // Add this prop
}

const GameStatusUI: React.FC<GameStatusUIProps> = ({ gameState, winnerInfo, countdown, isSpectating, localPlayerGameStatus, onMatchComplete }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[GameStatusUI] PROPS RECEIVED: gameState=${gameState}, countdown=${countdown}, isSpectating=${isSpectating}, winnerInfo=${JSON.stringify(winnerInfo)}`);
  }

  let message = '';
  let showButton = false;

  if (winnerInfo && winnerInfo.username) {
    message = `Winner: ${winnerInfo.username}! Score: ${winnerInfo.score}`; // Display score
    showButton = true;
  } else if (gameState === 'WAITING') {
    message = 'Waiting for players...';
  } else if (gameState === 'STARTING_COUNTDOWN') {
    message = countdown !== null ? `Starting in ${countdown}s...` : 'Starting...';
  } else if (gameState === 'ACTIVE') {
    message = isSpectating ? 'Spectating' : 'Game is active!';
    if (isSpectating === undefined && localPlayerGameStatus === 'Eliminated') { // Assuming localPlayerGameStatus is available in this scope
      message = 'YOU ARE OUT!';
    }
  } else if (gameState === 'ROUND_OVER') {
    message = 'Round Over!';
    showButton = true; // Or based on game logic
  } else if (gameState === 'GAME_OVER') {
      message = 'Game Over!';
    showButton = true;
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '20px 40px',
      borderRadius: '10px',
      fontSize: '2em',
      textAlign: 'center',
      zIndex: 1000,
    }}>
      <div>{message}</div>
      {showButton && (
        <button 
          onClick={() => {
            console.log('Return to lobbies button clicked - implement or pass onMatchComplete');
            onMatchComplete(); // Call the passed function
          }}
          style={{
            padding: '12px 25px',
            fontSize: '0.8em',
            marginTop: '20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Back to Lobbies
        </button>
      )}
    </div>
  );
};

interface WinnerCelebrationFirework {
    id: string;
    position: THREE.Vector3;
    color: THREE.Color;
}

// Main Scene Component for Spectator Camera
const SpectatorCameraHandler: React.FC<{
    isSpectatorCamActive: boolean;
    spectatedPlayerId: string | null;
    remotePlayerEntities: Record<string, RemotePlayerStateData>;
    livePlayersForHUD: LivePlayer[]; // To find other players if current spectated one is out
    onSetSpectatedPlayerId: (id: string | null) => void; // To cycle or select next player
}> = ({ isSpectatorCamActive, spectatedPlayerId, remotePlayerEntities, livePlayersForHUD, onSetSpectatedPlayerId }) => {
    const { camera } = useThree();
    const [smoothedSpecCamPosition] = useState(() => new THREE.Vector3(10, 10, 10));
    const [smoothedSpecCamTarget] = useState(() => new THREE.Vector3());

    useEffect(() => {
        if (isSpectatorCamActive && !spectatedPlayerId) {
            // Auto-select a player to spectate if none is selected
            const activePlayers = livePlayersForHUD.filter(p => p.status === 'In');
            if (activePlayers.length > 0) {
                onSetSpectatedPlayerId(activePlayers[0].id);
            }
        }
    }, [isSpectatorCamActive, spectatedPlayerId, livePlayersForHUD, onSetSpectatedPlayerId]);

    useFrame((_, delta) => {
        if (!isSpectatorCamActive || !spectatedPlayerId) return;

        const targetData = remotePlayerEntities[spectatedPlayerId];
        if (!targetData || targetData.status === 'Out') {
            // Current spectated player is out or data missing, try to find another one
            const activePlayers = livePlayersForHUD.filter(p => p.status === 'In' && p.id !== spectatedPlayerId);
            if (activePlayers.length > 0) {
                onSetSpectatedPlayerId(activePlayers[0].id);
            } else {
                onSetSpectatedPlayerId(null); // No one left to spectate
            }
            return;
        }

        // Correctly create Vector3 from position object
        const targetPosition = new THREE.Vector3(targetData.position.x, targetData.position.y, targetData.position.z);
        
        const cameraOffset = new THREE.Vector3(0, 5, 7); 
        const idealCameraPosition = new THREE.Vector3().addVectors(targetPosition, cameraOffset);
        const idealLookAt = targetPosition;

        smoothedSpecCamPosition.lerp(idealCameraPosition, 4 * delta);
        smoothedSpecCamTarget.lerp(idealLookAt, 4 * delta);

        camera.position.copy(smoothedSpecCamPosition);
        camera.lookAt(smoothedSpecCamTarget);
    });

    return null; // This component doesn't render anything itself
};

const SumoArenaScene = ({ gameState: initialGameStateFromParent, onMatchComplete, socket, localUsername, lobbyId, isPractice, playerWalletAddress }: SumoArenaSceneProps) => {
  // Use initialGameStateFromParent as the initial state, internalGameState for mutable state
  console.log(`!!!!!! [SumoArenaScene] TOP OF COMPONENT. Props -- localUsername: ${localUsername}, socket exists: ${!!socket}, initialGameStateFromParent: ${initialGameStateFromParent}, lobbyId: ${lobbyId}`);

  // Start in WAITING until we receive server updates / local countdown finishes
  const [internalGameState, setInternalGameState] = useState<GameState>('WAITING');
  // ... (rest of state variables, make sure localPlayerGameStatus is one of them if used in GameStatusUI)
  const [localPlayerGameStatus, setLocalPlayerGameStatus] = useState<'InGame' | 'Eliminated' | 'Spectating'>('InGame');
  const [winnerInfo, setWinnerInfo] = useState<{ username: string; score?: number } | null>(null); // Ensure score is here
  const [countdownUIDisplay, setCountdownUIDisplay] = useState<number | null>(null);
  const [remotePlayerEntities, setRemotePlayerEntities] = useState<Record<string, RemotePlayerStateData>>({});
  const [livePlayersForHUD, setLivePlayersForHUD] = useState<LivePlayer[]>([]);
  const [spectatedPlayerId, setSpectatedPlayerId] = useState<string | null>(null);
  const [isSpectatorCamActive, setIsSpectatorCamActive] = useState(false);
  const localPlayerId = useMemo(
    () => playerWalletAddress || localUsername || '',
    [playerWalletAddress, localUsername],
  );
  const localDisplayName = useMemo(() => {
    if (localUsername && localUsername.trim().length > 0) return localUsername;
    if (playerWalletAddress) {
      const w = playerWalletAddress;
      return w.length > 8 ? `${w.slice(0, 4)}...${w.slice(-4)}` : w;
    }
    return 'Player';
  }, [localUsername, playerWalletAddress]);


  // Effect to synchronize internalGameState with prop changes, carefully
  useEffect(() => {
    console.log(`[SumoArenaScene EFFECT] initialGameStateFromParent changed to: ${initialGameStateFromParent}. Current internal gameState: ${internalGameState}.`);
    // More robust sync: if the prop changes and it's a "reset" type state, update internal state.
    // We no longer drive state from parent; server + local countdown are authoritative here.
    // Avoid overriding internal progressions like ACTIVE -> ROUND_OVER -> GAME_OVER unless prop explicitly dictates a reset.
  }, [initialGameStateFromParent, internalGameState]);


  // Effect for server-driven game state updates
  useEffect(() => {
    if (!socket) return;

    const handleGameStatusUpdate = (payload: GameStatusUpdatePayload) => {
      console.log('[SumoArenaScene] Received gameStatusUpdate from server:', payload);
      if (payload.gameState) {
        setInternalGameState((prev) => {
          // Keep local countdown state until finished; afterwards trust server.
          if (prev === 'STARTING_COUNTDOWN' && countdownUIDisplay !== null && countdownUIDisplay > 0) {
            return prev;
          }
          return payload.gameState!;
        });
      }
      if (payload.winnerInfo) {
        setWinnerInfo({ username: payload.winnerInfo.username, score: payload.winnerInfo.score });
      } else if (payload.gameState === 'ACTIVE' || payload.gameState === 'WAITING' || payload.gameState === 'STARTING_COUNTDOWN') {
        setWinnerInfo(null); // Clear winner if game resets or is ongoing without a winner declared
      }
      if (payload.countdown !== undefined) {
        setCountdownUIDisplay(payload.countdown);
      }
      if (Array.isArray(payload.players) && payload.players.length > 0) {
        const entities: Record<string, RemotePlayerStateData> = {}
        const hud: LivePlayer[] = payload.players.map((p, idx) => {
          const wallet = p.id
          entities[wallet] = {
            id: wallet,
            position: p.position || { x: 0, y: 0, z: 0 },
            quaternion: p.quaternion || { x: 0, y: 0, z: 0, w: 1 },
            username: p.username || wallet,
            status: p.status,
          }
          return {
            id: wallet,
            username: p.username || `Player ${idx + 1}`,
            status: p.status === 'Out' ? 'Out' : 'In',
          }
        })
        setRemotePlayerEntities(entities)
        setLivePlayersForHUD(hud)
        if (spectatedPlayerId && entities[spectatedPlayerId] && entities[spectatedPlayerId].status === 'Out') {
          setSpectatedPlayerId(null)
        }
      }
    };

    socket.on('gameStatusUpdate', handleGameStatusUpdate);
    socket.on('player_eliminated', ({ playerId }) => {
      setLivePlayersForHUD((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: 'Out' } : p)),
      )
    })
    socket.on('match_finished', ({ winner }) => {
      if (winner) {
        setWinnerInfo({ username: winner })
      }
    })
    return () => {
      socket.off('gameStatusUpdate', handleGameStatusUpdate);
      socket.off('player_eliminated')
      socket.off('match_finished')
    };
  }, [socket, spectatedPlayerId]);

  // Simple local pre-game countdown once scene mounts and socket is ready
  useEffect(() => {
    if (!socket) return;
    // Only trigger once from WAITING
    if (internalGameState !== 'WAITING') return;
    setInternalGameState('STARTING_COUNTDOWN');
    setCountdownUIDisplay(3);
    let remaining = 3;
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setCountdownUIDisplay(null);
        setInternalGameState('ACTIVE');
      } else {
        setCountdownUIDisplay(remaining);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [socket, internalGameState]);

  const handleLocalFallenOff = useCallback(() => {
    setLocalPlayerGameStatus('Eliminated');
    setIsSpectatorCamActive(true);
  }, []);

  // ... (rest of the component, many parts omitted for brevity) ...
  
  // Example of correcting a comparison:
  // Inside handleLocalPlayerFallenOff or similar logic:
  // if (some_condition_that_means_game_is_over_for_player) {
  //   setInternalGameState('GAME_OVER'); // or ROUND_OVER based on rules
  // }

  // Ensure all internal logic that sets game states uses the correct GameState values.
  // For example, where 'ENDED' was used:
  // setCurrentRoundWinner(...) might lead to setInternalGameState('ROUND_OVER');
  // determineOverallWinner(...) might lead to setInternalGameState('GAME_OVER');

  const handleKeyboardControls = useCallback((event: KeyboardEvent) => {
    // ... (existing keyboard controls)
    // Example: if (internalGameState === 'ACTIVE') { ... }
  }, [internalGameState]); // Add internalGameState if decisions depend on it

  // In render, ensure all R3F hook users live inside a <Canvas>,
  // with HUD / status UI overlaid via normal DOM.
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#020617' }}>
      <Canvas
        shadows
        camera={{ position: [0, 25, 45], fov: 50 }}
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 5]} intensity={1.0} castShadow />
        {/* HDRI environment + snowfall for atmosphere */}
        {/* Reuse the cinematic lobby HDRI for consistency */}
        <Environment files="/HDRI/passendorf_snow_1k.hdr" background={false} />
        <FallingSnow count={600} radius={70} speed={0.25} />

        <Physics gravity={[0, -9.81, 0]}>
          <ArenaPlatform />
          {/* Local controllable player */}
          {socket && localPlayerId && (
            <Player
              ref={undefined as any}
              ballColor="#ff66cc"
              socket={socket}
              isSpectatingOrEliminated={localPlayerGameStatus !== 'InGame'}
              onFallenOff={handleLocalFallenOff}
              username={localDisplayName}
              initialPosition={[0, platformHeight / 2 + 1.2, platformRadius * 0.4]}
              initialYawAngle={0}
              onPushAction={() => {}}
              platformHeightActual={platformHeight}
            />
          )}

          {/* Remote players driven by server state */}
          {Object.values(remotePlayerEntities)
            .filter((p) => !localPlayerId || p.id !== localPlayerId)
            .map((p) => (
              <OtherPlayer
                key={p.id}
                playerId={p.id}
                targetPosition={[p.position.x, p.position.y, p.position.z]}
                targetRotation={[p.quaternion.x, p.quaternion.y, p.quaternion.z, p.quaternion.w]}
                ballColor="#9ae6ff"
                username={p.username}
                visible={p.status === 'In'}
              />
            ))}
        </Physics>

        {socket && (
          <SpectatorCameraHandler
            isSpectatorCamActive={isSpectatorCamActive}
            spectatedPlayerId={spectatedPlayerId}
            remotePlayerEntities={remotePlayerEntities}
            livePlayersForHUD={livePlayersForHUD}
            onSetSpectatedPlayerId={setSpectatedPlayerId}
          />
        )}
      </Canvas>

      <GameStatusUI
        gameState={internalGameState}
        winnerInfo={winnerInfo}
        countdown={countdownUIDisplay}
        isSpectating={localPlayerGameStatus === 'Spectating'}
        localPlayerGameStatus={localPlayerGameStatus}
        onMatchComplete={onMatchComplete}
      />
      <GameHUD
        players={livePlayersForHUD}
        onPlayerNameClick={(id) => setSpectatedPlayerId(id)}
        isSpectating={isSpectatorCamActive || localPlayerGameStatus === 'Spectating'}
        spectatedPlayerId={spectatedPlayerId}
        onSpectatePrevious={() => {
          const alive = livePlayersForHUD.filter((p) => p.status === 'In')
          if (alive.length === 0) return
          const idx = alive.findIndex((p) => p.id === spectatedPlayerId)
          const next = idx <= 0 ? alive[alive.length - 1] : alive[idx - 1]
          setSpectatedPlayerId(next.id)
        }}
        onSpectateNext={() => {
          const alive = livePlayersForHUD.filter((p) => p.status === 'In')
          if (alive.length === 0) return
          const idx = alive.findIndex((p) => p.id === spectatedPlayerId)
          const next = idx === -1 || idx === alive.length - 1 ? alive[0] : alive[idx + 1]
          setSpectatedPlayerId(next.id)
        }}
      />
    </div>
  );
}
;

export default SumoArenaScene; 
