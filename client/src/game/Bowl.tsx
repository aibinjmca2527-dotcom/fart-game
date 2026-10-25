// ============================================================
// Fun Together — 3D Inflatable River Raft ("The Bowl")
// Modeled directly from reference image:
// - Circular inflatable cream/peach pontoon tube lying FLAT on the water
// - Red/coral rubber grip pads and handles around the rim
// - Green inner deck floor mat
// - Water wakes, spray, and dynamic banking/tilt on steering
// ============================================================
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { BowlCrew } from './Characters';

export function Bowl() {
  const groupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const { bowl, players, clearFartEvents } = useGameStore();

  useFrame(() => {
    if (!groupRef.current || !tiltGroupRef.current) return;

    // Smoothly lerp to authoritative position (snap instantly on reset / spawn)
    const target = new THREE.Vector3(bowl.posX, bowl.bobY, bowl.posZ);
    if (groupRef.current.position.distanceTo(target) > 3.5) {
      groupRef.current.position.copy(target);
    } else {
      groupRef.current.position.lerp(target, 0.45);
    }

    // Lerp yaw rotation (heading)
    const currentY = groupRef.current.rotation.y;
    const targetY = -bowl.angle;
    groupRef.current.rotation.y += (targetY - currentY) * 0.35;

    // Dynamic banking/roll tilt based on lateral velocity (steering side to side!)
    const targetRoll = -Math.max(-0.25, Math.min(0.25, bowl.velX * 0.035));
    const targetPitch = Math.max(-0.15, Math.min(0.15, bowl.velZ * 0.015));
    tiltGroupRef.current.rotation.z = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.z, targetRoll, 0.15);
    tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, targetPitch, 0.15);

    clearFartEvents();
  });

  const playerList = [...players.values()];

  // 8 grab handles around the circular rim
  const handleAngles = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

  return (
    <group ref={groupRef} position={[bowl.posX, bowl.bobY, bowl.posZ]}>
      <group ref={tiltGroupRef}>
        {/* Main Inflatable Pontoon Ring — Lies FLAT / PARALLEL on the water (rotated -90deg on X) */}
        <mesh castShadow receiveShadow position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.35, 0.42, 24, 48]} />
          <meshStandardMaterial
            color="#F5E4C3"
            roughness={0.45}
            metalness={0.08}
          />
        </mesh>

        {/* Lower Hull / Splash Bumper (underwater pontoon rim) */}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <torusGeometry args={[1.3, 0.35, 16, 48]} />
          <meshStandardMaterial
            color="#E0C9A6"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>

        {/* Outer White Rubbing Strake / Safety Trim */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.74, 0.05, 12, 48]} />
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>

        {/* Inner Green Deck Floor Mat — directly matching reference image! */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
          <circleGeometry args={[1.05, 36]} />
          <meshStandardMaterial
            color="#52B788"
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>

        {/* Inner Deck Center Ring Accent */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
          <ringGeometry args={[0.5, 0.58, 32]} />
          <meshStandardMaterial
            color="#40916C"
            roughness={0.8}
          />
        </mesh>

        {/* Coral/Red Grab Handles & Pads around the Flat Rim */}
        {handleAngles.map((angle, idx) => {
          const hx = Math.sin(angle) * 1.35;
          const hz = Math.cos(angle) * 1.35;
          return (
            <group key={idx} position={[hx, 0.44, hz]} rotation={[0, angle, 0]}>
              {/* Cushion Pad */}
              <mesh castShadow>
                <boxGeometry args={[0.26, 0.08, 0.18]} />
                <meshStandardMaterial color="#E63946" roughness={0.5} />
              </mesh>
              {/* Strap Handle */}
              <mesh position={[0, 0.06, 0]}>
                <torusGeometry args={[0.09, 0.025, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#B51726" roughness={0.3} metalness={0.2} />
              </mesh>
            </group>
          );
        })}

        {/* Characters sitting in the raft */}
        <BowlCrew players={playerList} />
      </group>

      {/* Dynamic Water Contact Foam Ring under raft */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.4, 2.0, 36]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
