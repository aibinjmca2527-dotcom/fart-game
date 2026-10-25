import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { soundManager } from '../lib/audio';
import { FART } from '../shared/constants';
import { LEVELS, getTrackCenterX } from '../shared/levels';
import { saveSoloMaxUnlockedLevel, getTeamSignature, saveTeamLevel } from '../lib/teamProgression';

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
  crashToast: string;
  crashToastMs: number;
  onCollisionCallback?: () => void;

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
  triggerCrashAndAutoRestart: (reason?: string) => void;
  setOnCollisionCallback: (cb: (() => void) | undefined) => void;
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
  spawnImmunityMs: 1500,
  hostId: '',
  mySessionId: '',
  steerX: 0,
  fartEvents: [],
  collisionEvents: [],
  checkpointEvents: [],
  crashToast: '',
  crashToastMs: 0,
  onCollisionCallback: undefined,

  setRoom: (r) => set({ room: r, mySessionId: r?.sessionId ?? '' }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPhase: (phase) => set({ phase, isCrashed: phase === 'failed' }),
  setLevelId: (levelId) => set({ levelId }),
  setSteerX: (dir) => set({ steerX: Math.max(-1, Math.min(1, dir)) }),
  setOnCollisionCallback: (cb) => set({ onCollisionCallback: cb }),

  // Instant crash and automatic restart on the same level without blocking modals!
  triggerCrashAndAutoRestart: (reason = 'Obstacle Collision') => {
    // If already in spawn immunity / just crashed, ignore duplicate crash events
    if (get().spawnImmunityMs > 900) return;

    soundManager.playCrash();

    // Clear farting states on all players
    const players = new Map(get().players);
    players.forEach((p, k) => {
      players.set(k, { ...p, isFarting: false, fartCooldownMs: 0 });
    });

    set({
      bowl: { ...defaultBowl },
      predictedBowl: { ...defaultBowl },
      elapsedMs: 0,
      currentCheckpoint: -1,
      steerX: 0,
      isCrashed: true,
      spawnImmunityMs: 1500,
      crashToast: reason,
      crashToastMs: 1800,
      phase: 'playing', // Immediately play on same level!
      players,
      fartEvents: [],
    });

    // Notify multiplayer hook to broadcast restart across all connected peers!
    get().onCollisionCallback?.();
  },

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

    // Tick toast timer
    const curToastMs = get().crashToastMs;
    if (curToastMs > 0) {
      set({ crashToastMs: Math.max(0, curToastMs - dt * 1000) });
    }

    // Tick respawn immunity
    if (spawnImmunityMs > 0) {
      set({ spawnImmunityMs: Math.max(0, spawnImmunityMs - dt * 1000) });
    }

    // If steering, move player around the tube AND apply direct lateral steering force to raft
    if (steerX !== 0) {
      if (mySessionId) {
        movePlayerAngle(mySessionId, steerX * 2.8 * dt);
      }
      newBowl.velX += steerX * 4.5 * dt;
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

    // Strict maximum speed of 12.0 m/s as requested
    const currentSpeed = Math.hypot(newBowl.velX, newBowl.velZ);
    if (currentSpeed > 12.0) {
      const scale = 12.0 / currentSpeed;
      newBowl.velX *= scale;
      newBowl.velZ *= scale;
    }

    // Advance position
    newBowl.posX += newBowl.velX * dt;
    newBowl.posZ += newBowl.velZ * dt;
    newBowl.angle += newBowl.angularVelocity * dt;

    // Prevent raft from ever glitching backwards behind start line
    if (newBowl.posZ < 3.0) {
      newBowl.posZ = 3.0;
      if (newBowl.velZ < 0) newBowl.velZ = 0;
    }

    // ── Check Side Banks & Border Collision ──
    // The river flume channel width is 12m, with colorful sawtooth bumpers along both sides.
    // The inner tip of the sawtooth bumper wall is 4.95m from the track centerline.
    // The outer visual edge of the inflatable tube is 1.82m (torus radius 1.35 + tube radius 0.42 + handles/crew overhang 0.05).
    // If the tube's center is more than (4.95 - 1.82 = 3.13m) away from the centerline,
    // the outer edge is physically touching the side sawtooth bumper teeth!
    const tubeEdgeRadius = 1.82;
    const wallBumperDistance = 4.95;
    const maxCenterDist = wallBumperDistance - tubeEdgeRadius; // 3.13m from centerline
    const leftLimit = currentCenterlineX - maxCenterDist;
    const rightLimit = currentCenterlineX + maxCenterDist;

    if (spawnImmunityMs <= 0 && newBowl.posZ > 6) {
      if (newBowl.posX <= leftLimit || newBowl.posX >= rightLimit) {
        get().triggerCrashAndAutoRestart('Touched River Side Wall!');
        return;
      }
    } else {
      // Soft clamp during spawn immunity
      if (newBowl.posX < leftLimit) newBowl.posX = leftLimit;
      if (newBowl.posX > rightLimit) newBowl.posX = rightLimit;
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

    // ── Check Obstacle Collisions (Strict: Any outer edge touch fails immediately!) ──
    // Checks as soon as boat moves past spawn (z > 8)
    if (spawnImmunityMs <= 0 && newBowl.posZ > 8) {
      for (let i = 0; i < updatedObstacles.length; i++) {
        const liveObs = updatedObstacles[i];
        const cfg = level.obstacles[i];
        if (!cfg) continue;

        const dz = Math.abs(newBowl.posZ - liveObs.z);

        // Gates: doorway posts collision
        if (cfg.kind === 'gate_pair' || cfg.kind === 'narrow_passage') {
          const gateW = cfg.width ?? 6.5;
          const postRadius = 0.35;
          const leftPostX = liveObs.x - (gateW / 2 + 0.4);
          const rightPostX = liveObs.x + (gateW / 2 + 0.4);

          if (dz < tubeEdgeRadius + 1.0) {
            const distLeft = Math.hypot(newBowl.posX - leftPostX, dz);
            const distRight = Math.hypot(newBowl.posX - rightPostX, dz);
            if (distLeft < tubeEdgeRadius + postRadius || distRight < tubeEdgeRadius + postRadius) {
              get().triggerCrashAndAutoRestart('Touched Gate Post!');
              return;
            }
          }
          continue;
        }

        // Spinning gate collision
        if (cfg.kind === 'spinning_gate') {
          const halfW = (cfg.width ?? 8) / 2;
          const halfThick = 0.22;
          const rot = liveObs.rotation;
          const dx = newBowl.posX - liveObs.x;
          const localX = dx * Math.cos(-rot) - dz * Math.sin(-rot);
          const localZ = dx * Math.sin(-rot) + dz * Math.cos(-rot);
          if (Math.abs(localZ) < (tubeEdgeRadius + halfThick) && Math.abs(localX) < (halfW + tubeEdgeRadius)) {
            get().triggerCrashAndAutoRestart('Touched Spinning Gate!');
            return;
          }
          continue;
        }

        // Circular Obstacles (orbiting hazards, static barrels, rocks, moving barriers)
        // Ensure the full visual edge of each obstacle is accounted for:
        // - orbiting hazard buoy has outer rotating spike cones: radius + 0.65
        // - rock has jagged rock corners: radius + 0.25
        // - barrel has metal rims: radius + 0.12
        let obsRadius = 0.8;
        let label = 'Obstacle';
        if (cfg.kind === 'orbiting_hazard') {
          obsRadius = (cfg.radius ?? 0.7) + 0.65;
          label = 'Orbiting Hazard Buoy';
        } else if (cfg.kind === 'static_rock') {
          obsRadius = (cfg.radius ?? 0.75) + 0.25;
          label = 'Rock';
        } else if (cfg.kind === 'static_barrel') {
          obsRadius = (cfg.radius ?? 0.55) + 0.12;
          label = 'Barrel';
        } else if (cfg.kind === 'moving_barrier') {
          obsRadius = 0.85;
          label = 'Barrier';
        }

        const dx = newBowl.posX - liveObs.x;
        const dist = Math.hypot(dx, dz);
        if (dist < tubeEdgeRadius + obsRadius) {
          get().triggerCrashAndAutoRestart(`Touched ${label}!`);
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
      saveSoloMaxUnlockedLevel(levelId);
      const teamSig = getTeamSignature([...get().players.values()].map((p) => p.displayName));
      if (teamSig) {
        saveTeamLevel(teamSig, levelId + 1);
      }
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
    saveSoloMaxUnlockedLevel(curLevel);
    const teamSig = getTeamSignature([...get().players.values()].map((p) => p.displayName));
    if (teamSig) {
      saveTeamLevel(teamSig, next);
    }
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
    get().triggerCrashAndAutoRestart('Level Restarted');
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
