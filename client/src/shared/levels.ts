// ============================================================
// Fun Together — Level Configurations (client-side)
// Supports curved winding tracks and circular orbiting hazards
// ============================================================

export type ObstacleKind =
  | 'static_barrel'
  | 'static_rock'
  | 'spinning_gate'
  | 'moving_barrier'
  | 'orbiting_hazard'
  | 'gate_pair'
  | 'narrow_passage';

export interface ObstacleConfig {
  id: string;
  kind: ObstacleKind;
  x: number;
  z: number;
  rotation?: number;
  spinSpeed?: number;
  moveRange?: number;
  moveSpeed?: number;
  moveAxis?: 'x' | 'z';
  radius?: number;
  width?: number;
  height?: number;
  orbitRadius?: number;   // Radius of circular orbit motion
  orbitSpeed?: number;    // Speed of circular revolution (rad/s)
  orbitPhase?: number;    // Starting angle of orbit
}

export interface CheckpointConfig {
  id: string;
  x: number;
  z: number;
  width: number;
  angle?: number;
}

export interface ChannelSegment {
  type: 'straight' | 'curve_left' | 'curve_right' | 'wide' | 'narrow';
  length: number;
  width: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  spawnPosition: { x: number; z: number };
  spawnAngle: number;
  finishZ: number;
  maxTime: number;
  maxSpeed: number;
  segments: ChannelSegment[];
  obstacles: ObstacleConfig[];
  checkpoints: CheckpointConfig[];
  environment: {
    skyColor: string;
    waterColor: string;
    bankColorL: string;
    bankColorR: string;
    fogNear: number;
    fogFar: number;
    ambientIntensity: number;
  };
}

/** Computes the curved winding track centerline X coordinate for any given Z */
export function getTrackCenterX(levelId: number, z: number): number {
  if (z <= 15) return 0; // Straight around spawn
  const dist = z - 15;
  switch (levelId) {
    case 1:
      // Gentle pleasant meandering S-curves
      return Math.sin(dist * 0.032) * 3.2;
    case 2:
      // Deeper winding turns
      return Math.sin(dist * 0.038) * 4.6 + Math.sin(dist * 0.015) * 1.8;
    case 3:
      // Slalom S-curves
      return Math.sin(dist * 0.048) * 5.4;
    case 4:
      // Wild torrent with tight chicanes
      return Math.sin(dist * 0.045) * 5.0 + Math.sin(dist * 0.08) * 2.5;
    case 5:
      // Epic grand canyon serpentine rapids
      return Math.sin(dist * 0.05) * 6.0 + Math.sin(dist * 0.11) * 2.2;
    default:
      return Math.sin(dist * 0.035) * 3.5;
  }
}

// ── LEVEL 1: The First Flush (Gentle curves, first circular orbiting hazard) ──
const LEVEL_1: LevelConfig = {
  id: 1,
  name: 'The First Flush',
  description: 'A gentle introduction with winding river curves and revolving buoys.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 270,
  maxTime: 180,
  maxSpeed: 12,
  segments: [],
  obstacles: [
    // Placed well past the START arch (z=22) and off to the sides near the banks
    { id: 'l1_b1', kind: 'static_barrel', x: 3.4, z: 60, radius: 0.55 },
    { id: 'l1_b2', kind: 'static_barrel', x: -3.4, z: 90, radius: 0.55 },
    // First circular motion hazard! Slowly sweeps in a circle with plenty of room
    { id: 'l1_orb1', kind: 'orbiting_hazard', x: 0, z: 125, radius: 0.7, orbitRadius: 2.0, orbitSpeed: 1.1, orbitPhase: 0 },
    { id: 'l1_r1', kind: 'static_rock', x: 3.3, z: 165, radius: 0.75 },
    { id: 'l1_b3', kind: 'static_barrel', x: -3.3, z: 195, radius: 0.55 },
    // Second circular motion hazard before finish
    { id: 'l1_orb2', kind: 'orbiting_hazard', x: 0, z: 225, radius: 0.7, orbitRadius: 2.2, orbitSpeed: -1.3, orbitPhase: Math.PI },
    { id: 'l1_g1', kind: 'gate_pair', x: 0, z: 248, width: 7.2, radius: 0.35 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 110, width: 12 },
    { id: 'cp2', x: 0, z: 210, width: 12 },
  ],
  environment: {
    skyColor: '#6EC6FF',
    waterColor: '#00B4D8',
    bankColorL: '#55A630',
    bankColorR: '#55A630',
    fogNear: 80,
    fogFar: 220,
    ambientIntensity: 0.9,
  },
};

