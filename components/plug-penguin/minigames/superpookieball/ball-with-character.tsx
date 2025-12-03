import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider, CollisionEnterPayload } from '@react-three/rapier';
import { useGLTF, MeshTransmissionMaterial, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Controls } from './keyboard-controls';

interface BallWithCharacterProps {
  position: [number, number, number];
  worldRef: React.RefObject<THREE.Group>;
  active?: boolean;
  radius?: number;
  mass?: number;
  jumpForce?: number;
}

export const BallWithCharacter: React.FC<BallWithCharacterProps> = ({
  position,
  worldRef,
  active = true,
  radius = 1,
  mass = 1,
  jumpForce = 10
}) => {
  // Refs
  const ballRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group>(null);
  
  // State for jump cooldown
  const [canJump, setCanJump] = useState(false);
  const [collisionCount, setCollisionCount] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  
  // Load Pookie character model - fixed path to use POOKIE.glb (uppercase)
  const { scene: pookieModel } = useGLTF('/models/POOKIE.glb');
  
  // Clone the model to avoid issues
  const clonedPookie = pookieModel.clone();
  
  // Prepare model
  useEffect(() => {
    if (clonedPookie) {
      // Adjust scale to make Pookie fits inside the ball without clipping
      // Make Pookie even smaller to prevent clipping
      clonedPookie.scale.set(0.336, 0.336, 0.336); // Match PookieInBallEffect scale
      
      // Adjust position to center Pookie better in the ball
      clonedPookie.position.set(0, -0.6, 0); // Match PookieInBallEffect position
      clonedPookie.rotation.set(0, Math.PI, 0);
      
      // Create a bounding box to check the model's size
      const boundingBox = new THREE.Box3().setFromObject(clonedPookie);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      
      // Make sure all parts cast shadows
      clonedPookie.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Make sure materials use physically correct lighting
          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.transparent = false;
          }
        }
      });
    }
  }, [clonedPookie]);
  
  // Get keyboard controls for jumping
  const [, getKeys] = useKeyboardControls();
  
  // Handle jump input
  useFrame(() => {
    if (!active || !ballRef.current) return;
    
    // Check for jump key
    const jumpPressed = getKeys()[Controls.jump];
    
    if (jumpPressed && canJump) {
      // Apply jump force
      ballRef.current.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
      setCanJump(false);
      
      // Reset jump after a cooldown
      setTimeout(() => {
        setCanJump(true);
      }, 500);
    }
  });
  
  // Handle collision events to determine if ball can jump
  const handleCollision = (payload: CollisionEnterPayload) => {
    // Check if collision is with the ground or platforms
    const otherBody = payload.other;
    
    // Update collision count
    setCollisionCount(prev => prev + 1);
    
    // Allow jumping if colliding with ground or platforms
    if (collisionCount > 0) {
      setCanJump(true);
    }
    
    // Check if we're colliding with a collectible or goal
    const userData = otherBody.rigidBody?.userData as Record<string, any> | undefined;
    if (userData?.type === 'collectible' && !isCollecting) {
      setIsCollecting(true);
      
      // Trigger collectible collection
      const collectibleId = userData.id;
      
      // Reset collecting state after a small delay
      setTimeout(() => {
        setIsCollecting(false);
      }, 100);
    }
  };
  
  // Update model rotation based on ball movement and prevent clipping
  useFrame((state, delta) => {
    if (!ballRef.current || !modelRef.current) return;
    
    // Get velocity of the ball
    const velocity = ballRef.current.linvel();
    
    // Apply gravity based on world tilt if a worldRef is provided
    if (worldRef?.current) {
      // Get the world rotation
      const worldRotX = worldRef.current.rotation.x;
      const worldRotZ = worldRef.current.rotation.z;
      
      // Calculate gravity direction based on world tilt
      // Increase the gravity effect to make movements more responsive
      const gravityFactor = 20; // Increase this value for more responsive tilting
      
      // Apply impulse based on world tilt (simulating gravity in the tilted direction)
      // This makes the ball roll according to the world tilt
      ballRef.current.applyImpulse({
        x: -worldRotZ * gravityFactor * mass, 
        y: 0, 
        z: -worldRotX * gravityFactor * mass
      }, true);
    }
    
    // Get the magnitude of velocity for scaling the character
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    
    // Calculate rotation based on velocity
    if (speed > 0.1) {
      // Calculate rotation axis (perpendicular to movement direction)
      const rotationAxis = new THREE.Vector3(-velocity.z, 0, velocity.x).normalize();
      
      // Calculate rotation amount based on speed - limit for more controlled rotation
      const rotationAmount = Math.min(speed * delta * 0.5, 0.1);
      
      // Apply rotation to the model
      modelRef.current.rotateOnAxis(rotationAxis, rotationAmount);
      
      // Add a slight compression to the model when moving fast to prevent clipping
      const compression = Math.max(1 - speed * 0.02, 0.9);
      
      if (modelRef.current.children[0]) {
        // Apply compression on y-axis only
        modelRef.current.children[0].scale.y = compression * 0.35;
        modelRef.current.children[0].scale.x = 0.35;
        modelRef.current.children[0].scale.z = 0.35;
      }
    } else {
      // Reset compression when not moving
      if (modelRef.current.children[0]) {
        modelRef.current.children[0].scale.set(0.35, 0.35, 0.35);
      }
    }
  });
  
  // Use the specified ball size
  const ballSize = radius;
  
  return (
    <RigidBody
      ref={ballRef}
      colliders={false}
      position={position}
      mass={mass}
      restitution={0.5}
      friction={1.0}
      linearDamping={0.5}
      angularDamping={0.5}
      onCollisionEnter={handleCollision}
      name="player-ball"
    >
      {/* Ball collider */}
      <BallCollider args={[radius]} />
      
      {/* Transparent ball */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 32, 32]} />
        <MeshTransmissionMaterial
          samples={16}
          resolution={256}
          thickness={0.2}
          roughness={0}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.05}
          backside={true}
          color={'#a0d8ff'}
        />
      </mesh>
      
      {/* Character model inside the ball */}
      <group ref={modelRef}>
        <primitive object={clonedPookie} />
      </group>
    </RigidBody>
  );
};

export default BallWithCharacter; 