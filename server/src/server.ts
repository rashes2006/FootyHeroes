import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initDb } from './db/connection';
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import playerRoutes from './routes/playerRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import matchRoutes, { setIo } from './routes/matchRoutes';
import { getDb } from './db/connection';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// DATABASE INIT
// ============================================================
initDb();

// ============================================================
// SOCKET.IO
// ============================================================
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Inject io into match routes for broadcasting
setIo(io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a match room for live updates
  socket.on('match:join', (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`👁 ${socket.id} watching match ${matchId}`);
  });

  // Leave a match room
  socket.on('match:leave', (matchId: string) => {
    socket.leave(`match:${matchId}`);
  });

  // Clock sync: broadcast current clock state to all viewers
  socket.on('clock:sync', (matchId: string) => {
    const db = getDb();
    const match = db.prepare('SELECT clock_seconds, is_clock_running, clock_started_at, status FROM matches WHERE id = ?')
      .get(matchId) as any;
    if (match) {
      let effective = match.clock_seconds;
      if (match.is_clock_running && match.clock_started_at) {
        const elapsed = (Date.now() - new Date(match.clock_started_at).getTime()) / 1000;
        effective = match.clock_seconds + Math.floor(elapsed);
      }
      socket.emit('clock:state', {
        matchId,
        seconds: effective,
        isRunning: !!match.is_clock_running,
        status: match.status
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.json({ players: [], teams: [], tournaments: [], matches: [] });
    return;
  }

  const db = getDb();
  const term = `%${q}%`;

  const players = db.prepare(`
    SELECT p.id, p.name, p.jersey_number, p.position, t.name as team_name
    FROM players p LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.name LIKE ? AND p.is_active = 1 LIMIT 10
  `).all(term);

  const teams = db.prepare(`
    SELECT id, name, short_name, city FROM teams WHERE name LIKE ? OR short_name LIKE ? LIMIT 10
  `).all(term, term);

  const tournaments = db.prepare(`
    SELECT id, name, location, status FROM tournaments WHERE name LIKE ? LIMIT 10
  `).all(term);

  res.json({ players, teams, tournaments });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// START SERVER
// ============================================================
server.listen(PORT, () => {
  console.log('');
  console.log('⚽ =============================================');
  console.log(`⚽  FootyHeroes Server running on port ${PORT}`);
  console.log('⚽ =============================================');
  console.log(`   API:       http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log('');
});

export { app, server, io };
