// ============================================================
// Fun Together — Animated Cartoon Green Fart Smoke System
// Renders expanding puffy lime-green cartoon cloud lobes
// ============================================================
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

interface SmokePuff {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  maxScale: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  maxLife: number;
  age: number;
  color: THREE.Color;
}

const GREEN_PALETTE = [
  '#4be028',
  '#70e000',
  '#9ef01a',
  '#80ed99',
  '#a7f23c',
  '#38b000',
];

export function GreenSmokeSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const { fartEvents, bowl } = useGameStore();
  const puffsRef = useRef<SmokePuff[]>([]);
  const dummy = useRef(new THREE.Object3D());

  // Instanced mesh for high performance even with continuous farting
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const MAX_PUFFS = 180;

  // Whenever a fart event is received, spawn a cluster of puffy green smoke lobes
  useEffect(() => {
    if (fartEvents.length === 0) return;

    fartEvents.forEach((fe) => {
      // Calculate world position of the farting character's rear
      const yawAngle = -bowl.angle;
      // Default seat angles if angle not directly provided
      const seatAngles = [
        Math.PI,           // seat 0 (rear)
        Math.PI * 0.5,     // seat 1 (right)
        0,                 // seat 2 (front)
        -Math.PI * 0.5,    // seat 3 (left)
      ];
      const playerAngle = fe.angle ?? seatAngles[fe.seatIndex % 4] ?? Math.PI;
      const charAngle = playerAngle + yawAngle;
      const charDist = 1.05;

      // Character world position
      const charX = bowl.posX + Math.sin(charAngle) * charDist;
      const charZ = bowl.posZ + Math.cos(charAngle) * charDist;

      // Ejection direction: pointing OUTWARD from character rear
      const ejectAngle = charAngle;
      const baseDir = new THREE.Vector3(
        Math.sin(ejectAngle),
        0.05,
        Math.cos(ejectAngle)
      ).normalize();

      // Spawn 4-7 puffy lobes per fart burst
      const lobeCount = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < lobeCount; i++) {
        if (puffsRef.current.length >= MAX_PUFFS) {
          puffsRef.current.shift(); // recycle oldest
        }

        const spread = (Math.random() - 0.5) * 0.8;
        const upSpread = Math.random() * 0.35;
        const speed = 1.5 + Math.random() * 3.0;

        const vel = new THREE.Vector3(
          baseDir.x * speed + spread,
          0.15 + upSpread,
          baseDir.z * speed + spread
        );

        // Inherit part of raft velocity
        vel.x += bowl.velX * 0.2;
        vel.z += bowl.velZ * 0.2;

        const hex = GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)];
        const color = new THREE.Color(hex);

        puffsRef.current.push({
          position: new THREE.Vector3(
            charX + (Math.random() - 0.5) * 0.3,
            0.35 + Math.random() * 0.2,
            charZ + (Math.random() - 0.5) * 0.3
          ),
          velocity: vel,
          scale: 0.25 + Math.random() * 0.2,
          maxScale: 0.95 + Math.random() * 0.65,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 2.5,
          opacity: 0.88,
          maxLife: 0.9 + Math.random() * 0.5,
          age: 0,
          color,
        });
      }
    });
  }, [fartEvents, bowl]);

  useFrame((_, delta) => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.08);
    const activePuffs: SmokePuff[] = [];

    // Update puff physics & animations
    for (let i = 0; i < puffsRef.current.length; i++) {
      const p = puffsRef.current[i];
      p.age += dt;

      if (p.age < p.maxLife) {
        // Expand rapidly then slowly dissipate
        const lifeRatio = p.age / p.maxLife;
        p.scale = THREE.MathUtils.lerp(p.scale, p.maxScale, 0.12);
        p.opacity = Math.max(0, 1 - Math.pow(lifeRatio, 1.4)) * 0.85;

        // Velocity damping & slight buoyancy
        p.velocity.x *= 0.94;
        p.velocity.z *= 0.94;
        p.velocity.y *= 0.92;
        p.position.addScaledVector(p.velocity, dt);

        p.rotation += p.rotSpeed * dt;
        activePuffs.push(p);
      }
    }
    puffsRef.current = activePuffs;

    // Update Three.js InstancedMesh
    mesh.count = activePuffs.length;
    for (let i = 0; i < activePuffs.length; i++) {
      const p = activePuffs[i];
      dummy.current.position.copy(p.position);
      dummy.current.rotation.set(0, p.rotation, p.rotation * 0.5);
      dummy.current.scale.set(p.scale, p.scale * 0.85, p.scale);
      dummy.current.updateMatrix();

      mesh.setMatrixAt(i, dummy.current.matrix);
      mesh.setColorAt(i, p.color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, MAX_PUFFS]}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial
          roughness={0.7}
          metalness={0.1}
          emissive="#52d43a"
          emissiveIntensity={0.25}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
