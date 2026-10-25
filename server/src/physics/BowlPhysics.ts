// ============================================================
// Fun Together — Bowl Physics Simulation (Server-Authoritative)
// ============================================================
import { PHYSICS, FART, SEAT_OFFSETS } from './constants';

export interface Vec2 { x: number; y: number }

export interface BowlState {
  position: Vec2;
  velocity: Vec2;
  angle: number;          // yaw in radians
  angularVelocity: number;
  bobPhase: number;       // for vertical bobbing
  bobY: number;           // current vertical bob offset
}

export interface FartInput {
  seatIndex: number;      // 0-3
  playerId: string;
}

export interface PropulsionResult {
  state: BowlState;
  appliedImpulse: Vec2;
  appliedAngular: number;
}

export class BowlPhysics {
  private state: BowlState;
  private accumulator = 0;
  private elapsed = 0;

  constructor(startPosition: Vec2 = { x: 0, y: 0 }, startAngle = 0) {
    this.state = {
      position: { ...startPosition },
      velocity: { x: 0, y: 0 },
      angle: startAngle,
      angularVelocity: 0,
      bobPhase: 0,
      bobY: 0,
    };
  }

  getState(): BowlState {
    return { ...this.state };
  }

  /** Apply a fart burst from the given seat index. Returns the net impulses. */
  applyFart(input: FartInput): PropulsionResult {
    // Propulsion profiles per seat:
    // Seat 0 (Rear): straight forward thrust
    // Seat 1 (Right): forward + leftward thrust with counter-clockwise yaw
    // Seat 2 (Front): reverse/braking thrust
    // Seat 3 (Left): forward + rightward thrust with clockwise yaw
    const SEAT_PROFILES: Array<{ thrust: Vec2; torque: number }> = [
      { thrust: { x: 0, y: 1.0 }, torque: 0 },
      { thrust: { x: -0.4, y: 0.8 }, torque: 1.0 },
      { thrust: { x: 0, y: -0.7 }, torque: 0 },
      { thrust: { x: 0.4, y: 0.8 }, torque: -1.0 },
    ];

    const profile = SEAT_PROFILES[input.seatIndex % 4] ?? SEAT_PROFILES[0];

    // Rotate local thrust vector to world space based on bowl angle
    const cos = Math.cos(this.state.angle);
    const sin = Math.sin(this.state.angle);
    const thrustWorld: Vec2 = {
      x: profile.thrust.x * cos - profile.thrust.y * sin,
      y: profile.thrust.x * sin + profile.thrust.y * cos,
    };

    // Linear impulse
    const impulse: Vec2 = {
      x: (thrustWorld.x * PHYSICS.FART_IMPULSE) / PHYSICS.MASS,
      y: (thrustWorld.y * PHYSICS.FART_IMPULSE) / PHYSICS.MASS,
    };

    // Angular impulse (yaw torque)
    const angularImpulse = (profile.torque * PHYSICS.FART_ANGULAR * PHYSICS.FART_IMPULSE) / PHYSICS.MOMENT_OF_INERTIA;

    // Apply impulses to bowl state
    this.state.velocity.x += impulse.x;
    this.state.velocity.y += impulse.y;
    this.state.angularVelocity += angularImpulse;

    this.clampSpeeds();

    return {
      state: this.getState(),
      appliedImpulse: impulse,
      appliedAngular: angularImpulse,
    };
  }

  /** Advance simulation by deltaTime seconds (can be >1 step, will sub-step). */
  step(deltaTime: number): BowlState {
    this.accumulator += deltaTime;

    while (this.accumulator >= PHYSICS.FIXED_DT) {
      this.integrate(PHYSICS.FIXED_DT);
      this.accumulator -= PHYSICS.FIXED_DT;
      this.elapsed += PHYSICS.FIXED_DT;
    }

    return this.getState();
  }

  private integrate(dt: number) {
    const s = this.state;

    // Linear drag
    s.velocity.x *= PHYSICS.DRAG;
    s.velocity.y *= PHYSICS.DRAG;

    // Extra lateral water resistance (damp sideways slip more)
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const fwdSpeed = s.velocity.x * cos + s.velocity.y * sin;
    const latSpeed = -s.velocity.x * sin + s.velocity.y * cos;
    const dampedLat = latSpeed * (1 - PHYSICS.WATER_RESISTANCE);
    s.velocity.x = fwdSpeed * cos - dampedLat * sin;
    s.velocity.y = fwdSpeed * sin + dampedLat * cos;

    // Angular drag
    s.angularVelocity *= PHYSICS.ANGULAR_DRAG;

    // Integrate
    s.position.x += s.velocity.x * dt;
    s.position.y += s.velocity.y * dt;
    s.angle += s.angularVelocity * dt;

    // Keep angle in [-π, π]
    s.angle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));

    // Bobbing
    s.bobPhase += PHYSICS.BOBBING_FREQUENCY * 2 * Math.PI * dt;
    s.bobY = Math.sin(s.bobPhase) * PHYSICS.BOBBING_AMPLITUDE;

    this.clampSpeeds();
  }

  private clampSpeeds() {
    const s = this.state;
    const speed = Math.sqrt(s.velocity.x ** 2 + s.velocity.y ** 2);
    if (speed > PHYSICS.MAX_SPEED) {
      const scale = PHYSICS.MAX_SPEED / speed;
      s.velocity.x *= scale;
      s.velocity.y *= scale;
    }
    s.angularVelocity = Math.max(
      -PHYSICS.MAX_ANGULAR,
      Math.min(PHYSICS.MAX_ANGULAR, s.angularVelocity)
    );
  }

  /** Handle collision: reflect velocity off a surface normal. */
  applyCollision(normal: Vec2, contactPoint?: Vec2) {
    const s = this.state;
    const dot = s.velocity.x * normal.x + s.velocity.y * normal.y;
    if (dot >= 0) return; // moving away already

    const restitution = PHYSICS.COLLISION_RESTITUTION;
    const impulse = -(1 + restitution) * dot;
    s.velocity.x += impulse * normal.x;
    s.velocity.y += impulse * normal.y;

    // Friction
    const tangent = { x: -normal.y, y: normal.x };
    const tangentSpeed = s.velocity.x * tangent.x + s.velocity.y * tangent.y;
    s.velocity.x -= tangentSpeed * PHYSICS.COLLISION_FRICTION * tangent.x * 0.2;
    s.velocity.y -= tangentSpeed * PHYSICS.COLLISION_FRICTION * tangent.y * 0.2;

    // Small random spin on collision
    s.angularVelocity += (Math.random() - 0.5) * 0.3;

    this.clampSpeeds();
  }

  /** Reset to a spawn position. */
  reset(position: Vec2, angle = 0) {
    this.state = {
      position: { ...position },
      velocity: { x: 0, y: 0 },
      angle,
      angularVelocity: 0,
      bobPhase: 0,
      bobY: 0,
    };
    this.accumulator = 0;
    this.elapsed = 0;
  }
}
