// ============================================================
// Fun Together — 3D Level Environment
// Modeled directly after the reference image:
// - Curved, rounded water flume that winds and meanders smoothly
// - Alternating purple & pink triangular bumpers following river curves
// - Circular orbiting hazards revolving along orbital paths
// - Huge wooden "START" gate with chunky yellow 3D letters and timer
// - Reddish canyon cliff borders with low-poly puffy trees & windmill
// - Glossy cyan water with foam wakes, checkpoints & finish gate
// ============================================================
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type ObstacleInfo } from '../store/gameStore';
import { LEVELS, getTrackCenterX } from '../shared/levels';
import type { LevelConfig, ObstacleConfig } from '../shared/levels';

// ── 1. The Signature "START" Wooden Arch & Timer Banner ──────
function StartArch({ x = 0, z = 0, width = 14 }: { x?: number; z?: number; width?: number }) {
  const postW = 0.8;
  const postH = 6.5;

  return (
    <group position={[x, 0, z]}>
      {/* Left Timber Post */}
      <mesh position={[-(width / 2 + 0.6), postH / 2, 0]} castShadow>
        <boxGeometry args={[postW, postH, postW]} />
        <meshStandardMaterial color="#8D5524" roughness={0.9} />
      </mesh>
      {/* Right Timber Post */}
      <mesh position={[(width / 2 + 0.6), postH / 2, 0]} castShadow>
        <boxGeometry args={[postW, postH, postW]} />
        <meshStandardMaterial color="#8D5524" roughness={0.9} />
      </mesh>

      {/* Crossbeam */}
      <mesh position={[0, postH - 0.2, 0]} castShadow>
        <boxGeometry args={[width + 2.5, 0.9, 0.8]} />
        <meshStandardMaterial color="#A26732" roughness={0.85} />
      </mesh>

      {/* Main Wooden Sign Board */}
      <mesh position={[0, postH + 0.8, 0]} castShadow>
        <boxGeometry args={[width * 0.75, 2.2, 0.4]} />
        <meshStandardMaterial color="#B07D48" roughness={0.8} />
      </mesh>

      {/* Yellow 3D Letters "S T A R T" facing approaching player */}
      <Html
        position={[0, postH + 0.85, -0.25]}
        center
        transform
        rotation={[0, Math.PI, 0]}
        distanceFactor={8}
        zIndexRange={[1, 6]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex',
          gap: '12px',
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontWeight: 900,
          fontSize: '72px',
          color: '#FFE600',
          textShadow: '0 4px 0 #D49000, 0 8px 16px rgba(0,0,0,0.7)',
          letterSpacing: '8px',
          userSelect: 'none',
        }}>
          START
        </div>
      </Html>

      {/* Yellow 3D Letters on reverse side */}
      <Html
        position={[0, postH + 0.85, 0.25]}
        center
        transform
        distanceFactor={8}
        zIndexRange={[1, 6]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex',
          gap: '12px',
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontWeight: 900,
          fontSize: '72px',
          color: '#FFE600',
          textShadow: '0 4px 0 #D49000, 0 8px 16px rgba(0,0,0,0.7)',
          letterSpacing: '8px',
          userSelect: 'none',
        }}>
          START
        </div>
      </Html>

      {/* Timer Banner overhead matching screenshot: [⏱ 01:23.39] */}
      <Html
        position={[0, postH + 2.3, -0.25]}
        center
        transform
        rotation={[0, Math.PI, 0]}
        distanceFactor={10}
        zIndexRange={[1, 6]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '2.5px solid #38BDF8',
          borderRadius: '10px',
          padding: '4px 20px',
          color: '#FFFFFF',
          fontFamily: "'Courier New', monospace, sans-serif",
          fontWeight: 900,
          fontSize: '22px',
          boxShadow: '0 4px 16px rgba(56, 189, 248, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
        }}>
          <span>⏱</span>
          <span>01:23.39</span>
        </div>
      </Html>
    </group>
  );
}

