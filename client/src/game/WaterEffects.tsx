import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

/** Animated water surface for the channel */
export function WaterSurface({ width = 12, length = 400 }: { width?: number; length?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, length, 32, 128);
    return geo;
  }, [width, length]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    // Animated UV offset for flowing water
    matRef.current.map && (matRef.current.map.offset.y = -t * 0.15);
    matRef.current.needsUpdate = false;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
      <primitive object={geometry} />
      <meshStandardMaterial
        ref={matRef}
        color="#1E90FF"
        roughness={0.1}
        metalness={0.4}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/** Animated water ripples around the bowl */
export function WaterRipple({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const scale = 1 + (t % 1.5) * 2;
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.4 - (t % 1.5) * 0.27);
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.2, 32]} />
      <meshBasicMaterial color="#88CCFF" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Wake effect behind the bowl */
export function BowlWake() {
  const { bowl } = useGameStore();
  const speed = Math.sqrt(bowl.velX ** 2 + bowl.velZ ** 2);
  if (speed < 0.5) return null;

  return (
    <group position={[bowl.posX, 0.05, bowl.posZ]}>
      <mesh rotation={[-Math.PI / 2, 0, bowl.angle]}>
        <coneGeometry args={[0.6, speed * 0.8, 8, 1, true]} />
        <meshBasicMaterial color="#CCE8FF" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