// ── LEVEL 2: The Twisting Rapids (Deeper curves & interlocking circular hazards) ──
const LEVEL_2: LevelConfig = {
  id: 2,
  name: 'The Twisting Rapids',
  description: 'Sharper bends with double circular hazards orbiting in opposite directions!',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 330,
  maxTime: 200,
  maxSpeed: 13,
  segments: [],
  obstacles: [
    { id: 'l2_r1', kind: 'static_rock', x: -3.3, z: 65, radius: 0.75 },
    // Dual circular hazards circling in counter directions
    { id: 'l2_orb1', kind: 'orbiting_hazard', x: -1.8, z: 100, radius: 0.7, orbitRadius: 1.8, orbitSpeed: 1.4, orbitPhase: 0 },
    { id: 'l2_orb2', kind: 'orbiting_hazard', x: 1.8, z: 100, radius: 0.7, orbitRadius: 1.8, orbitSpeed: -1.4, orbitPhase: Math.PI },
    { id: 'l2_b1', kind: 'static_barrel', x: 3.3, z: 140, radius: 0.55 },
    { id: 'l2_g1', kind: 'gate_pair', x: 0, z: 175, width: 6.8, radius: 0.35 },
    { id: 'l2_orb3', kind: 'orbiting_hazard', x: 0, z: 215, radius: 0.75, orbitRadius: 2.4, orbitSpeed: 1.6, orbitPhase: 0.5 },
    { id: 'l2_r2', kind: 'static_rock', x: -3.2, z: 255, radius: 0.75 },
    { id: 'l2_orb4', kind: 'orbiting_hazard', x: 0, z: 285, radius: 0.75, orbitRadius: 2.2, orbitSpeed: -1.8, orbitPhase: 1.0 },
    { id: 'l2_g2', kind: 'gate_pair', x: 0, z: 310, width: 6.5, radius: 0.35 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 95, width: 11 },
    { id: 'cp2', x: 0, z: 195, width: 10 },
    { id: 'cp3', x: 0, z: 280, width: 11 },
  ],
  environment: {
    skyColor: '#58B4D1',
    waterColor: '#0096C7',
    bankColorL: '#38B000',
    bankColorR: '#2D6A4F',
    fogNear: 70,
    fogFar: 200,
    ambientIntensity: 0.85,
  },
};

