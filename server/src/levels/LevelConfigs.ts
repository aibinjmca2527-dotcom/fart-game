// ============================================================
// Fun Together — Level Configurations
// ============================================================
export type ObstacleKind =
  | 'static_barrel'
  | 'static_rock'
  | 'spinning_gate'
  | 'moving_barrier'
  | 'gate_pair'
  | 'narrow_passage';

export interface ObstacleConfig {
  id: string;
  kind: ObstacleKind;
  x: number;          // world X
  z: number;          // world Z (forward axis)
  rotation?: number;  // initial yaw radians
  spinSpeed?: number; // rad/s for spinning obstacles
  moveRange?: number; // units for moving obstacles
  moveSpeed?: number; // units/s
  moveAxis?: 'x' | 'z';
  radius?: number;    // collision radius
  width?: number;     // for gate/passage
  height?: number;
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
  spawnAngle: number;       // radians
  finishZ: number;          // z-coordinate of finish line
  maxTime: number;          // seconds
  maxSpeed: number;         // override PHYSICS.MAX_SPEED
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
  tutorial?: {
    hints: string[];
    hintTriggerZ: number[];
  };
}

// ============================================================
// LEVEL 1 — THE FIRST FLUSH
// ============================================================
const LEVEL_1: LevelConfig = {
  id: 1,
  name: 'The First Flush',
  description: 'A gentle introduction to fart-powered propulsion.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 260,
  maxTime: 180,
  maxSpeed: 10,
  segments: [
    { type: 'straight', length: 60, width: 14 },
    { type: 'curve_right', length: 40, width: 14 },
    { type: 'straight', length: 60, width: 14 },
    { type: 'curve_left', length: 40, width: 14 },
    { type: 'straight', length: 60, width: 14 },
  ],
  obstacles: [
    { id: 'l1_b1', kind: 'static_barrel', x: 2, z: 40, radius: 1.2 },
    { id: 'l1_b2', kind: 'static_barrel', x: -2, z: 55, radius: 1.2 },
    { id: 'l1_r1', kind: 'static_rock', x: 0, z: 90, radius: 1.5 },
    { id: 'l1_b3', kind: 'static_barrel', x: 3, z: 130, radius: 1.2 },
    { id: 'l1_b4', kind: 'static_barrel', x: -3, z: 145, radius: 1.2 },
    { id: 'l1_b5', kind: 'static_barrel', x: 0, z: 160, radius: 1.2 },
    { id: 'l1_g1', kind: 'gate_pair', x: 0, z: 200, width: 6, radius: 0.5 },
    { id: 'l1_g2', kind: 'gate_pair', x: 0, z: 230, width: 5, radius: 0.5 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 100, width: 12 },
    { id: 'cp2', x: 0, z: 200, width: 12 },
  ],
  environment: {
    skyColor: '#87CEEB',
    waterColor: '#1E90FF',
    bankColorL: '#228B22',
    bankColorR: '#228B22',
    fogNear: 80,
    fogFar: 200,
    ambientIntensity: 0.8,
  },
  tutorial: {
    hints: [
      'Press the FART button to propel the bowl!',
      'Each player\'s position affects the direction!',
      'Coordinate bursts to steer through gates!',
    ],
    hintTriggerZ: [10, 50, 100],
  },
};

