// ============================================================
// Fun Together — 3D Stylized Animal Characters (Bear, Hippo, Frog, Rhino)
// Animals sit on the circular flat raft holding handles facing inward,
// with their rears pointing outward toward the water.
// Each player can move around the tube to aim their fart in any direction!
// ============================================================
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlayerInfo } from '../store/gameStore';

export type AnimalType = 'bear' | 'hippo' | 'frog' | 'rhino';

interface CharacterProps {
  player: PlayerInfo;
}

const SEAT_CONFIG = [
  { defaultAngle: Math.PI, label: 'bear', name: 'Potatoplays', color: '#4A3525', accent: '#8D6E63' },
  { defaultAngle: Math.PI * 0.5, label: 'frog', name: 'hf', color: '#68BB59', accent: '#A0E474' },
  { defaultAngle: 0, label: 'hippo', name: 'Klurge', color: '#C67D5A', accent: '#EAA989' },
  { defaultAngle: -Math.PI * 0.5, label: 'rhino', name: 'GigaChonk', color: '#4A6B82', accent: '#82A3BA' },
];

/** Individual animal character sitting on the raft rim */
export function AnimalCharacter({ player }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const seat = SEAT_CONFIG[player.seatIndex % 4];
  const radius = 1.05;

  // Use the player's dynamic angle around the tube (defaulting to their seat angle)
  const angle = player.angleAroundTube ?? seat.defaultAngle;
  const posX = Math.sin(angle) * radius;
  const posZ = Math.cos(angle) * radius;

  // Face inward toward center of raft (rotation = angle + Math.PI)
  const facingY = angle + Math.PI;
  const shownName = player.displayName || seat.name;

  useFrame(({ clock }) => {
    if (!groupRef.current || !bodyRef.current) return;
    const t = clock.getElapsedTime();

    // Idle bobbing & sway
    groupRef.current.position.y = 0.28 + Math.sin(t * 3.5 + player.seatIndex * 1.5) * 0.025;

    // Fart reaction: comedic squash & stretch recoil!
    if (player.isFarting) {
      bodyRef.current.scale.set(1.15, 0.85, 1.25);
      bodyRef.current.rotation.x = Math.sin(t * 40) * 0.12;
    } else {
      bodyRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.15);
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, 0.15);
    }
  });

  if (!player.connected) return null;

  return (
    <group ref={groupRef} position={[posX, 0.28, posZ]} rotation={[0, facingY, 0]}>
      {/* Floating 3D Nametag */}
      <Html
        position={[0, 1.45, 0]}
        center
        distanceFactor={14}
        zIndexRange={[1, 5]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '13px',
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          padding: '2px 10px',
          borderRadius: '999px',
          border: `2px solid ${seat.color}`,
          whiteSpace: 'nowrap',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          letterSpacing: '0.5px',
        }}>
          {shownName}
        </div>
      </Html>

      {/* Character body */}
      <group ref={bodyRef}>
        {seat.label === 'bear' && <BearMesh color={seat.color} accent={seat.accent} />}
        {seat.label === 'hippo' && <HippoMesh color={seat.color} accent={seat.accent} />}
        {seat.label === 'frog' && <FrogMesh color={seat.color} accent={seat.accent} />}
        {seat.label === 'rhino' && <RhinoMesh color={seat.color} accent={seat.accent} />}
      </group>
    </group>
  );
}

// ── 1. The Bear ───────────────────────────────────────────────
function BearMesh({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.38, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.32, -0.15]} castShadow>
        <sphereGeometry args={[0.33, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.38, -0.42]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.82, 0.05]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.77, 0.28]} castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.84, 0.41]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a110b" roughness={0.4} />
      </mesh>
      <mesh position={[-0.22, 1.05, 0.05]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.22, 1.05, 0.05]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Arms gripping rim */}
      <mesh position={[-0.34, 0.46, 0.18]} rotation={[0.4, 0.2, 0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.32, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.34, 0.46, 0.18]} rotation={[0.4, -0.2, -0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.32, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ── 2. The Hippo ──────────────────────────────────────────────
function HippoMesh({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.36, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, -0.16]} castShadow>
        <sphereGeometry args={[0.34, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.78, 0.04]} castShadow>
        <sphereGeometry args={[0.29, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, 0.26]} castShadow>
        <boxGeometry args={[0.34, 0.24, 0.3]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh position={[-0.08, 0.8, 0.4]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#4a2e1d" roughness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.8, 0.4]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#4a2e1d" roughness={0.5} />
      </mesh>
      <mesh position={[-0.24, 0.98, -0.02]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.24, 0.98, -0.02]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.34, 0.44, 0.18]} rotation={[0.4, 0.2, 0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.34, 0.44, 0.18]} rotation={[0.4, -0.2, -0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── 3. The Frog ───────────────────────────────────────────────
function FrogMesh({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.33, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.28, -0.12]} castShadow>
        <sphereGeometry args={[0.31, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.74, 0.06]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[-0.16, 0.96, 0.12]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      <mesh position={[-0.16, 0.97, 0.2]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.16, 0.96, 0.12]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      <mesh position={[0.16, 0.97, 0.2]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[-0.32, 0.42, 0.18]} rotation={[0.4, 0.2, 0.3]} castShadow>
        <capsuleGeometry args={[0.09, 0.28, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0.32, 0.42, 0.18]} rotation={[0.4, -0.2, -0.3]} castShadow>
        <capsuleGeometry args={[0.09, 0.28, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
    </group>
  );
}

// ── 4. The Rhino ──────────────────────────────────────────────
function RhinoMesh({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.36, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.32, -0.15]} castShadow>
        <sphereGeometry args={[0.33, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, 0.05]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.88, 0.32]} rotation={[0.5, 0, 0]} castShadow>
        <coneGeometry args={[0.07, 0.22, 8]} />
        <meshStandardMaterial color={accent} roughness={0.4} />
      </mesh>
      <mesh position={[-0.34, 0.44, 0.18]} rotation={[0.4, 0.2, 0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.34, 0.44, 0.18]} rotation={[0.4, -0.2, -0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Renders only the actual players in the room */
export function BowlCrew({ players }: { players: PlayerInfo[] }) {
  // If no players yet, show local player
  const list = players.length > 0 ? players : [{
    id: 'local_player',
    displayName: 'You',
    seatIndex: 0,
    connected: true,
    isFarting: false,
    ready: true,
    fartCooldownMs: 0,
    angleAroundTube: Math.PI,
  }];

  return (
    <>
      {list.map((p) => (
        <AnimalCharacter key={p.id} player={p} />
      ))}
    </>
  );
}