// ── LEVEL 3: The Whirlpool Churn (Slalom bends, spinning gates, and orbiting sweepers) ──
const LEVEL_3: LevelConfig = {
  id: 3,
  name: 'The Whirlpool Churn',
  description: 'Fast circular sweepers and revolving gates inside winding S-curves.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 380,
  maxTime: 230,
  maxSpeed: 14,
  segments: [],
  obstacles: [
    { id: 'l3_sg1', kind: 'spinning_gate', x: 0, z: 65, spinSpeed: 1.1, width: 8.0, radius: 0.35 },
    { id: 'l3_orb1', kind: 'orbiting_hazard', x: 0, z: 105, radius: 0.75, orbitRadius: 2.5, orbitSpeed: 1.8, orbitPhase: 0 },
    { id: 'l3_r1', kind: 'static_rock', x: -3.4, z: 145, radius: 0.75 },
    { id: 'l3_sg2', kind: 'spinning_gate', x: 0, z: 185, spinSpeed: -1.3, width: 7.8, radius: 0.35 },
    { id: 'l3_orb2', kind: 'orbiting_hazard', x: -2.0, z: 225, radius: 0.7, orbitRadius: 1.8, orbitSpeed: 1.8, orbitPhase: 0 },
    { id: 'l3_orb3', kind: 'orbiting_hazard', x: 2.0, z: 225, radius: 0.7, orbitRadius: 1.8, orbitSpeed: -1.8, orbitPhase: Math.PI },
    { id: 'l3_mb1', kind: 'moving_barrier', x: 0, z: 265, moveRange: 3.2, moveSpeed: 2.0, moveAxis: 'x', radius: 0.5 },
    { id: 'l3_orb4', kind: 'orbiting_hazard', x: 0, z: 310, radius: 0.75, orbitRadius: 2.6, orbitSpeed: 2.0, orbitPhase: 1.2 },
    { id: 'l3_sg3', kind: 'spinning_gate', x: 0, z: 350, spinSpeed: 1.8, width: 8.0, radius: 0.35 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 105, width: 11 },
    { id: 'cp2', x: 0, z: 215, width: 10 },
    { id: 'cp3', x: 0, z: 310, width: 10 },
  ],
  environment: {
    skyColor: '#E0AAFF',
    waterColor: '#0077B6',
    bankColorL: '#7B2CBF',
    bankColorR: '#5A189A',
    fogNear: 65,
    fogFar: 180,
    ambientIntensity: 0.85,
  },
};

// ── LEVEL 4: The Wild Torrent (High-speed torrent with tight chicane bends) ──
const LEVEL_4: LevelConfig = {
  id: 4,
  name: 'The Wild Torrent',
  description: 'Fierce rapids with double circular hazard pairs and swinging barriers!',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 440,
  maxTime: 250,
  maxSpeed: 15,
  segments: [],
  obstacles: [
    { id: 'l4_orb1', kind: 'orbiting_hazard', x: 0, z: 65, radius: 0.75, orbitRadius: 2.5, orbitSpeed: 2.0, orbitPhase: 0 },
    { id: 'l4_sg1', kind: 'spinning_gate', x: 0, z: 105, spinSpeed: 2.0, width: 8.5, radius: 0.35 },
    { id: 'l4_r1', kind: 'static_rock', x: 3.2, z: 145, radius: 0.8 },
    { id: 'l4_orb2', kind: 'orbiting_hazard', x: -2.0, z: 185, radius: 0.7, orbitRadius: 1.8, orbitSpeed: 2.2, orbitPhase: 0 },
    { id: 'l4_orb3', kind: 'orbiting_hazard', x: 2.0, z: 185, radius: 0.7, orbitRadius: 1.8, orbitSpeed: -2.2, orbitPhase: Math.PI },
    { id: 'l4_mb1', kind: 'moving_barrier', x: 0, z: 230, moveRange: 3.5, moveSpeed: 2.5, moveAxis: 'x', radius: 0.5 },
    { id: 'l4_sg2', kind: 'spinning_gate', x: 0, z: 275, spinSpeed: -2.2, width: 8.0, radius: 0.35 },
    { id: 'l4_orb4', kind: 'orbiting_hazard', x: 0, z: 320, radius: 0.8, orbitRadius: 2.6, orbitSpeed: 2.4, orbitPhase: 0.8 },
    { id: 'l4_r2', kind: 'static_rock', x: -3.2, z: 360, radius: 0.8 },
    { id: 'l4_orb5', kind: 'orbiting_hazard', x: 0, z: 395, radius: 0.75, orbitRadius: 2.4, orbitSpeed: -2.5, orbitPhase: 0 },
    { id: 'l4_g1', kind: 'gate_pair', x: 0, z: 420, width: 6.2, radius: 0.35 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 100, width: 10 },
    { id: 'cp2', x: 0, z: 220, width: 9 },
    { id: 'cp3', x: 0, z: 350, width: 10 },
  ],
  environment: {
    skyColor: '#FF9E00',
    waterColor: '#023E8A',
    bankColorL: '#9A031E',
    bankColorR: '#5F0F40',
    fogNear: 55,
    fogFar: 160,
    ambientIntensity: 0.8,
  },
};

