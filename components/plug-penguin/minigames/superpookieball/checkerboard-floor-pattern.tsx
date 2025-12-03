import React from 'react';
import * as THREE from 'three';

interface CheckerboardFloorPatternProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  circleArgs?: [number, number]; // e.g. [radius, segments]
  textureSize?: number;
  squareSizeFactor?: number; // Determines how large the checkerboard squares are
}

export const CheckerboardFloorPattern = ({
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  circleArgs = [4.0, 32],
  textureSize = 256,
  squareSizeFactor = 12
}: CheckerboardFloorPatternProps) => {

  const texture = React.useMemo(() => {
    const data = new Uint8Array(textureSize * textureSize * 4);
    for (let i = 0; i < textureSize; i++) {
      for (let j = 0; j < textureSize; j++) {
        const index = (i * textureSize + j) * 4;
        const isEven = (Math.floor(i / squareSizeFactor) % 2 === 0) !== (Math.floor(j / squareSizeFactor) % 2 === 0);
        const r = isEven ? 255 : 35;
        const g = isEven ? 220 : 150;
        const b = isEven ? 0 : 0;
        const a = 255;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = a;
      }
    }
    const tex = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, [textureSize, squareSizeFactor]);

  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <circleGeometry args={circleArgs} />
      <meshStandardMaterial 
        map={texture}
        roughness={0.3}
        metalness={0.3}
      />
    </mesh>
  );
}; 