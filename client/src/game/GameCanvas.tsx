import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Suspense } from 'react';
import { Bowl } from './Bowl';
import { LevelScene } from './LevelScene';
import { FollowCamera } from './FollowCamera';
import { BowlWake, WaterRipple } from './WaterEffects';
import { GreenSmokeSystem } from './GreenSmoke';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../shared/levels';

export function GameCanvas({ debug = false }: { debug?: boolean }) {
  const { levelId, bowl } = useGameStore();
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  const skyColor = level.environment?.skyColor ?? '#6EC6FF';

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 600, position: [0, 8, -14] }}
      style={{ width: '100%', height: '100%', background: skyColor }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      {/* Lighting matching bright sunny arcade canyon */}
      <ambientLight intensity={0.9} />
      <directionalLight
        castShadow
        position={[14, 25, 12]}
        intensity={1.6}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      <hemisphereLight
        color="#70D6FF"
        groundColor="#D48366"
        intensity={0.6}
      />

      {/* Fog */}
      <fog attach="fog" args={['#A0E7E5', 90, 260]} />

      {/* Scene */}
      <Suspense fallback={null}>
        <LevelScene />
        <Bowl />
        <BowlWake />
        <WaterRipple position={[bowl.posX, 0.05, bowl.posZ]} />
        <GreenSmokeSystem />
      </Suspense>

      {/* Camera */}
      <FollowCamera />

      {/* Debug */}
      {debug && <Stats />}
    </Canvas>
  );
}