// ── LEVEL 5: The Grand Finale — The Ultimate Flush (Epic winding canyon rapids) ──
const LEVEL_5: LevelConfig = {
  id: 5,
  name: 'The Ultimate Flush',
  description: 'The ultimate river course! Serpentine turns, 6 revolving hazard clusters, and glory!',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 550,
  maxTime: 320,
  maxSpeed: 16,
  segments: [],
  obstacles: [
    { id: 'l5_orb1', kind: 'orbiting_hazard', x: 0, z: 65, radius: 0.8, orbitRadius: 2.6, orbitSpeed: 2.2, orbitPhase: 0 },
    { id: 'l5_sg1', kind: 'spinning_gate', x: 0, z: 105, spinSpeed: 2.2, width: 8.8, radius: 0.35 },
    // Triple revolving buoy constellation
    { id: 'l5_orb2', kind: 'orbiting_hazard', x: -2.0, z: 150, radius: 0.7, orbitRadius: 1.8, orbitSpeed: 2.5, orbitPhase: 0 },
    { id: 'l5_orb3', kind: 'orbiting_hazard', x: 2.0, z: 150, radius: 0.7, orbitRadius: 1.8, orbitSpeed: -2.5, orbitPhase: Math.PI },
    { id: 'l5_mb1', kind: 'moving_barrier', x: 0, z: 195, moveRange: 3.8, moveSpeed: 2.8, moveAxis: 'x', radius: 0.5 },
    { id: 'l5_sg2', kind: 'spinning_gate', x: 0, z: 240, spinSpeed: -2.5, width: 8.5, radius: 0.35 },
    { id: 'l5_orb4', kind: 'orbiting_hazard', x: 0, z: 285, radius: 0.8, orbitRadius: 2.8, orbitSpeed: 2.6, orbitPhase: 1.5 },
    { id: 'l5_r1', kind: 'static_rock', x: 3.2, z: 330, radius: 0.9 },
    { id: 'l5_orb5', kind: 'orbiting_hazard', x: -1.8, z: 375, radius: 0.75, orbitRadius: 2.2, orbitSpeed: -2.8, orbitPhase: 0 },
    { id: 'l5_orb6', kind: 'orbiting_hazard', x: 1.8, z: 375, radius: 0.75, orbitRadius: 2.2, orbitSpeed: 2.8, orbitPhase: Math.PI },
    { id: 'l5_sg3', kind: 'spinning_gate', x: 0, z: 425, spinSpeed: 2.8, width: 8.5, radius: 0.35 },
    { id: 'l5_mb2', kind: 'moving_barrier', x: 0, z: 475, moveRange: 4.0, moveSpeed: 3.0, moveAxis: 'x', radius: 0.5 },
    { id: 'l5_g1', kind: 'gate_pair', x: 0, z: 515, width: 6.2, radius: 0.35 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 110, width: 12 },
    { id: 'cp2', x: 0, z: 230, width: 10 },
    { id: 'cp3', x: 0, z: 360, width: 10 },
    { id: 'cp4', x: 0, z: 470, width: 11 },
  ],
  environment: {
    skyColor: '#D90429',
    waterColor: '#03045E',
    bankColorL: '#2B2D42',
    bankColorR: '#8D99AE',
    fogNear: 50,
    fogFar: 150,
    ambientIntensity: 0.85,
  },
};

export const LEVELS: LevelConfig[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];

export function getLevelById(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}