// ============================================================
// LEVEL 2 — THE TWISTING CHANNEL
// ============================================================
const LEVEL_2: LevelConfig = {
  id: 2,
  name: 'The Twisting Channel',
  description: 'Sharper bends and narrower passages demand real coordination.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 340,
  maxTime: 210,
  maxSpeed: 11,
  segments: [
    { type: 'straight', length: 30, width: 12 },
    { type: 'curve_right', length: 50, width: 10 },
    { type: 'narrow', length: 40, width: 7 },
    { type: 'curve_left', length: 50, width: 10 },
    { type: 'straight', length: 30, width: 12 },
    { type: 'curve_right', length: 50, width: 9 },
    { type: 'narrow', length: 30, width: 6 },
    { type: 'curve_left', length: 50, width: 10 },
    { type: 'straight', length: 30, width: 12 },
  ],
  obstacles: [
    { id: 'l2_r1', kind: 'static_rock', x: -2, z: 45, radius: 1.5 },
    { id: 'l2_r2', kind: 'static_rock', x: 2, z: 60, radius: 1.5 },
    { id: 'l2_b1', kind: 'static_barrel', x: 0, z: 80, radius: 1.2 },
    { id: 'l2_b2', kind: 'static_barrel', x: 2.5, z: 95, radius: 1.2 },
    { id: 'l2_b3', kind: 'static_barrel', x: -2.5, z: 110, radius: 1.2 },
    { id: 'l2_g1', kind: 'gate_pair', x: 0, z: 140, width: 5, radius: 0.5 },
    { id: 'l2_r3', kind: 'static_rock', x: 1, z: 175, radius: 1.8 },
    { id: 'l2_r4', kind: 'static_rock', x: -2, z: 190, radius: 1.5 },
    { id: 'l2_b4', kind: 'static_barrel', x: 3, z: 220, radius: 1.2 },
    { id: 'l2_b5', kind: 'static_barrel', x: -1, z: 235, radius: 1.2 },
    { id: 'l2_g2', kind: 'gate_pair', x: 0, z: 270, width: 4.5, radius: 0.5 },
    { id: 'l2_r5', kind: 'static_rock', x: 0, z: 300, radius: 2 },
    { id: 'l2_g3', kind: 'gate_pair', x: 0, z: 320, width: 5, radius: 0.5 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 90, width: 10 },
    { id: 'cp2', x: 0, z: 190, width: 8 },
    { id: 'cp3', x: 0, z: 280, width: 10 },
  ],
  environment: {
    skyColor: '#6ab0dc',
    waterColor: '#1a7acc',
    bankColorL: '#2d6a1f',
    bankColorR: '#3a8a22',
    fogNear: 70,
    fogFar: 180,
    ambientIntensity: 0.75,
  },
};

// ============================================================
// LEVEL 3 — THE MOVING GATES
// ============================================================
const LEVEL_3: LevelConfig = {
  id: 3,
  name: 'The Moving Gates',
  description: 'Spinning barriers and timed gates require split-second coordination.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 380,
  maxTime: 240,
  maxSpeed: 12,
  segments: [
    { type: 'straight', length: 40, width: 13 },
    { type: 'curve_right', length: 60, width: 11 },
    { type: 'straight', length: 50, width: 10 },
    { type: 'curve_left', length: 60, width: 10 },
    { type: 'narrow', length: 30, width: 6 },
    { type: 'straight', length: 40, width: 12 },
    { type: 'curve_right', length: 60, width: 11 },
    { type: 'straight', length: 40, width: 12 },
  ],
  obstacles: [
    { id: 'l3_sg1', kind: 'spinning_gate', x: 0, z: 50, spinSpeed: 0.8, width: 8, radius: 0.5 },
    { id: 'l3_r1', kind: 'static_rock', x: 2, z: 80, radius: 1.5 },
    { id: 'l3_mb1', kind: 'moving_barrier', x: 0, z: 110, moveRange: 3.5, moveSpeed: 1.5, moveAxis: 'x', radius: 1.2 },
    { id: 'l3_sg2', kind: 'spinning_gate', x: 0, z: 150, spinSpeed: 1.2, width: 9, radius: 0.5 },
    { id: 'l3_b1', kind: 'static_barrel', x: -2, z: 180, radius: 1.2 },
    { id: 'l3_b2', kind: 'static_barrel', x: 2, z: 195, radius: 1.2 },
    { id: 'l3_mb2', kind: 'moving_barrier', x: 0, z: 220, moveRange: 4, moveSpeed: 2, moveAxis: 'x', radius: 1.2 },
    { id: 'l3_mb3', kind: 'moving_barrier', x: 0, z: 240, moveRange: 3, moveSpeed: 1.8, moveAxis: 'x', radius: 1.2 },
    { id: 'l3_np1', kind: 'narrow_passage', x: 0, z: 270, width: 5, radius: 0.5 },
    { id: 'l3_sg3', kind: 'spinning_gate', x: 0, z: 310, spinSpeed: 1.5, width: 8, radius: 0.5 },
    { id: 'l3_r2', kind: 'static_rock', x: -1, z: 340, radius: 1.8 },
    { id: 'l3_g1', kind: 'gate_pair', x: 0, z: 360, width: 4, radius: 0.5 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 100, width: 11 },
    { id: 'cp2', x: 0, z: 210, width: 9 },
    { id: 'cp3', x: 0, z: 310, width: 11 },
  ],
  environment: {
    skyColor: '#e8c56a',
    waterColor: '#1572b0',
    bankColorL: '#1a5c12',
    bankColorR: '#cc6622',
    fogNear: 60,
    fogFar: 160,
    ambientIntensity: 0.85,
  },
};