// ── 2. Curved & Rounded Water Flume Ribbon Generator ──────────
function buildCurvedRibbon(
  levelId: number,
  startZ: number,
  endZ: number,
  width: number,
  cols: number,
  yOffset: number,
  isTrough: boolean = false
): THREE.BufferGeometry {
  const hw = width / 2;
  const stepZ = 1.8;
  const rows = Math.ceil((endZ - startZ) / stepZ);
  const vertexCount = (rows + 1) * (cols + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  let v = 0;
  for (let r = 0; r <= rows; r++) {
    const z = Math.min(startZ + r * stepZ, endZ);
    const cX = getTrackCenterX(levelId, z);
    const vCoord = r / rows;

    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      // Scoop rounded curve across the flume: lower in the center (u=0.5)
      const arch = isTrough ? Math.sin(u * Math.PI) : 0;
      const x = cX - hw + u * (hw * 2);
      const y = yOffset - (isTrough ? 0.22 * arch : 0);

      positions[v * 3] = x;
      positions[v * 3 + 1] = y;
      positions[v * 3 + 2] = z;

      uvs[v * 2] = u;
      uvs[v * 2 + 1] = vCoord * (rows / 2);
      v++;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p1 = r * (cols + 1) + c;
      const p2 = p1 + 1;
      const p3 = (r + 1) * (cols + 1) + c;
      const p4 = p3 + 1;

      indices.push(p1, p3, p2);
      indices.push(p2, p3, p4);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ── 3. Canyon Cliff Ribbon Generator ──────────────────────────
function buildCliffRibbon(
  levelId: number,
  startZ: number,
  endZ: number,
  side: 'left' | 'right'
): THREE.BufferGeometry {
  const stepZ = 3.0;
  const rows = Math.ceil((endZ - startZ) / stepZ);
  const vertexCount = (rows + 1) * 3;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const sign = side === 'left' ? -1 : 1;
  const hw = 6.0;

  let v = 0;
  for (let r = 0; r <= rows; r++) {
    const z = Math.min(startZ + r * stepZ, endZ);
    const cX = getTrackCenterX(levelId, z);
    const vCoord = r / rows;

    // Inner rim
    positions[v * 3] = cX + sign * (hw + 0.1);
    positions[v * 3 + 1] = 0.9;
    positions[v * 3 + 2] = z;
    uvs[v * 2] = 0;
    uvs[v * 2 + 1] = vCoord * 10;
    v++;

    // Mid plateau
    positions[v * 3] = cX + sign * (hw + 4.5);
    positions[v * 3 + 1] = 2.2;
    positions[v * 3 + 2] = z;
    uvs[v * 2] = 0.5;
    uvs[v * 2 + 1] = vCoord * 10;
    v++;

    // Outer canyon peak
    positions[v * 3] = cX + sign * (hw + 20.0);
    positions[v * 3 + 1] = 7.5;
    positions[v * 3 + 2] = z;
    uvs[v * 2] = 1.0;
    uvs[v * 2 + 1] = vCoord * 10;
    v++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const p1 = r * 3 + c;
      const p2 = p1 + 1;
      const p3 = (r + 1) * 3 + c;
      const p4 = p3 + 1;

      if (side === 'left') {
        indices.push(p1, p2, p3);
        indices.push(p2, p4, p3);
      } else {
        indices.push(p1, p3, p2);
        indices.push(p2, p3, p4);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ── 4. Channel Flume with Purple/Pink Sawtooth Bumpers ────────
function WaterChannelFlume({ level }: { level: LevelConfig }) {
  const startZ = -10;
  const endZ = level.finishZ + 35;
  const channelWidth = 12;

  // Build curved ribbons
  const waterGeo = useMemo(
    () => buildCurvedRibbon(level.id, startZ, endZ, channelWidth, 8, -0.05, true),
    [level.id, endZ]
  );

  const bedGeo = useMemo(
    () => buildCurvedRibbon(level.id, startZ, endZ, channelWidth, 8, -0.75, true),
    [level.id, endZ]
  );

  const leftCliffGeo = useMemo(
    () => buildCliffRibbon(level.id, startZ, endZ, 'left'),
    [level.id, endZ]
  );

  const rightCliffGeo = useMemo(
    () => buildCliffRibbon(level.id, startZ, endZ, 'right'),
    [level.id, endZ]
  );

  // Generate sawtooth triangular bumper positions along both banks following river curves
  const bumpers = useMemo(() => {
    const list: {
      leftX: number;
      rightX: number;
      z: number;
      rotY: number;
      color: string;
    }[] = [];

    const step = 2.2;
    const hw = channelWidth / 2;

    for (let z = -5; z < endZ; z += step) {
      const cX = getTrackCenterX(level.id, z);
      const cXNext = getTrackCenterX(level.id, z + 0.4);
      const rotY = Math.atan2(cXNext - cX, 0.4);
      const color = Math.floor(z / step) % 2 === 0 ? '#7209B7' : '#F72585';

      list.push({
        leftX: cX - (hw - 0.2),
        rightX: cX + (hw - 0.2),
        z,
        rotY,
        color,
      });
    }
    return list;
  }, [level.id, endZ]);

  return (
    <group>
      {/* Curved Water Surface: Glossy Cyan Rounded Ribbon */}
      <mesh geometry={waterGeo}>
        <meshStandardMaterial
          color={level.environment.waterColor ?? '#00B4D8'}
          roughness={0.12}
          metalness={0.25}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Curved River Bed underneath */}
      <mesh geometry={bedGeo} receiveShadow>
        <meshStandardMaterial color="#0A4D68" roughness={0.95} />
      </mesh>

      {/* Reddish Desert Canyon Cliffs (Left & Right) following curves */}
      <mesh geometry={leftCliffGeo} receiveShadow>
        <meshStandardMaterial color={level.environment.bankColorL ?? '#D48366'} roughness={0.95} />
      </mesh>
      <mesh geometry={rightCliffGeo} receiveShadow>
        <meshStandardMaterial color={level.environment.bankColorR ?? '#C86D51'} roughness={0.95} />
      </mesh>

      {/* Purple & Pink Sawtooth Bumpers (Left Edge) */}
      {bumpers.map((b, i) => (
        <mesh
          key={`l_${i}`}
          position={[b.leftX, 0.45, b.z]}
          rotation={[0, b.rotY, -Math.PI / 4]}
          castShadow
        >
          <coneGeometry args={[0.42, 0.9, 4]} />
          <meshStandardMaterial color={b.color} roughness={0.5} />
        </mesh>
      ))}

      {/* Purple & Pink Sawtooth Bumpers (Right Edge) */}
      {bumpers.map((b, i) => (
        <mesh
          key={`r_${i}`}
          position={[b.rightX, 0.45, b.z]}
          rotation={[0, b.rotY, Math.PI / 4]}
          castShadow
        >
          <coneGeometry args={[0.42, 0.9, 4]} />
          <meshStandardMaterial color={b.color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ── 5. Stylized Low-Poly Trees ────────────────────────────────
function PuffyTree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 3.8, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.4, 8]} />
        <meshStandardMaterial color="#704828" roughness={1} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <dodecahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#38B000" roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 2.1, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#70E000" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── 6. Windmill in background matching screenshot ─────────────
function Windmill({ x, z }: { x: number; z: number }) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (bladesRef.current) {
      bladesRef.current.rotation.z += delta * 1.5;
    }
  });

  return (
    <group position={[x, 4.0, z]}>
      {/* Tower */}
      <mesh castShadow>
        <cylinderGeometry args={[0.8, 1.4, 6, 8]} />
        <meshStandardMaterial color="#F2E9E4" roughness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.6, 0]} castShadow>
        <coneGeometry args={[1.1, 1.6, 8]} />
        <meshStandardMaterial color="#C1121F" roughness={0.7} />
      </mesh>
      {/* Blades */}
      <group ref={bladesRef} position={[0, 2.8, 1.0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 1.2, 0]}>
            <boxGeometry args={[0.35, 2.4, 0.05]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── 7. Obstacles (Barrels, Rocks, Circular Orbiting Hazards, Spinning Gates) ──
function ObstacleMesh({
  obs,
  levelId,
}: {
  obs: ObstacleInfo & { config: ObstacleConfig };
  levelId: number;
}) {
  const { config } = obs;

  switch (config.kind) {
    // ── Circular Orbiting Hazard: Spiked Naval Mine / Buoy ──
    case 'orbiting_hazard': {
      const orbitR = config.orbitRadius ?? 2.5;
      const trackBaseX = getTrackCenterX(levelId, config.z) + config.x;

      return (
        <group>
          {/* Orbital Motion Circular Guide Track on the Water */}
          <mesh position={[trackBaseX, 0.04, config.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[orbitR - 0.08, orbitR + 0.08, 48]} />
            <meshBasicMaterial color="#FF5400" transparent opacity={0.35} />
          </mesh>

          {/* Orbiting Spiked Marine Hazard Buoy */}
          <group position={[obs.x, 0.75, obs.z]} rotation={[0, obs.rotation ?? 0, 0]}>
            {/* Central Buoy Sphere */}
            <mesh castShadow>
              <sphereGeometry args={[config.radius ?? 1.1, 16, 16]} />
              <meshStandardMaterial color="#D90429" roughness={0.35} metalness={0.4} />
            </mesh>

            {/* Warning Stripes Ring */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry
                args={[(config.radius ?? 1.1) + 0.04, (config.radius ?? 1.1) + 0.04, 0.45, 16]}
              />
              <meshStandardMaterial color="#FFD166" roughness={0.4} />
            </mesh>

            {/* 6 Spikes around the equator */}
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const ang = (idx * Math.PI) / 3;
              return (
                <mesh
                  key={idx}
                  position={[
                    Math.cos(ang) * (config.radius ?? 1.1),
                    0,
                    Math.sin(ang) * (config.radius ?? 1.1),
                  ]}
                  rotation={[Math.PI / 2, 0, -ang + Math.PI / 2]}
                  castShadow
                >
                  <coneGeometry args={[0.22, 0.65, 8]} />
                  <meshStandardMaterial color="#2B2D42" roughness={0.5} metalness={0.7} />
                </mesh>
              );
            })}

            {/* Top Warning Beacon */}
            <mesh position={[0, (config.radius ?? 1.1) + 0.35, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.4, 8]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            <mesh position={[0, (config.radius ?? 1.1) + 0.65, 0]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#FF0055" emissive="#FF0055" emissiveIntensity={0.8} />
            </mesh>

            {/* Swirling Water Foam Ring */}
            <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.8, 1.4, 24]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.35} />
            </mesh>
          </group>
        </group>
      );
    }

    case 'static_barrel':
      return (
        <group position={[obs.x, 0.6, obs.z]}>
          <mesh castShadow>
            <cylinderGeometry args={[config.radius ?? 0.6, config.radius ?? 0.6, 1.2, 16]} />
            <meshStandardMaterial color="#FF3333" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry
              args={[(config.radius ?? 0.6) + 0.05, (config.radius ?? 0.6) + 0.05, 0.08, 16]}
            />
            <meshStandardMaterial color="#FFEE55" roughness={0.4} />
          </mesh>
        </group>
      );

    case 'static_rock':
      return (
        <mesh position={[obs.x, 0.5, obs.z]} castShadow rotation={[0.4, obs.x, 0.2]}>
          <dodecahedronGeometry args={[config.radius ?? 1.2]} />
          <meshStandardMaterial color="#7F7F7F" roughness={0.95} />
        </mesh>
      );

    case 'spinning_gate':
      return (
        <group position={[obs.x, 1.0, obs.z]} rotation={[0, obs.rotation ?? 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[config.width ?? 8, 0.35, 0.35]} />
            <meshStandardMaterial
              color="#FF9F1C"
              roughness={0.4}
              emissive="#FF9F1C"
              emissiveIntensity={0.25}
            />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 1.4, 8]} />
            <meshStandardMaterial color="#4A4E69" roughness={0.7} />
          </mesh>
        </group>
      );

    case 'moving_barrier':
      return (
        <group position={[obs.x, 0.8, obs.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 1.6, 0.6]} />
            <meshStandardMaterial
              color="#E63946"
              roughness={0.4}
              emissive="#E63946"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      );

    case 'gate_pair':
    case 'narrow_passage':
      return (
        <group position={[obs.x, 0, obs.z]}>
          <mesh position={[-(config.width ?? 5) / 2 - 0.4, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 2.4, 8]} />
            <meshStandardMaterial color="#2EC4B6" emissive="#2EC4B6" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[(config.width ?? 5) / 2 + 0.4, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 2.4, 8]} />
            <meshStandardMaterial color="#2EC4B6" emissive="#2EC4B6" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[config.width ?? 5, 0.2, 0.1]} />
            <meshStandardMaterial color="#CBF3F0" transparent opacity={0.8} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

// ── 8. Checkpoints & Finish Line ──────────────────────────────
function CheckpointArch({ x, z, width }: { x: number; z: number; width: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-(width / 2 + 0.2), 2, 0]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[(width / 2 + 0.2), 2, 0]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[width + 0.8, 0.35, 0.3]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function FinishGate({ x = 0, z = 0, width = 12 }: { x?: number; z?: number; width?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-(width / 2 + 0.5), 3, 0]} castShadow>
        <boxGeometry args={[0.6, 6, 0.6]} />
        <meshStandardMaterial color="#EF476F" emissive="#EF476F" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[(width / 2 + 0.5), 3, 0]} castShadow>
        <boxGeometry args={[0.6, 6, 0.6]} />
        <meshStandardMaterial color="#EF476F" emissive="#EF476F" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 6.3, 0]}>
        <boxGeometry args={[width + 2, 0.6, 0.6]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.4} />
      </mesh>
      {/* Checkered pattern */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + i * (width / 9), 5.7, 0]}>
          <boxGeometry args={[width / 10 - 0.05, 0.9, 0.15]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#FFFFFF' : '#111111'} />
        </mesh>
      ))}
    </group>
  );
}

