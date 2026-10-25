// ============================================================
// Fun Together — Main Colyseus Game Room
// ============================================================
import { Room, Client } from 'colyseus';
import {
  GameRoomState,
  PlayerState,
  BowlStateSchema,
  ObstacleState,
} from './GameRoomState';
import { BowlPhysics } from '../physics/BowlPhysics';
import { getLevelById, LevelConfig, ObstacleConfig } from '../levels/LevelConfigs';
import { PHYSICS, FART } from '../physics/constants';
import { nanoid } from 'nanoid';

// Message types from client → server
interface FartMsg { seatIndex: number }
interface ReadyMsg { ready: boolean }
interface StartMsg { levelId: number }

const TICK_RATE = 20; // Hz server update rate sent to clients

export class GameRoom extends Room<GameRoomState> {
  private physics!: BowlPhysics;
  private level!: LevelConfig;
  private obstaclePhases: Map<string, number> = new Map();
  private lastTickTime = 0;
  private gameLoop?: NodeJS.Timeout;
  private countdownLoop?: NodeJS.Timeout;

  maxClients = 4;

  onCreate(options: { levelId?: number; roomCode?: string }) {
    const state = new GameRoomState();
    state.roomCode = options.roomCode ?? nanoid(6).toUpperCase();
    state.levelId = options.levelId ?? 1;
    this.setState(state);
    this.setMetadata({ roomCode: state.roomCode, levelId: state.levelId });

    this.level = getLevelById(state.levelId) ?? getLevelById(1)!;
    this.physics = new BowlPhysics(
      { x: this.level.spawnPosition.x, y: this.level.spawnPosition.z },
      this.level.spawnAngle
    );

    this.initObstacles();

    // Register client message handlers
    this.onMessage<FartMsg>('fart', (client, msg) => this.handleFart(client, msg));
    this.onMessage<ReadyMsg>('ready', (client, msg) => this.handleReady(client, msg));
    this.onMessage<StartMsg>('start', (client, msg) => this.handleStart(client, msg));
    this.onMessage('restart', (client) => this.handleRestart(client));

    this.setSimulationInterval(() => this.tick(), 1000 / 60);

    console.log(`[Room ${state.roomCode}] created — level ${state.levelId}`);
  }

  onJoin(client: Client, options: { displayName?: string }) {
    const state = this.state as GameRoomState;

    if (state.phase !== 'lobby') {
      // Allow reconnection
      const existing = [...state.players.values()].find(
        (p) => p.id === client.sessionId && !p.connected
      );
      if (existing) {
        existing.connected = true;
        console.log(`[Room] player ${client.sessionId} reconnected`);
        return;
      }
    }

    const seatIndex = this.nextAvailableSeat();
    const player = new PlayerState();
    player.id = client.sessionId;
    player.displayName = options.displayName ?? `Player ${seatIndex + 1}`;
    player.seatIndex = seatIndex;
    player.connected = true;

    state.players.set(client.sessionId, player);

    if (state.players.size === 1) {
      state.hostId = client.sessionId;
    }

    console.log(`[Room ${state.roomCode}] player ${player.displayName} joined seat ${seatIndex}`);
  }

  onLeave(client: Client, consented: boolean) {
    const state = this.state as GameRoomState;
    const player = state.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;
    console.log(`[Room ${state.roomCode}] player ${player.displayName} disconnected`);

    // If host left, transfer host
    if (state.hostId === client.sessionId) {
      const nextHost = [...state.players.values()].find((p) => p.connected);
      if (nextHost) state.hostId = nextHost.id;
    }

    // If no players remain, room will auto-dispose
  }

