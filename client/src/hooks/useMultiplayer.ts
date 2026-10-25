// ============================================================
// Fun Together — Multiplayer Hook (Supabase Realtime + Colyseus)
// Seamless dual-mode: Supabase serverless realtime + Colyseus fallback
// ============================================================
import { useCallback, useEffect, useRef } from 'react';
import * as Colyseus from 'colyseus.js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useGameStore, type PlayerInfo, type FartEvent } from '../store/gameStore';
import { GameRoomState } from '../shared/schemas';
import { PHYSICS } from '../shared/constants';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567';

let colyseusClient: Colyseus.Client | null = null;
let activeRoom: Colyseus.Room<GameRoomState> | null = null;
let realtimeChannel: RealtimeChannel | null = null;

function getColyseus(): Colyseus.Client {
  if (!colyseusClient) colyseusClient = new Colyseus.Client(SERVER_URL);
  return colyseusClient;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useMultiplayer() {
  const roomRef = useRef<Colyseus.Room<GameRoomState> | null>(null);
  const {
    setRoom, setRoomCode, setPhase,
    updateFromSchema, addFartEvent, addCollisionEvent,
    addCheckpointEvent, setSteerX, setOnCollisionCallback
  } = useGameStore();

  // Broadcast crash and restart to all connected peers in the room
  useEffect(() => {
    setOnCollisionCallback(() => {
      if (realtimeChannel) {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'game_restart',
          payload: {},
        });
      }
      const room = useGameStore.getState().room ?? activeRoom;
      room?.send('restart', {});
    });

    return () => setOnCollisionCallback(undefined);
  }, [setOnCollisionCallback]);

  // Attach Colyseus room listeners
  const attachColyseusListeners = useCallback((room: Colyseus.Room<GameRoomState>) => {
    roomRef.current = room;
    activeRoom = room;
    setRoom(room);

    room.onStateChange((state) => {
      updateFromSchema(state);
    });

    room.onMessage('fart_event', (msg: FartEvent) => {
      addFartEvent(msg);
    });

    room.onMessage('collision', (msg: { obstacleId: string; posX: number; posZ: number }) => {
      addCollisionEvent(msg);
    });

    room.onMessage('checkpoint', (msg: { id: string; index: number }) => {
      addCheckpointEvent(msg);
    });

    room.onMessage('finish', (_msg) => {
      setPhase('finished');
    });

    room.onMessage('timeout', () => {
      setPhase('failed');
    });

    room.onLeave(() => {
      setRoom(null);
    });
  }, [setRoom, updateFromSchema, addFartEvent, addCollisionEvent, addCheckpointEvent, setPhase]);

  // Setup Supabase Realtime Broadcast Channel for serverless peer sync
  const setupSupabaseChannel = useCallback((code: string, myPlayerId: string, displayName: string, isHost: boolean) => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    const channel = supabase.channel(`fart_room_${code}`, {
      config: { broadcast: { self: false } },
    });

    // Listen to broadcast messages from other peers
    channel
      .on('broadcast', { event: 'fart' }, ({ payload }) => {
        addFartEvent(payload);
      })
      .on('broadcast', { event: 'steer' }, ({ payload }) => {
        setSteerX(payload.dir);
      })
      .on('broadcast', { event: 'player_join' }, ({ payload }) => {
        const { players, mySessionId } = useGameStore.getState();
        const next = new Map(players);
        next.set(payload.id, payload);
        useGameStore.setState({ players: next });

        // If I am already in the room, send back a sync of myself to the newly joined player!
        const me = players.get(mySessionId);
        if (me && payload.id !== mySessionId) {
          channel.send({
            type: 'broadcast',
            event: 'player_sync',
            payload: me,
          });
        }
      })
      .on('broadcast', { event: 'player_sync' }, ({ payload }) => {
        const { players } = useGameStore.getState();
        const next = new Map(players);
        next.set(payload.id, payload);
        useGameStore.setState({ players: next });
      })
      .on('broadcast', { event: 'game_start' }, () => {
        useGameStore.getState().setPhase('playing');
      })
      .on('broadcast', { event: 'game_restart' }, () => {
        useGameStore.getState().restartCurrentLevel();
      })
      .on('broadcast', { event: 'next_level' }, ({ payload }) => {
        if (payload?.levelId) {
          useGameStore.setState({ levelId: payload.levelId });
        }
        useGameStore.getState().nextLevel();
      })
      .on('broadcast', { event: 'ready' }, ({ payload }) => {
        const { players } = useGameStore.getState();
        const p = players.get(payload.id);
        if (p) {
          const next = new Map(players);
          next.set(payload.id, { ...p, ready: payload.ready });
          useGameStore.setState({ players: next });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence
          channel.send({
            type: 'broadcast',
            event: 'player_join',
            payload: {
              id: myPlayerId,
              displayName,
              seatIndex: isHost ? 0 : 1,
              ready: isHost,
              connected: true,
              fartCooldownMs: 0,
              isFarting: false,
              angleAroundTube: isHost ? Math.PI : Math.PI * 0.5,
            },
          });
        }
      });

    realtimeChannel = channel;
  }, [addFartEvent, setSteerX]);

  // Create Room
  const createRoom = useCallback(
    async (levelId: number, displayName: string) => {
      const code = generateRoomCode();
      const myId = `host_${Date.now()}`;
      setRoomCode(code);

      // Initialize host player in local store
      const hostPlayer: PlayerInfo = {
        id: myId,
        displayName,
        seatIndex: 0,
        ready: true,
        connected: true,
        fartCooldownMs: 0,
        isFarting: false,
        animalType: 'bear',
        angleAroundTube: Math.PI,
      };
      const initialPlayers = new Map<string, PlayerInfo>();
      initialPlayers.set(myId, hostPlayer);
      useGameStore.setState({
        roomCode: code,
        phase: 'lobby',
        levelId,
        hostId: myId,
        mySessionId: myId,
        players: initialPlayers,
      });

      // 1. Try registering room in Supabase DB
      try {
        await supabase.from('game_rooms').insert({
          room_code: code,
          host_id: myId,
          host_name: displayName,
          level_id: levelId,
          status: 'lobby',
        });
        await supabase.from('room_players').insert({
          room_code: code,
          player_id: myId,
          display_name: displayName,
          seat_index: 0,
          character_animal: 'bear',
          is_ready: true,
        });
      } catch {
        // Table may be pending or running without DB
      }

      // 2. Setup Supabase Realtime channel
      setupSupabaseChannel(code, myId, displayName, true);

      // 3. Also try Colyseus server if available
      try {
        const room = await getColyseus().create<GameRoomState>(
          'game_room',
          { levelId, displayName, roomCode: code },
          GameRoomState
        );
        attachColyseusListeners(room);
        return { room, roomCode: code, error: null };
      } catch {
        // Colyseus server optional; Supabase realtime functions standalone!
        return { room: null, roomCode: code, error: null };
      }
    },
    [setRoomCode, setupSupabaseChannel, attachColyseusListeners]
  );

  // Join Room
  const joinRoom = useCallback(
    async (roomCodeToJoin: string, displayName: string) => {
      const code = roomCodeToJoin.trim().toUpperCase();
      const myId = `client_${Date.now()}`;
      setRoomCode(code);

      // 1. Check Supabase DB for room existence
      try {
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('room_code', code)
          .single();

        if (roomData) {
          useGameStore.setState({
            levelId: roomData.level_id ?? 1,
            hostId: roomData.host_id,
            roomCode: code,
            phase: 'lobby',
            mySessionId: myId,
          });

          await supabase.from('room_players').insert({
            room_code: code,
            player_id: myId,
            display_name: displayName,
            seat_index: 1,
            character_animal: 'frog',
            is_ready: false,
          });
        }
      } catch {
        // Offline / mock join
      }

      // Add local player
      const guestPlayer: PlayerInfo = {
        id: myId,
        displayName,
        seatIndex: 1,
        ready: false,
        connected: true,
        fartCooldownMs: 0,
        isFarting: false,
        animalType: 'frog',
        angleAroundTube: Math.PI * 0.5,
      };
      const curPlayers = new Map(useGameStore.getState().players);
      curPlayers.set(myId, guestPlayer);
      useGameStore.setState({ players: curPlayers, mySessionId: myId, roomCode: code });

      // Setup Supabase Realtime channel
      setupSupabaseChannel(code, myId, displayName, false);

      // Also try Colyseus server if available
      try {
        let rooms: Array<{ roomId: string; metadata?: { roomCode?: string } }> = [];
        try {
          const res = await (getColyseus().http.get('/matchmake/game_room') as Promise<{ data: Array<{ roomId: string; metadata?: { roomCode?: string } }> }>);
          rooms = res.data ?? [];
        } catch {
          if (typeof (getColyseus() as unknown as { getAvailableRooms?: (name: string) => Promise<Array<{ roomId: string; metadata?: { roomCode?: string } }>> }).getAvailableRooms === 'function') {
            rooms = await (getColyseus() as unknown as { getAvailableRooms: (name: string) => Promise<Array<{ roomId: string; metadata?: { roomCode?: string } }>> }).getAvailableRooms('game_room');
          }
        }
        const target = rooms.find((r) => r.metadata?.roomCode?.toUpperCase() === code || r.roomId === code);
        if (target) {
          const room = await getColyseus().joinById<GameRoomState>(target.roomId, { displayName }, GameRoomState);
          attachColyseusListeners(room);
        }
      } catch {
        // Optional Colyseus fallback
      }

      return { roomCode: code, error: null };
    },
    [setRoomCode, setupSupabaseChannel, attachColyseusListeners]
  );

  // Send Fart (rapid continuous directional farting!)
  const sendFart = useCallback((seatIndex: number) => {
    const { mySessionId, bowl, players } = useGameStore.getState();
    const myPlayer = players.get(mySessionId);
    const angle = myPlayer?.angleAroundTube ?? Math.PI; // default rear (pushes forward)
    const event: FartEvent = { playerId: mySessionId || 'local', seatIndex, angle };

    // 1. Immediately trigger locally (zero input lag, continuous sounds & puffs!)
    addFartEvent(event);

    // Apply directional fart physics:
    // Fart points outward along (sin(angle), cos(angle)).
    // Reaction thrust pushes OPPOSITE along (-sin(angle), -cos(angle))!
    const thrustX = -Math.sin(angle) * PHYSICS.FART_IMPULSE * 0.45;
    const thrustZ = -Math.cos(angle) * PHYSICS.FART_IMPULSE * 0.55;

    const nextVx = bowl.velX + thrustX;
    const nextVz = bowl.velZ + thrustZ;
    const currentSpeed = Math.hypot(nextVx, nextVz);
    const clampedSpeed = Math.min(PHYSICS.MAX_SPEED, currentSpeed);
    const scale = currentSpeed > 0.001 ? clampedSpeed / currentSpeed : 1;

    useGameStore.setState({
      bowl: {
        ...bowl,
        velX: nextVx * scale,
        velZ: nextVz * scale,
      },
    });

    // 2. Broadcast via Supabase Realtime
    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'fart',
        payload: event,
      });
    }

    // 3. Send to Colyseus if connected
    const room = useGameStore.getState().room ?? activeRoom;
    room?.send('fart', { seatIndex, angle });
  }, [addFartEvent]);

  // Send Side-by-Side Steer (-1 left, 0 center, +1 right)
  const sendSteer = useCallback((dir: number) => {
    setSteerX(dir);

    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'steer',
        payload: { dir },
      });
    }
  }, [setSteerX]);

  const sendReady = useCallback((ready: boolean) => {
    const { mySessionId, players } = useGameStore.getState();
    const p = players.get(mySessionId);
    if (p) {
      const next = new Map(players);
      next.set(mySessionId, { ...p, ready });
      useGameStore.setState({ players: next });
    }

    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'ready',
        payload: { id: mySessionId, ready },
      });
    }

    const room = useGameStore.getState().room ?? activeRoom;
    room?.send('ready', { ready });
  }, []);

  const sendStart = useCallback((levelId: number) => {
    useGameStore.getState().setPhase('playing');

    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { levelId },
      });
    }

    const room = useGameStore.getState().room ?? activeRoom;
    room?.send('start', { levelId });
  }, []);

  const sendRestart = useCallback(() => {
    useGameStore.getState().restartCurrentLevel();

    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'game_restart',
        payload: {},
      });
    }

    const room = useGameStore.getState().room ?? activeRoom;
    room?.send('restart', {});
  }, []);

  const sendNextLevel = useCallback((targetLevelId?: number) => {
    useGameStore.getState().nextLevel();
    const curLevel = useGameStore.getState().levelId;

    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'next_level',
        payload: { levelId: targetLevelId ?? curLevel },
      });
    }

    const room = useGameStore.getState().room ?? activeRoom;
    room?.send('next_level', { levelId: targetLevelId ?? curLevel });
  }, []);

  const leaveRoom = useCallback(() => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    const room = useGameStore.getState().room ?? activeRoom;
    room?.leave();
    activeRoom = null;
    useGameStore.getState().disconnect();
  }, []);

  return { createRoom, joinRoom, sendFart, sendSteer, sendReady, sendStart, sendRestart, sendNextLevel, leaveRoom };
}
