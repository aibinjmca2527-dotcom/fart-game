import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { soundManager } from '../lib/audio';
import { FART } from '../shared/constants';
import { LEVELS, getTrackCenterX } from '../shared/levels';

export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'finished' | 'failed';

export interface PlayerInfo {
  id: string;
  displayName: string;
  seatIndex: number;
  ready: boolean;
  connected: boolean;
  fartCooldownMs: number;
  isFarting: boolean;
  animalType?: 'bear' | 'hippo' | 'frog' | 'rhino';
  angleAroundTube: number; // Angle around the tube in radians (Math.PI = rear)
}

export interface BowlInfo {
  posX: number;
  posZ: number;
  velX: number;
  velZ: number;
  angle: number;
  angularVelocity: number;
  bobY: number;
}

export interface ObstacleInfo {
  id: string;
  x: number;
  z: number;
  rotation: number;
  active: boolean;
}

export interface FartEvent {
  playerId: string;
  seatIndex: number;
  angle?: number;
}

interface GameState {
  room: Colyseus.Room | null;
  roomCode: string;
  phase: GamePhase;
  levelId: number;
  countdownRemaining: number;
  elapsedMs: number;
  players: Map<string, PlayerInfo>;
  bowl: BowlInfo;
  obstacles: ObstacleInfo[];
  currentCheckpoint: number;
  finished: boolean;
  isCrashed: boolean;
  spawnImmunityMs: number; // Respawn protection against false-collisions
  hostId: string;
  mySessionId: string;

  // Steering & moving around the tube
  steerX: number; // -1 (left), 0, +1 (right)

  // Local prediction
  predictedBowl: BowlInfo;

  // Events (cleared each frame)
  fartEvents: FartEvent[];
  collisionEvents: { obstacleId: string; posX: number; posZ: number }[];
  checkpointEvents: { id: string; index: number }[];

  setRoom: (r: Colyseus.Room | null) => void;
  setRoomCode: (code: string) => void;
  setPhase: (phase: GamePhase) => void;
  setLevelId: (id: number) => void;
  setSteerX: (dir: number) => void;
  movePlayerAngle: (playerId: string, deltaAngle: number) => void;
  updateFromSchema: (state: Colyseus.Room['state']) => void;
  addFartEvent: (e: FartEvent) => void;
  clearFartEvents: () => void;
  addCollisionEvent: (e: { obstacleId: string; posX: number; posZ: number }) => void;
  clearCollisionEvents: () => void;
  addCheckpointEvent: (e: { id: string; index: number }) => void;
  clearCheckpointEvents: () => void;
  stepLocalPhysics: (dt: number) => void;
  nextLevel: () => void;
  restartCurrentLevel: () => void;
  disconnect: () => void;
}

