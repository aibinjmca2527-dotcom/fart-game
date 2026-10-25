import { BowlPhysics } from './BowlPhysics';
import { PHYSICS, SEAT_OFFSETS } from './constants';

describe('BowlPhysics', () => {
  it('initializes with given position and angle', () => {
    const physics = new BowlPhysics({ x: 5, y: 10 }, Math.PI / 4);
    const state = physics.getState();
    expect(state.position.x).toBeCloseTo(5);
    expect(state.position.y).toBeCloseTo(10);
    expect(state.angle).toBeCloseTo(Math.PI / 4);
    expect(state.velocity.x).toBe(0);
    expect(state.velocity.y).toBe(0);
  });

  it('generates forward impulse when seat 0 (rear) farts', () => {
    // Seat 0 is typically rear [0, -0.75]
    const physics = new BowlPhysics({ x: 0, y: 0 }, 0);
    const result = physics.applyFart({ seatIndex: 0, playerId: 'p1' });

    // Since seat 0 is at [0, -0.75], thrust is in +Y direction (forward)
    expect(result.appliedImpulse.y).toBeGreaterThan(0);
    expect(result.state.velocity.y).toBeGreaterThan(0);
  });

  it('generates turning torque when off-center seat farts', () => {
    // Seat 1 is off to a side [0.75, 0] or similar
    const physics = new BowlPhysics({ x: 0, y: 0 }, 0);
    const result = physics.applyFart({ seatIndex: 1, playerId: 'p2' });

    // Lateral seat generates non-zero torque
    expect(Math.abs(result.appliedAngular)).toBeGreaterThan(0);
    expect(Math.abs(result.state.angularVelocity)).toBeGreaterThan(0);
  });

  it('decays velocity over time through drag and water resistance', () => {
    const physics = new BowlPhysics({ x: 0, y: 0 }, 0);
    physics.applyFart({ seatIndex: 0, playerId: 'p1' });

    const initialSpeed = Math.sqrt(
      physics.getState().velocity.x ** 2 + physics.getState().velocity.y ** 2
    );
    expect(initialSpeed).toBeGreaterThan(0);

    // Step forward 60 frames (1 second)
    for (let i = 0; i < 60; i++) {
      physics.step(1 / 60);
    }

    const decayedSpeed = Math.sqrt(
      physics.getState().velocity.x ** 2 + physics.getState().velocity.y ** 2
    );
    expect(decayedSpeed).toBeLessThan(initialSpeed);
  });

  it('properly reflects velocity during collision', () => {
    const physics = new BowlPhysics({ x: 0, y: 0 }, 0);
    // Push forward into a wall at positive Y
    physics.applyFart({ seatIndex: 0, playerId: 'p1' });
    expect(physics.getState().velocity.y).toBeGreaterThan(0);

    // Hit a horizontal barrier with downward normal { x: 0, y: -1 }
    physics.applyCollision({ x: 0, y: -1 });

    // After collision with downward normal, Y velocity should bounce negative
    expect(physics.getState().velocity.y).toBeLessThan(0);
  });

  it('resets state accurately', () => {
    const physics = new BowlPhysics({ x: 0, y: 0 }, 0);
    physics.applyFart({ seatIndex: 0, playerId: 'p1' });
    physics.step(0.5);

    physics.reset({ x: 2, y: 3 }, Math.PI / 2);
    const state = physics.getState();
    expect(state.position.x).toBe(2);
    expect(state.position.y).toBe(3);
    expect(state.velocity.x).toBe(0);
    expect(state.velocity.y).toBe(0);
    expect(state.angle).toBe(Math.PI / 2);
  });
});
