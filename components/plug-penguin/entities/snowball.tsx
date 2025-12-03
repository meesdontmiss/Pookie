'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { RigidBody, CollisionEnterPayload, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

// Snowball physics constants
const GRAVITY = 25.0 // Match player physics constant for consistent behavior
const AIR_RESISTANCE = 0.003 // Reduced for less drag at high altitudes
const LIFETIME = 12000 // Increased for longer air time on high throws
const IMPACT_THRESHOLD = 0.5 // Lower threshold for more responsive impact detection
const FIXED_TIMESTEP = 1/60 // Standard physics timestep (60fps)
const MIN_DELTA = 0.001 // Minimum delta time to prevent glitches with tiny timesteps
const MAX_DELTA = 0.05 // Maximum delta time to prevent glitches with large timesteps

// Shared texture loader for better performance
const textureLoader = new THREE.TextureLoader();
// Use a simple circular gradient texture instead of requiring a snowflake image
const generateParticleTexture = () => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Create a radial gradient for a soft particle look
  const gradient = ctx.createRadialGradient(
    size/2, size/2, 0, 
    size/2, size/2, size/2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(240, 240, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(230, 240, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// Create a single shared particle texture
const particleTexture = generateParticleTexture();

interface SnowballProps {
  position: THREE.Vector3
  velocity: THREE.Vector3
  onCollision?: (position: THREE.Vector3, isTree?: boolean) => void
  onExpire?: () => void
}

export function Snowball({ position, velocity, onCollision, onExpire }: SnowballProps) {
  const snowballRef = useRef<THREE.Mesh>(null)
  const positionRef = useRef(position.clone())
  const velocityRef = useRef(velocity.clone())
  const [expired, setExpired] = useState(false)
  const createdAtRef = useRef(Date.now())
  const trailPointsRef = useRef<THREE.Vector3[]>([])
  const lastTrailUpdateRef = useRef(0)
  const lastUpdateRef = useRef(Date.now())
  const { scene } = useThree()
  const raycasterRef = useRef(new THREE.Raycaster())
  
  // Debug log on mount
  useEffect(() => {
    console.log("Snowball created at", position, "with velocity", velocity)
    
    // Initialize with starting position
    trailPointsRef.current = [position.clone()]
    
    return () => {
      console.log("Snowball removed")
    }
  }, [position, velocity])
  
  // Check for tree collision
  const checkTreeCollision = (): { hit: boolean; point?: THREE.Vector3 } => {
    if (!snowballRef.current) return { hit: false };
    
    // Get current snowball position
    const snowballPosition = positionRef.current.clone();
    
    // Get next position based on velocity
    const nextPosition = snowballPosition.clone().add(velocityRef.current.clone().multiplyScalar(FIXED_TIMESTEP));
    
    // Direction of movement
    const direction = nextPosition.clone().sub(snowballPosition).normalize();
    
    // Setup raycaster from current position along movement direction
    raycasterRef.current.set(snowballPosition, direction);
    
    // Look for tree objects (they have cone geometry as children)
    // Find all rigid bodies in the scene
    const sceneObjects: THREE.Object3D[] = [];
    scene.traverse((object) => {
      // Check if it's a RigidBody that might be a tree (has "PineTree" or "TallPineTree" in userData.name)
      if (object.userData?.name?.includes('PineTree')) {
        sceneObjects.push(object);
        // Debug: log found tree objects
        if (Math.random() < 0.01) {  // Only log occasionally to avoid spamming
          console.log("Found tree for collision:", object.userData.name);
        }
      }
    });
    
    // Calculate distance to check based on velocity and time step
    const checkDistance = velocityRef.current.length() * FIXED_TIMESTEP * 2;
    
    // Check for intersections with tree objects
    const intersections = raycasterRef.current.intersectObjects(sceneObjects, true);
    
    // If we hit a tree, return true
    if (intersections.length > 0 && intersections[0].distance < checkDistance) {
      console.log("Snowball hit a tree at", intersections[0].point);
      return {
        hit: true,
        point: intersections[0].point
      };
    }
    
    return { hit: false };
  }
  
  // Manually implement physics without relying on RigidBody
  useFrame((_, delta) => {
    if (expired || !snowballRef.current) return
    
    // Check lifetime
    if (Date.now() - createdAtRef.current > LIFETIME) {
      setExpired(true)
      console.log("Snowball expired due to lifetime")
      onExpire?.()
      return
    }
    
    // Calculate deltaTime since last update, clamped to prevent glitches
    const now = Date.now();
    const rawDelta = (now - lastUpdateRef.current) / 1000;
    const clampedDelta = Math.max(MIN_DELTA, Math.min(MAX_DELTA, rawDelta));
    lastUpdateRef.current = now;
    
    // Use fixed timestep for more stable physics
    const timeStep = FIXED_TIMESTEP;
    const steps = Math.floor(clampedDelta / timeStep);
    const remainder = clampedDelta % timeStep;
    
    // Apply physics in fixed steps for stability
    for (let i = 0; i < steps; i++) {
      // Check for tree collision before updating position
      const collision = checkTreeCollision()
      if (collision.hit) {
        // Handle tree collision with isTree=true
        if (collision.point) {
          onCollision?.(collision.point, true)
        } else {
          onCollision?.(positionRef.current.clone(), true)
        }
        setExpired(true)
        onExpire?.()
        return
      }
      
      // Apply gravity to velocity - consistent with player physics
      velocityRef.current.y -= GRAVITY * timeStep
      
      // Apply air resistance (more realistic quadratic drag based on velocity)
      const speed = velocityRef.current.length();
      if (speed > 0) {
        const dragFactor = 1 - (AIR_RESISTANCE * speed * timeStep);
        velocityRef.current.multiplyScalar(Math.max(0, dragFactor));
      }
      
      // Calculate next position before applying it
      const nextPosition = positionRef.current.clone().add(
        velocityRef.current.clone().multiplyScalar(timeStep)
      );
      
      // Store previous Y to detect ground collision
      const prevY = positionRef.current.y;
      
      // Update position
      positionRef.current.copy(nextPosition);
      
      // Check for ground collision (y=0) with proper collision response
      if (positionRef.current.y < 0.2) {
        // Set to ground level
        positionRef.current.y = 0.2;
        
        // Only register collision if we're moving downward with sufficient velocity
        if (velocityRef.current.y < -IMPACT_THRESHOLD && prevY > 0.2) {
          console.log("Snowball hit the ground with velocity", velocityRef.current.y);
          onCollision?.(positionRef.current.clone(), false);
          setExpired(true);
          onExpire?.();
          return;
        } else if (velocityRef.current.y < 0) {
          // Weaker impact - small bounce with energy loss
          velocityRef.current.y = -velocityRef.current.y * 0.2; // 80% energy loss on bounce
          velocityRef.current.x *= 0.7; // Friction on x
          velocityRef.current.z *= 0.7; // Friction on z
        }
      }
    }
    
    // Update the mesh position
    snowballRef.current.position.copy(positionRef.current);
    
    // Add trail point with adaptive throttling based on velocity
    const trailUpdateInterval = 15; // More frequent updates (was 25ms)
    if (now - lastTrailUpdateRef.current > trailUpdateInterval) {
      lastTrailUpdateRef.current = now;
      
      // Add current position to trail
      const currentPos = positionRef.current.clone();
      trailPointsRef.current.push(currentPos);
      
      // Keep a shorter trail length for a more game-like feel
      const maxTrailLength = 8; // Reduced from 25 for shorter, snappier trail
      if (trailPointsRef.current.length > maxTrailLength) {
        trailPointsRef.current.shift();
      }
    }
  })
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      trailPointsRef.current = []
    }
  }, [])
  
  if (expired) return null
  
  return (
    <>
      <mesh ref={snowballRef} position={position.clone()} castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.9}
          metalness={0.05}
          emissive="#aaccff"
          emissiveIntensity={0.02}
        />
      </mesh>
      
      {/* Enhanced Snowball trail effect */}
      {trailPointsRef.current.length > 1 && (
        <group>
          {/* Thicker main trail line */}
          <primitive object={(() => {
            // Create geometry and set points
            const geometry = new THREE.BufferGeometry().setFromPoints(trailPointsRef.current);
            
            // Create material with improved appearance
            const material = new THREE.LineBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.8,
              linewidth: 3,
              linecap: 'round',
              linejoin: 'round'
            });
            
            // Create and return line
            return new THREE.Line(geometry, material);
          })()}
          />
          
          {/* Additional particle effects along the trail */}
          {trailPointsRef.current.map((point, i) => {
            // Skip the first point (most recent) and use decreasing sizes for older points
            if (i === 0) return null;
            
            const opacity = 0.7 * (1 - i / trailPointsRef.current.length);
            const size = 0.12 * (1 - i / (trailPointsRef.current.length * 1.5));
            
            return (
              <group key={i} position={point}>
                {/* Larger fuzzy particle */}
                <sprite scale={[size * 2, size * 2, 1]}>
                  <spriteMaterial 
                    transparent 
                    opacity={opacity * 0.7} 
                    map={particleTexture}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </sprite>
                
                {/* Small bright core */}
                <mesh scale={[size * 0.4, size * 0.4, size * 0.4]}>
                  <sphereGeometry args={[1, 8, 8]} />
                  <meshBasicMaterial 
                    color={0xaaccff}
                    transparent
                    opacity={opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
      
      {/* Add a subtle glow effect to the snowball */}
      <mesh position={position.clone()} scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial 
          color="#aaccff" 
          transparent
          opacity={0.12}
        />
      </mesh>
    </>
  )
}

// Snow impact effect component
export function SnowImpact({ position, onFinished }: { position: THREE.Vector3, onFinished: () => void }) {
  const [particles, setParticles] = useState<THREE.Vector3[]>([])
  const particleGroupRef = useRef<THREE.Group>(null)
  const startTimeRef = useRef(Date.now())
  
  // Debug log on mount
  useEffect(() => {
    console.log("SnowImpact created at", position)
    
    return () => {
      console.log("SnowImpact removed")
    }
  }, [position])
  
  // Create particles on mount
  useEffect(() => {
    const newParticles: THREE.Vector3[] = []
    for (let i = 0; i < 20; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize()
      
      newParticles.push(
        direction.multiplyScalar(Math.random() * 1.0 + 0.4)
      )
    }
    setParticles(newParticles)
  }, [])
  
  // Animate particles
  useFrame(() => {
    if (!particleGroupRef.current) return
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    
    // Remove effect after 1 second
    if (elapsed > 1) {
      console.log("SnowImpact finished animation")
      onFinished()
      return
    }
    
    // Apply gravity and fade out
    const children = particleGroupRef.current.children
    for (let i = 0; i < children.length; i++) {
      const particle = children[i]
      
      // Apply gravity
      particle.position.y -= GRAVITY * 0.025 * elapsed
      
      // Scale down as they fall
      const scale = Math.max(0, 1 - elapsed)
      particle.scale.set(scale, scale, scale)
    }
  })
  
  return (
    <group 
      ref={particleGroupRef}
      position={[position.x, position.y, position.z]}
    >
      {particles.map((offset, i) => (
        <mesh key={i} position={offset}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  )
} 