// ============================================================
// LEVEL 4 — THE WILD WATERWAY
// ============================================================
const LEVEL_4: LevelConfig = {
  id: 4,
  name: 'The Wild Waterway',
  description: 'Fast currents, tight corners and relentless obstacles.',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 440,
  maxTime: 270,
  maxSpeed: 14,
  segments: [
    { type: 'straight', length: 30, width: 12 },
    { type: 'curve_right', length: 70, width: 9 },
    { type: 'narrow', length: 40, width: 5 },
    { type: 'curve_left', length: 70, width: 9 },
    { type: 'straight', length: 30, width: 11 },
    { type: 'curve_right', length: 70, width: 8 },
    { type: 'narrow', length: 30, width: 5 },
    { type: 'curve_left', length: 70, width: 9 },
    { type: 'straight', length: 30, width: 12 },
  ],
  obstacles: [
    { id: 'l4_sg1', kind: 'spinning_gate', x: 0, z: 40, spinSpeed: 2.0, width: 9, radius: 0.5 },
    { id: 'l4_mb1', kind: 'moving_barrier', x: 0, z: 60, moveRange: 4, moveSpeed: 2.5, moveAxis: 'x', radius: 1.2 },
    { id: 'l4_r1', kind: 'static_rock', x: 1.5, z: 85, radius: 1.8 },
    { id: 'l4_r2', kind: 'static_rock', x: -1.5, z: 100, radius: 1.5 },
    { id: 'l4_sg2', kind: 'spinning_gate', x: 0, z: 130, spinSpeed: 2.5, width: 8, radius: 0.5 },
    { id: 'l4_mb2', kind: 'moving_barrier', x: 0, z: 160, moveRange: 3.5, moveSpeed: 3, moveAxis: 'x', radius: 1.2 },
    { id: 'l4_mb3', kind: 'moving_barrier', x: 2, z: 175, moveRange: 3, moveSpeed: 2.8, moveAxis: 'x', radius: 1.2 },
    { id: 'l4_np1', kind: 'narrow_passage', x: 0, z: 200, width: 4.5, radius: 0.5 },
    { id: 'l4_sg3', kind: 'spinning_gate', x: 0, z: 240, spinSpeed: 3.0, width: 9, radius: 0.5 },
    { id: 'l4_r3', kind: 'static_rock', x: 0, z: 280, radius: 2 },
    { id: 'l4_mb4', kind: 'moving_barrier', x: 0, z: 310, moveRange: 4.5, moveSpeed: 3.5, moveAxis: 'x', radius: 1.2 },
    { id: 'l4_b1', kind: 'static_barrel', x: -2, z: 340, radius: 1.2 },
    { id: 'l4_b2', kind: 'static_barrel', x: 2, z: 355, radius: 1.2 },
    { id: 'l4_sg4', kind: 'spinning_gate', x: 0, z: 390, spinSpeed: 2.8, width: 8, radius: 0.5 },
    { id: 'l4_g1', kind: 'gate_pair', x: 0, z: 420, width: 4, radius: 0.5 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 90, width: 10 },
    { id: 'cp2', x: 0, z: 200, width: 8 },
    { id: 'cp3', x: 0, z: 330, width: 10 },
  ],
  environment: {
    skyColor: '#c45a1a',
    waterColor: '#0d5a94',
    bankColorL: '#8B4513',
    bankColorR: '#556B2F',
    fogNear: 50,
    fogFar: 140,
    ambientIntensity: 0.7,
  },
};