  onDispose() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.countdownLoop) clearInterval(this.countdownLoop);
    console.log(`[Room ${(this.state as GameRoomState).roomCode}] disposed`);
  }

  // ─── Private ───────────────────────────────────────────────

  private nextAvailableSeat(): number {
    const state = this.state as GameRoomState;
    const taken = new Set([...state.players.values()].map((p) => p.seatIndex));
    for (let i = 0; i < 4; i++) if (!taken.has(i)) return i;
    return 0;
  }

  private initObstacles() {
    const state = this.state as GameRoomState;
    state.obstacles.clear();
    this.obstaclePhases.clear();

    for (const obs of this.level.obstacles) {
      const o = new ObstacleState();
      o.id = obs.id;
      o.x = obs.x;
      o.z = obs.z;
      o.rotation = obs.rotation ?? 0;
      o.active = true;
      state.obstacles.push(o);
      this.obstaclePhases.set(obs.id, 0);
    }
  }

  private handleFart(client: Client, msg: FartMsg) {
    const state = this.state as GameRoomState;
    if (state.phase !== 'playing') return;

    const player = state.players.get(client.sessionId);
    if (!player || player.fartCooldownMs > 0) return;

    const seatIndex = typeof msg.seatIndex === 'number' ? msg.seatIndex : player.seatIndex;

    // Apply to authoritative physics
    this.physics.applyFart({ seatIndex, playerId: client.sessionId });

    // Set cooldown
    player.fartCooldownMs = FART.COOLDOWN_MS;
    player.isFarting = true;

    // Broadcast fart event so all clients animate it
    this.broadcast('fart_event', { playerId: client.sessionId, seatIndex }, { except: client });

    setTimeout(() => {
      player.isFarting = false;
    }, FART.BURST_DURATION_MS);
  }

  private handleReady(client: Client, msg: ReadyMsg) {
    const state = this.state as GameRoomState;
    if (state.phase !== 'lobby') return;
    const player = state.players.get(client.sessionId);
    if (player) player.ready = msg.ready;
    console.log(`[Room ${state.roomCode}] player ${player?.displayName} ready: ${msg.ready}`);

    // Check if all connected players are ready
    const connected = [...state.players.values()].filter((p) => p.connected);
    if (connected.length >= 1 && connected.every((p) => p.ready)) {
      this.startCountdown();
    }
  }

  private handleStart(client: Client, _msg: StartMsg) {
    const state = this.state as GameRoomState;
    console.log(`[Room ${state.roomCode}] handleStart by ${client.sessionId}, hostId: ${state.hostId}`);
    if (state.phase !== 'lobby') return;
    if (!state.hostId || client.sessionId === state.hostId || state.players.size <= 1) {
      this.startCountdown();
    }
  }

  private handleRestart(client: Client) {
    const state = this.state as GameRoomState;
    if (state.hostId && client.sessionId !== state.hostId && state.players.size > 1) return;
    this.resetGame();
  }

  private startCountdown() {
    const state = this.state as GameRoomState;
    if (state.phase === 'countdown' || state.phase === 'playing') return;
    console.log(`[Room ${state.roomCode}] countdown started!`);
    state.phase = 'countdown';
    state.countdownRemaining = 3;

    if (this.countdownLoop) clearInterval(this.countdownLoop);
    this.countdownLoop = setInterval(() => {
      state.countdownRemaining -= 1;
      console.log(`[Room ${state.roomCode}] countdown: ${state.countdownRemaining}`);
      if (state.countdownRemaining <= 0) {
        clearInterval(this.countdownLoop!);
        this.startGame();
      }
    }, 1000);
  }

  private startGame() {
    const state = this.state as GameRoomState;
    console.log(`[Room ${state.roomCode}] GAME STARTED! Phase: playing`);
    state.phase = 'playing';
    state.elapsedMs = 0;
    state.currentCheckpoint = -1;
    state.finished = false;
    this.lastTickTime = Date.now();
    this.physics.reset(
      { x: this.level.spawnPosition.x, y: this.level.spawnPosition.z },
      this.level.spawnAngle
    );
    this.initObstacles();
  }

  private resetGame() {
    const state = this.state as GameRoomState;
    state.phase = 'lobby';
    state.finished = false;
    state.currentCheckpoint = -1;
    [...state.players.values()].forEach((p) => { p.ready = false; });
    this.physics.reset(
      { x: this.level.spawnPosition.x, y: this.level.spawnPosition.z },
      this.level.spawnAngle
    );
    this.initObstacles();
  }

  private tick() {
    const state = this.state as GameRoomState;
    if (state.phase !== 'playing') return;

    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1); // cap at 100ms
    this.lastTickTime = now;

    // Advance physics
    const physState = this.physics.step(dt);

    // Update bowl schema
    const bowl = state.bowl as BowlStateSchema;
    bowl.posX = physState.position.x;
    bowl.posZ = physState.position.y; // y in physics = z in 3D world
    bowl.velX = physState.velocity.x;
    bowl.velZ = physState.velocity.y;
    bowl.angle = physState.angle;
    bowl.angularVelocity = physState.angularVelocity;
    bowl.bobY = physState.bobY;

    // Update elapsed time
    state.elapsedMs += dt * 1000;

    // Tick cooldowns
    for (const player of state.players.values()) {
      if (player.fartCooldownMs > 0) {
        player.fartCooldownMs = Math.max(0, player.fartCooldownMs - dt * 1000);
      }
    }

    // Update obstacle states (spinning, moving)
    this.updateObstacles(dt);

    // Check collisions
    this.checkCollisions(physState.position, physState.angle);

    // Check checkpoints
    this.checkCheckpoints(physState.position);

    // Check finish
    if (physState.position.y >= this.level.finishZ) {
      this.handleFinish();
    }

    // Check timeout
    if (state.elapsedMs >= this.level.maxTime * 1000) {
      state.phase = 'failed';
      this.broadcast('timeout', {});
    }
  }

  private updateObstacles(dt: number) {
    const state = this.state as GameRoomState;
    let obsIdx = 0;
    for (const obs of this.level.obstacles) {
      const schema = state.obstacles[obsIdx];
      if (!schema) { obsIdx++; continue; }

      const phase = (this.obstaclePhases.get(obs.id) ?? 0) + dt;
      this.obstaclePhases.set(obs.id, phase);

      if (obs.kind === 'spinning_gate' && obs.spinSpeed) {
        schema.rotation = phase * obs.spinSpeed;
      }
      if (obs.kind === 'moving_barrier' && obs.moveRange && obs.moveSpeed) {
        const offset = Math.sin(phase * obs.moveSpeed) * obs.moveRange;
        if (obs.moveAxis === 'x') schema.x = obs.x + offset;
        else schema.z = obs.z + offset;
      }
      obsIdx++;
    }
  }

  private checkCollisions(pos: { x: number; y: number }, angle: number) {
    const state = this.state as GameRoomState;
    const bowlRadius = 1.6;

    let obsIdx = 0;
    for (const obs of this.level.obstacles) {
      const schema = state.obstacles[obsIdx];
      if (!schema || !schema.active) { obsIdx++; continue; }

      const obsRadius = obs.radius ?? 1.2;
      const dx = pos.x - schema.x;
      const dz = pos.y - schema.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = bowlRadius + obsRadius;

      if (dist < minDist) {
        // Collision!
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        this.physics.applyCollision({ x: nx, y: nz });

        // Push bowl out of overlap
        const overlap = minDist - dist;
        const physState = this.physics.getState();
        physState.position.x += nx * overlap;
        physState.position.y += nz * overlap;

        this.broadcast('collision', { obstacleId: obs.id, posX: pos.x, posZ: pos.y });
      }
      obsIdx++;
    }
  }

  private checkCheckpoints(pos: { x: number; y: number }) {
    const state = this.state as GameRoomState;
    const checkpoints = this.level.checkpoints;
    const nextIdx = state.currentCheckpoint + 1;
    if (nextIdx >= checkpoints.length) return;

    const cp = checkpoints[nextIdx];
    const dz = Math.abs(pos.y - cp.z);
    const dx = Math.abs(pos.x - cp.x);
    if (dz < 3 && dx < cp.width / 2) {
      state.currentCheckpoint = nextIdx;
      this.broadcast('checkpoint', { id: cp.id, index: nextIdx });
    }
  }

  private handleFinish() {
    const state = this.state as GameRoomState;
    if (state.finished) return;
    state.finished = true;
    state.phase = 'finished';

    const timeMs = state.elapsedMs;
    this.broadcast('finish', { timeMs, levelId: state.levelId });
    console.log(`[Room ${state.roomCode}] finished level ${state.levelId} in ${(timeMs / 1000).toFixed(1)}s`);
  }
}