// ── 9. Full Level Scene Assembler ─────────────────────────────
export function LevelScene() {
  const { levelId, obstacles } = useGameStore();
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];

  const obsWithConfig = obstacles.map((o: ObstacleInfo, i: number) => ({
    ...o,
    config: level.obstacles[i] ?? level.obstacles[0],
  }));

  // Cliffside tree positions following the curved canyon
  const trees = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    for (let z = 15; z < level.finishZ; z += 20) {
      const cX = getTrackCenterX(level.id, z);
      list.push({ x: cX - (11 + Math.random() * 3), z: z + Math.random() * 6 });
      list.push({ x: cX + (11 + Math.random() * 3), z: z + Math.random() * 6 });
    }
    return list;
  }, [level.id, level.finishZ]);

  const startX = getTrackCenterX(level.id, 22);
  const finishX = getTrackCenterX(level.id, level.finishZ);
  const windmillX = getTrackCenterX(level.id, 35) - 16;

  return (
    <group>
      {/* The Iconic Wooden START Gate */}
      <StartArch x={startX} z={22} width={12} />

      {/* Curved Water Slide Flume & Banks */}
      <WaterChannelFlume level={level} />

      {/* Distant Windmill on the curved canyon rim */}
      <Windmill x={windmillX} z={35} />

      {/* Puffy Trees on Canyon Top */}
      {trees.map((t, i) => (
        <PuffyTree key={i} x={t.x} z={t.z} />
      ))}

      {/* Obstacles (Animated Circular Orbiting Hazards, Spinning Gates, Barrels, Rocks) */}
      {obsWithConfig.map((o) => (
        <ObstacleMesh key={o.id} obs={o} levelId={level.id} />
      ))}

      {/* Checkpoint Arches positioned along curved centerline */}
      {level.checkpoints.map((cp) => (
        <CheckpointArch
          key={cp.id}
          x={getTrackCenterX(level.id, cp.z) + cp.x}
          z={cp.z}
          width={cp.width}
        />
      ))}

      {/* Finish Arch positioned at end of curved river */}
      <FinishGate x={finishX} z={level.finishZ} width={12} />
    </group>
  );
}
