// ============================================================
// Fun Together — Shared Physics Constants (client-side copy)
// ============================================================
export const PHYSICS = {
  FIXED_DT: 1 / 60,
  DRAG: 0.985,
  ANGULAR_DRAG: 0.92,
  FART_IMPULSE: 9.5,            // Snappy impulse per click for continuous farting
  FART_ANGULAR: 0.05,
  MAX_SPEED: 12.0,              // Strict 12 m/s maximum speed as requested
  MAX_ANGULAR: 2.2,
  MASS: 10,
  MOMENT_OF_INERTIA: 4.0,
  BOBBING_AMPLITUDE: 0.08,
  BOBBING_FREQUENCY: 1.2,
  COLLISION_RESTITUTION: 0.45,
  COLLISION_FRICTION: 0.5,
  WATER_RESISTANCE: 0.015,
  GRAVITY: 9.81,
  STEER_FORCE: 16,              // Side-by-side steering responsiveness
  CHANNEL_HALF_WIDTH: 5.5,      // Clamps raft inside water channel
};

export const FART = {
  COOLDOWN_MS: 70,              // Rapid continuous clicking!
  BURST_DURATION_MS: 160,
  CLOUD_DURATION_MS: 1100,
};

export const SEAT_OFFSETS: [number, number][] = [
  [0, -0.85],   // rear  – seat 0 (Bear/Player 1)
  [0.85, 0],    // right – seat 1 (Frog/Player 2)
  [0, 0.85],    // front – seat 2 (Hippo/Player 3)
  [-0.85, 0],   // left  – seat 3 (Rhino/Player 4)
];
