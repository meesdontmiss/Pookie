import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraFollowBallProps {
  distance?: number;
  height?: number;
  smoothTime?: number;
}

export const CameraFollowBall: React.FC<CameraFollowBallProps> = ({
  distance = 12,
  height = 8,
  smoothTime = 0.3
}) => {
  // Get Three.js instances
  const { camera, scene } = useThree();
  
  // Target position
  const targetPosition = useRef(new THREE.Vector3(0, height, distance));
  const currentVelocity = useRef(new THREE.Vector3(0, 0, 0));
  
  // Update camera position to follow the ball
  useFrame((state, delta) => {
    // Find the ball in the scene (with name "player-ball")
    const ball = scene.getObjectByName('player-ball');
    
    if (ball) {
      // Get ball's position
      const ballPosition = new THREE.Vector3();
      ball.getWorldPosition(ballPosition);
      
      // Calculate target position behind the ball
      targetPosition.current.set(
        ballPosition.x,
        ballPosition.y + height,
        ballPosition.z + distance
      );
      
      // Smoothly move camera towards target position
      const newPosition = new THREE.Vector3();
      newPosition.copy(camera.position);
      
      // SmoothDamp for each axis
      newPosition.x = THREE.MathUtils.damp(
        camera.position.x,
        targetPosition.current.x,
        smoothTime,
        delta
      );
      
      newPosition.y = THREE.MathUtils.damp(
        camera.position.y,
        targetPosition.current.y,
        smoothTime,
        delta
      );
      
      newPosition.z = THREE.MathUtils.damp(
        camera.position.z,
        targetPosition.current.z,
        smoothTime,
        delta
      );
      
      // Update camera position
      camera.position.copy(newPosition);
      
      // Make camera look at the ball
      camera.lookAt(ballPosition);
    }
  });
  
  // Initial camera position
  useEffect(() => {
    camera.position.set(0, height, distance);
    camera.lookAt(0, 0, 0);
  }, [camera, height, distance]);
  
  return null;
};

export default CameraFollowBall; 