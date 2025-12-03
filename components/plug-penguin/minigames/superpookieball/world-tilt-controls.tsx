import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Controls } from './keyboard-controls';
import * as THREE from 'three';

interface WorldTiltControlsProps {
  children: React.ReactNode;
  active?: boolean;
  maxTilt?: number;
  tiltSpeed?: number;
  returnSpeed?: number;
}

// World tilt controls component that allows tilting the entire world
export const WorldTiltControls = forwardRef<THREE.Group, WorldTiltControlsProps>(
  ({ children, active = true, maxTilt = 0.4, tiltSpeed = 4.0, returnSpeed = 3.5 }, ref) => {
    // Group reference for the world container
    const groupRef = useRef<THREE.Group>(null);
    const targetRotation = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
    const currentRotation = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
    const isTilting = useRef<boolean>(false);

    // Get keyboard controls
    const [, getKeys] = useKeyboardControls();

    // Expose the group ref
    useImperativeHandle(ref, () => groupRef.current!);

    // Use frame to smoothly transition between rotations
    useFrame((_, delta) => {
      if (!groupRef.current || !active) return;

      // Get current key states
      const keys = getKeys();
      const forward = keys[Controls.forward];
      const back = keys[Controls.back];
      const left = keys[Controls.left];
      const right = keys[Controls.right];

      // Reset the target rotation
      targetRotation.current.x = 0;
      targetRotation.current.z = 0;

      // Update based on keypress - increase tilt effect
      if (forward) targetRotation.current.x = -maxTilt;
      if (back) targetRotation.current.x = maxTilt;
      if (left) targetRotation.current.z = maxTilt;
      if (right) targetRotation.current.z = -maxTilt;

      // Allow diagonal tilting by applying both rotations at the same time
      // but scale them down slightly when two directions are pressed to avoid excessive tilt
      if ((forward || back) && (left || right)) {
        targetRotation.current.x *= 0.8;
        targetRotation.current.z *= 0.8;
      }

      // Flag to know if we're actively tilting
      isTilting.current = forward || back || left || right;

      // Choose the right speed depending on if we're actively tilting or returning to neutral
      const speed = isTilting.current ? tiltSpeed : returnSpeed;
      
      // Smoothly interpolate the rotation - increase responsiveness with higher delta multiplier
      currentRotation.current.x = THREE.MathUtils.lerp(
        currentRotation.current.x,
        targetRotation.current.x,
        speed * delta * 1.5
      );
      currentRotation.current.z = THREE.MathUtils.lerp(
        currentRotation.current.z,
        targetRotation.current.z,
        speed * delta * 1.5
      );

      // Apply the rotation
      groupRef.current.rotation.x = currentRotation.current.x;
      groupRef.current.rotation.z = currentRotation.current.z;
    });

    return (
      <group ref={groupRef}>
        {children}
      </group>
    );
  }
);

WorldTiltControls.displayName = 'WorldTiltControls';

export default WorldTiltControls; 