// ============================================================
// LEVEL 5 — THE ULTIMATE FLUSH
// ============================================================
const LEVEL_5: LevelConfig = {
  id: 5,
  name: 'The Ultimate Flush',
  description: 'Everything combined. A legendary run to the grand finale!',
  spawnPosition: { x: 0, z: 5 },
  spawnAngle: 0,
  finishZ: 600,
  maxTime: 360,
  maxSpeed: 14,
  segments: [
    { type: 'wide', length: 30, width: 16 },
    { type: 'straight', length: 40, width: 13 },
    { type: 'curve_right', length: 80, width: 10 },
    { type: 'narrow', length: 30, width: 5 },
    { type: 'curve_left', length: 80, width: 10 },
    { type: 'straight', length: 30, width: 12 },
    { type: 'curve_right', length: 80, width: 9 },
    { type: 'narrow', length: 40, width: 5 },
    { type: 'curve_left', length: 80, width: 9 },
    { type: 'wide', length: 20, width: 15 },
    { type: 'narrow', length: 30, width: 5 },
    { type: 'straight', length: 40, width: 14 },
  ],
  obstacles: [
    { id: 'l5_b1', kind: 'static_barrel', x: 3, z: 35, radius: 1.2 },
    { id: 'l5_b2', kind: 'static_barrel', x: -3, z: 48, radius: 1.2 },
    { id: 'l5_sg1', kind: 'spinning_gate', x: 0, z: 70, spinSpeed: 1.5, width: 10, radius: 0.5 },
    { id: 'l5_mb1', kind: 'moving_barrier', x: 0, z: 100, moveRange: 4, moveSpeed: 2, moveAxis: 'x', radius: 1.2 },
    { id: 'l5_r1', kind: 'static_rock', x: 2, z: 130, radius: 1.8 },
    { id: 'l5_np1', kind: 'narrow_passage', x: 0, z: 160, width: 4.5, radius: 0.5 },
    { id: 'l5_sg2', kind: 'spinning_gate', x: 0, z: 200, spinSpeed: 2.2, width: 9, radius: 0.5 },
    { id: 'l5_mb2', kind: 'moving_barrier', x: 0, z: 230, moveRange: 4, moveSpeed: 2.8, moveAxis: 'x', radius: 1.2 },
    { id: 'l5_mb3', kind: 'moving_barrier', x: 0, z: 250, moveRange: 3.5, moveSpeed: 2.5, moveAxis: 'x', radius: 1.2 },
    { id: 'l5_r2', kind: 'static_rock', x: -2, z: 280, radius: 2 },
    { id: 'l5_r3', kind: 'static_rock', x: 1.5, z: 295, radius: 1.5 },
    { id: 'l5_np2', kind: 'narrow_passage', x: 0, z: 320, width: 4, radius: 0.5 },
    { id: 'l5_sg3', kind: 'spinning_gate', x: 0, z: 360, spinSpeed: 3.0, width: 9, radius: 0.5 },
    { id: 'l5_mb4', kind: 'moving_barrier', x: 0, z: 390, moveRange: 5, moveSpeed: 3.5, moveAxis: 'x', radius: 1.2 },
    { id: 'l5_mb5', kind: 'moving_barrier', x: 0, z: 410, moveRange: 4.5, moveSpeed: 3.2, moveAxis: 'x', radius: 1.2 },
    { id: 'l5_sg4', kind: 'spinning_gate', x: 0, z: 450, spinSpeed: 3.5, width: 10, radius: 0.5 },
    { id: 'l5_g1', kind: 'gate_pair', x: 0, z: 480, width: 5, radius: 0.5 },
    { id: 'l5_np3', kind: 'narrow_passage', x: 0, z: 510, width: 4, radius: 0.5 },
    { id: 'l5_r4', kind: 'static_rock', x: 0, z: 540, radius: 2.2 },
    { id: 'l5_g2', kind: 'gate_pair', x: 0, z: 570, width: 5, radius: 0.5 },
  ],
  checkpoints: [
    { id: 'cp1', x: 0, z: 100, width: 12 },
    { id: 'cp2', x: 0, z: 220, width: 10 },
    { id: 'cp3', x: 0, z: 350, width: 10 },
    { id: 'cp4', x: 0, z: 480, width: 12 },
  ],
  environment: {
    skyColor: '#ff6b6b',
    waterColor: '#004080',
    bankColorL: '#4a0080',
    bankColorR: '#800040',
    fogNear: 60,
    fogFar: 180,
    ambientIntensity: 0.9,
  },
};

export const LEVELS: LevelConfig[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];

export function getLevelById(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}
