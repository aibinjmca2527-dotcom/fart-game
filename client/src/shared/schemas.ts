import { Schema, defineTypes, MapSchema, ArraySchema } from '@colyseus/schema';

export class PlayerState extends Schema {
  id: string = '';
  displayName: string = 'Player';
  seatIndex: number = 0;
  ready: boolean = false;
  connected: boolean = true;
  fartCooldownMs: number = 0;
  isFarting: boolean = false;
  score: number = 0;
}
defineTypes(PlayerState, {
  id: 'string',
  displayName: 'string',
  seatIndex: 'number',
  ready: 'boolean',
  connected: 'boolean',
  fartCooldownMs: 'number',
  isFarting: 'boolean',
  score: 'number',
});

export class BowlStateSchema extends Schema {
  posX: number = 0;
  posZ: number = 0;
  velX: number = 0;
  velZ: number = 0;
  angle: number = 0;
  angularVelocity: number = 0;
  bobY: number = 0;
}
defineTypes(BowlStateSchema, {
  posX: 'number',
  posZ: 'number',
  velX: 'number',
  velZ: 'number',
  angle: 'number',
  angularVelocity: 'number',
  bobY: 'number',
});

export class ObstacleState extends Schema {
  id: string = '';
  x: number = 0;
  z: number = 0;
  rotation: number = 0;
  active: boolean = true;
}
defineTypes(ObstacleState, {
  id: 'string',
  x: 'number',
  z: 'number',
  rotation: 'number',
  active: 'boolean',
});

export class GameRoomState extends Schema {
  roomCode: string = '';
  phase: string = 'lobby';
  levelId: number = 1;
  countdownRemaining: number = 3;
  elapsedMs: number = 0;
  maxTimeMs: number = 180000;
  players = new MapSchema<PlayerState>();
  bowl = new BowlStateSchema();
  obstacles = new ArraySchema<ObstacleState>();
  currentCheckpoint: number = -1;
  finished: boolean = false;
  hostId: string = '';
}
defineTypes(GameRoomState, {
  roomCode: 'string',
  phase: 'string',
  levelId: 'number',
  countdownRemaining: 'number',
  elapsedMs: 'number',
  maxTimeMs: 'number',
  players: { map: PlayerState },
  bowl: BowlStateSchema,
  obstacles: [ObstacleState],
  currentCheckpoint: 'number',
  finished: 'boolean',
  hostId: 'string',
});
