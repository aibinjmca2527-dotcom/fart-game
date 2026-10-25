// ============================================================
// Fun Together — Shared Physics Constants
// ============================================================
export const PHYSICS = {
  FIXED_DT: 1 / 60,           // 60 Hz simulation step
  DRAG: 0.985,                 // linear velocity retained per step
  ANGULAR_DRAG: 0.92,         // angular velocity retained per step
  FART_IMPULSE: 9.5,           // snappy impulse per click
  FART_ANGULAR: 0.05,         // angular impulse from off-centre burst
  MAX_SPEED: 18,              // m/s
  MAX_ANGULAR: 2.2,           // rad/s
  MASS: 10,                   // kg (bowl + characters)
  MOMENT_OF_INERTIA: 4.0,     // kg·m²
  BOBBING_AMPLITUDE: 0.08,    // m
  BOBBING_FREQUENCY: 1.2,     // Hz
  COLLISION_RESTITUTION: 0.45,// bounciness 0-1
  COLLISION_FRICTION: 0.5,
  WATER_RESISTANCE: 0.015,    // extra drag on sideways motion
  GRAVITY: 9.81,
  STEER_FORCE: 16,             // Side-by-side steering
  CHANNEL_HALF_WIDTH: 5.5,
};

export const FART = {
  COOLDOWN_MS: 70,            // rapid continuous clicking
  BURST_DURATION_MS: 160,
  CLOUD_DURATION_MS: 1100,
};

export const SEAT_OFFSETS: [number, number][] = [
  [0, -0.85],   // rear  – seat 0
  [0.85, 0],    // right – seat 1
  [0, 0.85],    // front – seat 2
  [-0.85, 0],   // left  – seat 3
];