const defaultBowl: BowlInfo = {
  posX: 0, posZ: 5, velX: 0, velZ: 0, angle: 0, angularVelocity: 0, bobY: 0
};

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  roomCode: '',
  phase: 'lobby',
  levelId: 1,
  countdownRemaining: 3,
  elapsedMs: 0,
  players: new Map(),
  bowl: { ...defaultBowl },
  predictedBowl: { ...defaultBowl },
  obstacles: [],
  currentCheckpoint: -1,
  finished: false,
  isCrashed: false,
  spawnImmunityMs: 2000,
  hostId: '',
  mySessionId: '',
  steerX: 0,
  fartEvents: [],
  collisionEvents: [],
  checkpointEvents: [],

  setRoom: (r) => set({ room: r, mySessionId: r?.sessionId ?? '' }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPhase: (phase) => set({ phase, isCrashed: phase === 'failed' }),
  setLevelId: (levelId) => set({ levelId }),
  setSteerX: (dir) => set({ steerX: Math.max(-1, Math.min(1, dir)) }),

  // Move player around the perimeter of the circular tube
  movePlayerAngle: (playerId, deltaAngle) => {
    const { players } = get();
    const p = players.get(playerId);
    if (!p) return;
    const nextAngle = (p.angleAroundTube + deltaAngle + Math.PI * 2) % (Math.PI * 2);
    const updated = new Map(players);
    updated.set(playerId, { ...p, angleAroundTube: nextAngle });
    set({ players: updated });
  },

  updateFromSchema: (s) => {
    if (!s) return;
    const players = new Map<string, PlayerInfo>();
    s.players?.forEach((p: PlayerInfo, key: string) => {
      const existing = get().players.get(key);
      players.set(key, {
        ...p,
        angleAroundTube: existing?.angleAroundTube ?? (p.seatIndex * Math.PI * 0.5 + Math.PI),
      });
    });
    const obstacles: ObstacleInfo[] = [];
    s.obstacles?.forEach((o: ObstacleInfo) => obstacles.push({ ...o }));
    const bowl: BowlInfo = s.bowl ? { ...s.bowl } : { ...defaultBowl };

    set({
      roomCode: s.roomCode ?? get().roomCode,
      phase: s.phase ?? 'lobby',
      levelId: s.levelId ?? 1,
      countdownRemaining: s.countdownRemaining ?? 3,
      elapsedMs: s.elapsedMs ?? 0,
      players,
      bowl,
      predictedBowl: { ...bowl },
      obstacles,
      currentCheckpoint: s.currentCheckpoint ?? -1,
      finished: s.finished ?? false,
      hostId: s.hostId ?? '',
    });
  },

  addFartEvent: (e) => {
    soundManager.playFart();
    set((s) => {
      const players = new Map(s.players);
      const player = players.get(e.playerId);
      if (player) {
        players.set(e.playerId, { ...player, isFarting: true, fartCooldownMs: FART.COOLDOWN_MS });
      }
      return { fartEvents: [...s.fartEvents, e], players };
    });
  },

  clearFartEvents: () => set({ fartEvents: [] }),

  addCollisionEvent: (e) => {
    soundManager.playCrash();
    set((s) => ({
      collisionEvents: [...s.collisionEvents, e],
      phase: 'failed',
      isCrashed: true,
    }));
  },

  clearCollisionEvents: () => set({ collisionEvents: [] }),

  addCheckpointEvent: (e) => {
    soundManager.playCheckpoint();
    set((s) => ({
      currentCheckpoint: e.index,
      checkpointEvents: [...s.checkpointEvents, e]
    }));
  },

  clearCheckpointEvents: () => set({ checkpointEvents: [] }),

  // Local physics step + obstacle collision detection
  stepLocalPhysics: (dt: number) => {
    const { phase, steerX, bowl, levelId, mySessionId, movePlayerAngle, spawnImmunityMs, elapsedMs } = get();
    if (phase !== 'playing') return;

    const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
    const newBowl = { ...bowl };
    const newElapsed = elapsedMs + dt * 1000;
    const elapsedSec = newElapsed / 1000;

    // Tick respawn immunity
    if (spawnImmunityMs > 0) {
      set({ spawnImmunityMs: Math.max(0, spawnImmunityMs - dt * 1000) });
    }

    // If steering, move player around the tube
    if (steerX !== 0 && mySessionId) {
      movePlayerAngle(mySessionId, steerX * 2.8 * dt);
    }

    // Gentle river current carrying the tube downstream
    const riverCurrentSpeed = 3.2 + (levelId - 1) * 0.4;
    newBowl.velZ += (riverCurrentSpeed - newBowl.velZ) * 0.15 * dt;

    // Water channel centerline at current Z
    const currentCenterlineX = getTrackCenterX(levelId, newBowl.posZ);

    // Natural water traction guiding tube slightly along river curves
    newBowl.velX += (currentCenterlineX - newBowl.posX) * 0.22 * dt;

    // Drag
    newBowl.velX *= 0.965;
    newBowl.velZ *= 0.985;

    // Advance position
    newBowl.posX += newBowl.velX * dt;
    newBowl.posZ += newBowl.velZ * dt;
    newBowl.angle += newBowl.angularVelocity * dt;

    // Side banks clamp along the CURVED river flume (bouncing off sawtooth bumpers)
    const maxHalfW = 4.8;
    const leftLimit = currentCenterlineX - maxHalfW;
    const rightLimit = currentCenterlineX + maxHalfW;
    if (newBowl.posX < leftLimit) {
      newBowl.posX = leftLimit;
      newBowl.velX = Math.abs(newBowl.velX) * 0.45;
      soundManager.playSplash();
    } else if (newBowl.posX > rightLimit) {
      newBowl.posX = rightLimit;
      newBowl.velX = -Math.abs(newBowl.velX) * 0.45;
      soundManager.playSplash();
    }

    // ── Update All Obstacles (Circular Orbiting Motion & Spinning) ──
    const updatedObstacles: ObstacleInfo[] = level.obstacles.map((obs) => {
      const trackX = getTrackCenterX(levelId, obs.z);
      let currX = trackX + obs.x;
      let currZ = obs.z;
      let currRot = obs.rotation ?? 0;

      if (obs.kind === 'orbiting_hazard') {
        const speed = obs.orbitSpeed ?? 1.6;
        const rad = obs.orbitRadius ?? 2.5;
        const phase = obs.orbitPhase ?? 0;
        const orbitAngle = elapsedSec * speed + phase;
        // Circular revolution motion around the base point!
        currX = trackX + obs.x + Math.cos(orbitAngle) * rad;
        currZ = obs.z + Math.sin(orbitAngle) * rad;
        currRot = orbitAngle;
      } else if (obs.kind === 'spinning_gate') {
        currRot = (obs.spinSpeed ?? 1.5) * elapsedSec;
      } else if (obs.kind === 'moving_barrier') {
        const speed = obs.moveSpeed ?? 2.2;
        const range = obs.moveRange ?? 3.5;
        currX = trackX + Math.sin(elapsedSec * speed) * range;
      }

      return {
        id: obs.id,
        x: currX,
        z: currZ,
        rotation: currRot,
        active: true,
      };
    });

    // ── Check Obstacle Collisions ──
    // Immunity protects first 3.0 seconds and only check obstacles well past the START arch (z > 35)
    if (spawnImmunityMs <= 0 && newBowl.posZ > 35) {
      const tubeRadius = 0.8; // Realistic solid core of the raft tube
      for (let i = 0; i < updatedObstacles.length; i++) {
        const liveObs = updatedObstacles[i];
        const cfg = level.obstacles[i];
        if (!cfg) continue;

        // Gates: doorway clearance check (only check if tube collides with the outer timber posts)
        if (cfg.kind === 'gate_pair' || cfg.kind === 'narrow_passage') {
          const gateW = cfg.width ?? 6.5;
          const postRadius = 0.35;
          const leftPostX = liveObs.x - (gateW / 2 + 0.4);
          const rightPostX = liveObs.x + (gateW / 2 + 0.4);
          const dz = Math.abs(newBowl.posZ - liveObs.z);

          if (dz < 1.0) {
            const distLeft = Math.hypot(newBowl.posX - leftPostX, dz);
            const distRight = Math.hypot(newBowl.posX - rightPostX, dz);
            if (distLeft < tubeRadius + postRadius || distRight < tubeRadius + postRadius) {
              soundManager.playCrash();
              set({ bowl: newBowl, obstacles: updatedObstacles, phase: 'failed', isCrashed: true });
              return;
            }
          }
          continue;
        }

        // Spinning gate: rotating line segment collision (bar thickness ~0.35)
        if (cfg.kind === 'spinning_gate') {
          const halfW = (cfg.width ?? 8) / 2;
          const rot = liveObs.rotation;
          const dx = newBowl.posX - liveObs.x;
          const dz = newBowl.posZ - liveObs.z;
          const localX = dx * Math.cos(-rot) - dz * Math.sin(-rot);
          const localZ = dx * Math.sin(-rot) + dz * Math.cos(-rot);
          if (Math.abs(localZ) < (tubeRadius + 0.2) && Math.abs(localX) < (halfW - 0.2)) {
            soundManager.playCrash();
            set({ bowl: newBowl, obstacles: updatedObstacles, phase: 'failed', isCrashed: true });
            return;
          }
          continue;
        }

        // Circular Obstacles (orbiting hazards, static barrels, rocks, moving barriers)
        const obsRadius = cfg.radius ?? (cfg.kind === 'static_barrel' ? 0.55 : cfg.kind === 'static_rock' ? 0.75 : 0.7);
        const dx = newBowl.posX - liveObs.x;
        const dz = newBowl.posZ - liveObs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < tubeRadius + obsRadius) {
          soundManager.playCrash();
          set({
            bowl: newBowl,
            obstacles: updatedObstacles,
            phase: 'failed',
            isCrashed: true,
          });
          return;
        }
      }
    }

    // Check Checkpoints
    const curCp = get().currentCheckpoint;
    const nextCpIdx = curCp + 1;
    if (nextCpIdx < level.checkpoints.length) {
      const cp = level.checkpoints[nextCpIdx];
      const cpX = getTrackCenterX(levelId, cp.z) + cp.x;
      if (Math.abs(newBowl.posZ - cp.z) < 3.2 && Math.abs(newBowl.posX - cpX) < cp.width / 2) {
        soundManager.playCheckpoint();
        set({ currentCheckpoint: nextCpIdx });
      }
    }

    // Check Finish Line -> LEVEL COMPLETE!
    if (newBowl.posZ >= level.finishZ && !get().finished) {
      soundManager.playFinish();
      set({ finished: true, phase: 'finished', obstacles: updatedObstacles });
      return;
    }

    // Update state
    set({
      bowl: newBowl,
      obstacles: updatedObstacles,
      elapsedMs: newElapsed,
    });
  },

  // Advance to next level automatically
  nextLevel: () => {
    const curLevel = get().levelId;
    const next = curLevel < LEVELS.length ? curLevel + 1 : 1;
    set({
      levelId: next,
      phase: 'playing',
      finished: false,
      isCrashed: false,
      spawnImmunityMs: 3000,
      elapsedMs: 0,
      steerX: 0,
      currentCheckpoint: -1,
      bowl: { ...defaultBowl },
      predictedBowl: { ...defaultBowl },
    });
  },

  // Restart current level
  restartCurrentLevel: () => {
    // Clear all player farting states
    const players = new Map(get().players);
    players.forEach((p, k) => {
      players.set(k, { ...p, isFarting: false, fartCooldownMs: 0 });
    });

    set({
      phase: 'playing',
      finished: false,
      isCrashed: false,
      spawnImmunityMs: 3000,
      elapsedMs: 0,
      steerX: 0,
      currentCheckpoint: -1,
      players,
      fartEvents: [],
      bowl: { ...defaultBowl },
      predictedBowl: { ...defaultBowl },
    });
  },

  disconnect: () => {
    const { room } = get();
    room?.leave();
    set({
      room: null,
      roomCode: '',
      phase: 'lobby',
      players: new Map(),
      bowl: { ...defaultBowl },
      predictedBowl: { ...defaultBowl },
      obstacles: [],
      currentCheckpoint: -1,
      finished: false,
      isCrashed: false,
      spawnImmunityMs: 2000,
    });
  },
}));
