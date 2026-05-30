/**
 * @deprecated — This file is superseded by the components/ architecture:
 *   - components/GameScene.tsx  (full 3D compositor with real assets)
 *   - components/Arena.tsx      (platform, edges, trim, clouds)
 *   - components/PookieBall.tsx (POOKIE.glb + two-tone sphere)
 *   - components/Snow.tsx       (snowflake particle system)
 *   - components/Blimp.tsx      (orbiting pookie_blimp.glb)
 *
 * All compositions now use GameScene which renders the actual game world.
 */
export {};

/**
 * ThreeScene — A ready-to-use 3D composition using @remotion/three.
 *
 * This renders actual Three.js content frame-by-frame into the video.
 * You can import your game's 3D models (POOKIE.glb) and arena assets here
 * for cinematic camera sweeps, replays, and promo videos.
 *
 * Usage in Root.tsx:
 *   <Composition id="ThreeScene" component={ThreeScene} ... />
 */

interface ThreeSceneProps {
  ballColor?: string;
  cameraMode?: 'orbit' | 'flythrough' | 'static';
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({
  ballColor = '#ff66cc',
  cameraMode = 'orbit',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Camera orbit angle
  const cameraAngle = (frame / fps) * 0.5; // slow orbit
  const cameraRadius = 25;
  const cameraX = Math.cos(cameraAngle) * cameraRadius;
  const cameraZ = Math.sin(cameraAngle) * cameraRadius;
  const cameraY = 12 + Math.sin(frame * 0.02) * 3;

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{
        position: [cameraX, cameraY, cameraZ],
        fov: 50,
      }}
      style={{ backgroundColor: '#0a0a1a' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#6366f1" />

      {/* Arena Platform */}
      <ArenaPlatform />

      {/* Animated player balls */}
      <PlayerBall
        frame={frame}
        fps={fps}
        color={ballColor}
        phaseOffset={0}
        radius={0.7}
      />
      <PlayerBall
        frame={frame}
        fps={fps}
        color="#00e5ff"
        phaseOffset={Math.PI * 0.5}
        radius={0.7}
      />
      <PlayerBall
        frame={frame}
        fps={fps}
        color="#ffab00"
        phaseOffset={Math.PI}
        radius={0.7}
      />
      <PlayerBall
        frame={frame}
        fps={fps}
        color="#76ff03"
        phaseOffset={Math.PI * 1.5}
        radius={0.7}
      />

      {/* Snow particles */}
      <SnowParticles frame={frame} />

      {/* Ground fog */}
      <fog attach="fog" args={['#0a0a1a', 30, 60]} />
    </ThreeCanvas>
  );
};

const ArenaPlatform: React.FC = () => {
  return (
    <group>
      {/* Main platform */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <cylinderGeometry args={[18, 20, 2, 64]} />
        <meshStandardMaterial
          color="#1e3a5f"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Edge glow ring */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[17.5, 18.5, 64]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

const PlayerBall: React.FC<{
  frame: number;
  fps: number;
  color: string;
  phaseOffset: number;
  radius: number;
}> = ({ frame, fps, color, phaseOffset, radius }) => {
  const time = frame / fps;
  const orbitRadius = 8;

  // Orbit around the arena
  const angle = time * 1.2 + phaseOffset;
  const x = Math.cos(angle) * orbitRadius;
  const z = Math.sin(angle) * orbitRadius;
  // Slight bobbing
  const y = radius + 0.5 + Math.sin(time * 3 + phaseOffset) * 0.3;

  return (
    <mesh position={[x, y, z]} castShadow>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.4}
      />
    </mesh>
  );
};

const SnowParticles: React.FC<{ frame: number }> = ({ frame }) => {
  const particles = React.useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      x: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 50,
      speed: 0.3 + Math.random() * 0.5,
      offset: Math.random() * 100,
      size: 0.03 + Math.random() * 0.05,
    }));
  }, []);

  return (
    <group>
      {particles.map((p, i) => {
        const y = ((p.offset + frame * p.speed * 0.05) % 30) - 5;
        const drift = Math.sin(frame * 0.01 + p.offset) * 0.5;
        return (
          <mesh key={i} position={[p.x + drift, y, p.z]}>
            <sphereGeometry args={[p.size, 4, 4]} />
            <meshBasicMaterial color="white" transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};
