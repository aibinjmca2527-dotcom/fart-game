// ============================================================
// Fun Together — Express + Colyseus Server Entry Point
// ============================================================
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import { bugsRouter } from './routes/bugs';

const PORT = Number(process.env.PORT ?? 2567);
const app = express();

// Security: Disable X-Powered-By header to prevent fingerprinting
app.disable('x-powered-by');

// Security: Add essential HTTP security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure CORS
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Health check endpoint
app.get('/health', (_req, res) => res.json({ ok: true, status: 'healthy', ts: Date.now() }));

// Bug reporting endpoint (with built-in rate limiting and safe storage)
app.use('/api/bugs', bugsRouter);

// Colyseus monitor (admin panel)
// Protected by MONITOR_PASSWORD if configured, otherwise enabled in non-production
const monitorPassword = process.env.MONITOR_PASSWORD;
if (monitorPassword) {
  app.use(
    '/colyseus',
    (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
        return res.status(401).send('Authentication required');
      }
      const match = authHeader.match(/^Basic (.+)$/);
      if (!match) return res.status(401).send('Invalid auth format');
      const credentials = Buffer.from(match[1], 'base64').toString('ascii');
      const [, pass] = credentials.split(':');
      if (pass === monitorPassword) {
        return next();
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
      return res.status(401).send('Unauthorized');
    },
    monitor()
  );
} else if (process.env.NODE_ENV !== 'production') {
  app.use('/colyseus', monitor());
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register room types
gameServer.define('game_room', GameRoom).filterBy(['levelId']);

gameServer.listen(PORT).then(() => {
  console.log(`✅  Fun Together game server running on ws://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production' || monitorPassword) {
    console.log(`   Monitor: http://localhost:${PORT}/colyseus`);
  }
});
