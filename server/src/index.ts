// ============================================================
// Fun Together — Express + Colyseus Server Entry Point
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';

const PORT = Number(process.env.PORT ?? 2567);
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Colyseus monitor (admin panel at /colyseus)
app.use('/colyseus', monitor());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register room types
gameServer.define('game_room', GameRoom).filterBy(['levelId']);

gameServer.listen(PORT).then(() => {
  console.log(`✅  Fun Together game server running on ws://localhost:${PORT}`);
  console.log(`   Monitor: http://localhost:${PORT}/colyseus`);
});
