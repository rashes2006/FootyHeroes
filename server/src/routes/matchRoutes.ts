import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { updateMatchScore, deriveMatchTeamStats, getEffectiveClockSeconds } from '../engine/matchEngine';

const router = Router();

// Will be set by server.ts after socket initialization
let ioInstance: any = null;
export function setIo(io: any) { ioInstance = io; }

function broadcastMatchUpdate(matchId: any) {
  if (!ioInstance) return;
  const db = getDb();
  const match = getFullMatchData(matchId);
  ioInstance.to(`match:${matchId}`).emit('match:update', match);
}

function broadcastEvent(matchId: any, event: any) {
  if (!ioInstance) return;
  ioInstance.to(`match:${matchId}`).emit('match:event', event);
}

function getFullMatchData(matchId: any) {
  const db = getDb();
  const match = db.prepare(`
    SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short, ht.logo as home_logo,
      at.name as away_team_name, at.short_name as away_short, at.logo as away_logo,
      tour.name as tournament_name, tour.half_duration,
      motm.name as motm_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments tour ON m.tournament_id = tour.id
    LEFT JOIN players motm ON m.man_of_match_id = motm.id
    WHERE m.id = ?
  `).get(matchId) as any;

  if (!match) return null;

  // Effective clock
  match.effective_clock = getEffectiveClockSeconds(match);

  // Events (timeline)
  const events = db.prepare(`
    SELECT me.*,
      p.name as player_name, p.jersey_number as player_jersey,
      sp.name as secondary_player_name, sp.jersey_number as secondary_player_jersey,
      t.name as team_name, t.short_name as team_short
    FROM match_events me
    LEFT JOIN players p ON me.player_id = p.id
    LEFT JOIN players sp ON me.secondary_player_id = sp.id
    LEFT JOIN teams t ON me.team_id = t.id
    WHERE me.match_id = ? AND me.is_deleted = 0
    ORDER BY me.minute ASC, me.stoppage_minute ASC, me.created_at ASC
  `).all(matchId);

  // Lineups (fallback to club squad if match_players not yet registered)
  let homePlayers = db.prepare(`
    SELECT mp.*, p.name, p.position, p.profile_photo
    FROM match_players mp JOIN players p ON mp.player_id = p.id
    WHERE mp.match_id = ? AND mp.team_id = ?
    ORDER BY mp.is_starter DESC, mp.jersey_number
  `).all(matchId, match.home_team_id);

  if (homePlayers.length === 0) {
    homePlayers = db.prepare(`
      SELECT id as player_id, name, position, jersey_number, profile_photo, 1 as is_starter
      FROM players
      WHERE team_id = ? AND is_active = 1
      ORDER BY jersey_number
    `).all(match.home_team_id);
  }

  let awayPlayers = db.prepare(`
    SELECT mp.*, p.name, p.position, p.profile_photo
    FROM match_players mp JOIN players p ON mp.player_id = p.id
    WHERE mp.match_id = ? AND mp.team_id = ?
    ORDER BY mp.is_starter DESC, mp.jersey_number
  `).all(matchId, match.away_team_id);

  if (awayPlayers.length === 0) {
    awayPlayers = db.prepare(`
      SELECT id as player_id, name, position, jersey_number, profile_photo, 1 as is_starter
      FROM players
      WHERE team_id = ? AND is_active = 1
      ORDER BY jersey_number
    `).all(match.away_team_id);
  }

  // Team match stats
  const homeStats = deriveMatchTeamStats(matchId, match.home_team_id);
  const awayStats = deriveMatchTeamStats(matchId, match.away_team_id);

  return { match, events, homePlayers, awayPlayers, homeStats, awayStats };
}

// GET /api/matches — list matches
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { tournament_id, status, team_id } = req.query;

  let query = `
    SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short,
      at.name as away_team_name, at.short_name as away_short,
      tour.name as tournament_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments tour ON m.tournament_id = tour.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (tournament_id) { query += ' AND m.tournament_id = ?'; params.push(tournament_id); }
  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (team_id) { query += ' AND (m.home_team_id = ? OR m.away_team_id = ?)'; params.push(team_id, team_id); }

  query += ' ORDER BY m.scheduled_at DESC';

  const matches = db.prepare(query).all(...params);

  // Add effective clock to live matches
  for (const m of matches as any[]) {
    m.effective_clock = getEffectiveClockSeconds(m);
  }

  res.json({ matches });
});

// GET /api/matches/live — only live matches
router.get('/live', optionalAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const matches = db.prepare(`
    SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short,
      at.name as away_team_name, at.short_name as away_short,
      tour.name as tournament_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments tour ON m.tournament_id = tour.id
    WHERE m.status LIKE 'LIVE_%' OR m.status = 'HALF_TIME'
    ORDER BY m.scheduled_at
  `).all();

  for (const m of matches as any[]) {
    m.effective_clock = getEffectiveClockSeconds(m);
  }

  res.json({ matches });
});

// GET /api/matches/:id — full match data
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const data = getFullMatchData(req.params.id);
  if (!data) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  res.json(data);
});

// POST /api/matches — create match
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { tournament_id, home_team_id, away_team_id, scheduled_at, venue, referee, round } = req.body;
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, scheduled_at, venue, referee, operator_id, status, round)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
  `).run(id, tournament_id, home_team_id, away_team_id, scheduled_at, venue || null, referee || null, req.user!.id, round || null);

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  res.status(201).json({ match });
});

// ============================================================
// MATCH LIFECYCLE
// ============================================================

// POST /api/matches/:id/lineup — set starting lineup
router.post('/:id/lineup', authMiddleware, (req: Request, res: Response) => {
  const { team_id, starters, substitutes, formation } = req.body;
  const db = getDb();

  // Remove existing lineup for this team
  db.prepare('DELETE FROM match_players WHERE match_id = ? AND team_id = ?')
    .run(req.params.id, team_id);

  const insert = db.prepare(`
    INSERT INTO match_players (match_id, player_id, team_id, is_starter, pitch_position, jersey_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (starters) {
    for (const s of starters) {
      insert.run(req.params.id, s.player_id, team_id, 1, s.position || null, s.jersey_number || null);
    }
  }

  if (substitutes) {
    for (const s of substitutes) {
      insert.run(req.params.id, s.player_id, team_id, 0, null, s.jersey_number || null);
    }
  }

  // Update formation
  if (formation) {
    const match = db.prepare('SELECT home_team_id FROM matches WHERE id = ?').get(req.params.id) as any;
    if (match.home_team_id === team_id) {
      db.prepare('UPDATE matches SET home_formation = ? WHERE id = ?').run(formation, req.params.id);
    } else {
      db.prepare('UPDATE matches SET away_formation = ? WHERE id = ?').run(formation, req.params.id);
    }
  }

  res.json({ message: 'Lineup set' });
});

// POST /api/matches/:id/start — start match (kick off)
router.post('/:id/start', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();

  db.prepare(`
    UPDATE matches SET status = 'LIVE_FIRST_HALF', is_clock_running = 1, clock_seconds = 0,
    clock_started_at = ? WHERE id = ?
  `).run(new Date().toISOString(), req.params.id);

  // Record kick off event
  const eventId = uuid();
  db.prepare(`
    INSERT INTO match_events (id, match_id, event_type, minute, period, notes, created_by)
    VALUES (?, ?, 'KICK_OFF', 0, '1H', 'Match started', ?)
  `).run(eventId, req.params.id, req.user!.id);

  broadcastMatchUpdate(req.params.id);
  res.json({ message: 'Match started' });
});

// POST /api/matches/:id/clock — control match clock
router.post('/:id/clock', authMiddleware, (req: Request, res: Response) => {
  const { action, seconds } = req.body;
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  switch (action) {
    case 'pause': {
      const effective = getEffectiveClockSeconds(match);
      db.prepare('UPDATE matches SET is_clock_running = 0, clock_seconds = ? WHERE id = ?')
        .run(effective, req.params.id);
      break;
    }
    case 'resume': {
      db.prepare('UPDATE matches SET is_clock_running = 1, clock_started_at = ? WHERE id = ?')
        .run(new Date().toISOString(), req.params.id);
      break;
    }
    case 'set': {
      if (seconds !== undefined) {
        db.prepare('UPDATE matches SET clock_seconds = ?, clock_started_at = ? WHERE id = ?')
          .run(seconds, match.is_clock_running ? new Date().toISOString() : null, req.params.id);
      }
      break;
    }
    case 'half_time': {
      const effective = getEffectiveClockSeconds(match);
      db.prepare(`
        UPDATE matches SET status = 'HALF_TIME', is_clock_running = 0, clock_seconds = ? WHERE id = ?
      `).run(effective, req.params.id);

      const eventId = uuid();
      db.prepare(`
        INSERT INTO match_events (id, match_id, event_type, minute, period, notes, created_by)
        VALUES (?, ?, 'HALF_TIME', ?, '1H', 'Half Time', ?)
      `).run(eventId, req.params.id, Math.floor(effective / 60), req.user!.id);
      break;
    }
    case 'second_half': {
      const tournament = db.prepare('SELECT half_duration FROM tournaments WHERE id = (SELECT tournament_id FROM matches WHERE id = ?)').get(req.params.id) as any;
      const secondHalfStart = (tournament?.half_duration || 45) * 60;

      db.prepare(`
        UPDATE matches SET status = 'LIVE_SECOND_HALF', is_clock_running = 1,
        clock_seconds = ?, clock_started_at = ? WHERE id = ?
      `).run(secondHalfStart, new Date().toISOString(), req.params.id);

      const eventId = uuid();
      db.prepare(`
        INSERT INTO match_events (id, match_id, event_type, minute, period, notes, created_by)
        VALUES (?, ?, 'SECOND_HALF_START', ?, '2H', 'Second half started', ?)
      `).run(eventId, req.params.id, tournament?.half_duration || 45, req.user!.id);
      break;
    }
    case 'full_time': {
      const effective = getEffectiveClockSeconds(match);
      const score = updateMatchScore(req.params.id);

      db.prepare(`
        UPDATE matches SET status = 'COMPLETED', is_clock_running = 0,
        clock_seconds = ?, home_score = ?, away_score = ? WHERE id = ?
      `).run(effective, score.homeScore, score.awayScore, req.params.id);

      const eventId = uuid();
      db.prepare(`
        INSERT INTO match_events (id, match_id, event_type, minute, period, notes, created_by)
        VALUES (?, ?, 'FULL_TIME', ?, '2H', 'Full Time', ?)
      `).run(eventId, req.params.id, Math.floor(effective / 60), req.user!.id);
      break;
    }
    case 'add_stoppage': {
      const period = match.status === 'LIVE_FIRST_HALF' ? 'stoppage_first_half' : 'stoppage_second_half';
      db.prepare(`UPDATE matches SET ${period} = ? WHERE id = ?`).run(seconds || 0, req.params.id);
      break;
    }
  }

  broadcastMatchUpdate(req.params.id);
  const updated = getFullMatchData(req.params.id);
  res.json(updated);
});

// ============================================================
// EVENT RECORDING
// ============================================================

// POST /api/matches/:id/events — record a match event
router.post('/:id/events', authMiddleware, (req: Request, res: Response) => {
  const { event_type, team_id, player_id, secondary_player_id, minute, stoppage_minute, period, notes, metadata } = req.body;

  if (!event_type) {
    res.status(400).json({ error: 'event_type is required' });
    return;
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  // Auto-determine minute from clock if not provided
  let eventMinute = minute;
  if (eventMinute === undefined || eventMinute === null) {
    eventMinute = Math.floor(getEffectiveClockSeconds(match) / 60);
  }

  // Auto-determine period
  let eventPeriod = period;
  if (!eventPeriod) {
    if (match.status === 'LIVE_FIRST_HALF') eventPeriod = '1H';
    else if (match.status === 'LIVE_SECOND_HALF') eventPeriod = '2H';
    else if (match.status === 'EXTRA_TIME_1') eventPeriod = 'ET1';
    else if (match.status === 'EXTRA_TIME_2') eventPeriod = 'ET2';
    else if (match.status === 'PENALTY_SHOOTOUT') eventPeriod = 'PEN';
    else eventPeriod = '1H';
  }

  const eventId = uuid();

  db.prepare(`
    INSERT INTO match_events (id, match_id, team_id, player_id, secondary_player_id,
      event_type, minute, stoppage_minute, period, notes, metadata_json, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId, req.params.id, team_id || null, player_id || null, secondary_player_id || null,
    event_type, eventMinute, stoppage_minute || 0, eventPeriod,
    notes || null, metadata ? JSON.stringify(metadata) : null, req.user!.id
  );

  // Recalculate score if goal-related
  if (['GOAL', 'OWN_GOAL', 'PENALTY_SCORED'].includes(event_type)) {
    const score = updateMatchScore(req.params.id);
    db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?')
      .run(score.homeScore, score.awayScore, req.params.id);
  }

  // Handle substitution player minutes
  if (event_type === 'SUBSTITUTION' && player_id && secondary_player_id) {
    // player_id = player coming ON, secondary_player_id = player going OFF
    db.prepare(`
      UPDATE match_players SET subbed_out_minute = ? WHERE match_id = ? AND player_id = ?
    `).run(eventMinute, req.params.id, secondary_player_id);

    db.prepare(`
      UPDATE match_players SET subbed_in_minute = ? WHERE match_id = ? AND player_id = ?
    `).run(eventMinute, req.params.id, player_id);
  }

  // Fetch created event with joins for broadcast
  const event = db.prepare(`
    SELECT me.*,
      p.name as player_name, p.jersey_number as player_jersey,
      sp.name as secondary_player_name, sp.jersey_number as secondary_player_jersey,
      t.name as team_name, t.short_name as team_short
    FROM match_events me
    LEFT JOIN players p ON me.player_id = p.id
    LEFT JOIN players sp ON me.secondary_player_id = sp.id
    LEFT JOIN teams t ON me.team_id = t.id
    WHERE me.id = ?
  `).get(eventId);

  // Record audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_state)
    VALUES (?, ?, ?, 'MATCH_EVENT', ?, ?)
  `).run(uuid(), req.user!.id, 'CREATE_EVENT', eventId, JSON.stringify(event));

  broadcastEvent(req.params.id, event);
  broadcastMatchUpdate(req.params.id);

  res.status(201).json({ event });
});

// DELETE /api/matches/:id/events/:eventId — soft delete (undo) an event
router.delete('/:id/events/:eventId', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();

  // Get old state for audit
  const oldEvent = db.prepare('SELECT * FROM match_events WHERE id = ?').get(req.params.eventId) as any;
  if (!oldEvent) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  db.prepare('UPDATE match_events SET is_deleted = 1 WHERE id = ?').run(req.params.eventId);

  // Recalculate score
  if (['GOAL', 'OWN_GOAL', 'PENALTY_SCORED'].includes(oldEvent.event_type)) {
    const score = updateMatchScore(req.params.id);
    db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?')
      .run(score.homeScore, score.awayScore, req.params.id);
  }

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, previous_state)
    VALUES (?, ?, 'DELETE_EVENT', 'MATCH_EVENT', ?, ?)
  `).run(uuid(), req.user!.id, req.params.eventId, JSON.stringify(oldEvent));

  broadcastMatchUpdate(req.params.id);
  res.json({ message: 'Event undone' });
});

// POST /api/matches/:id/undo — undo last event
router.post('/:id/undo', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();

  const lastEvent = db.prepare(`
    SELECT * FROM match_events
    WHERE match_id = ? AND is_deleted = 0
      AND event_type NOT IN ('KICK_OFF', 'HALF_TIME', 'SECOND_HALF_START', 'FULL_TIME')
    ORDER BY created_at DESC LIMIT 1
  `).get(req.params.id) as any;

  if (!lastEvent) {
    res.status(404).json({ error: 'No events to undo' });
    return;
  }

  db.prepare('UPDATE match_events SET is_deleted = 1 WHERE id = ?').run(lastEvent.id);

  if (['GOAL', 'OWN_GOAL', 'PENALTY_SCORED'].includes(lastEvent.event_type)) {
    const score = updateMatchScore(req.params.id);
    db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?')
      .run(score.homeScore, score.awayScore, req.params.id);
  }

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, previous_state)
    VALUES (?, ?, 'UNDO_EVENT', 'MATCH_EVENT', ?, ?)
  `).run(uuid(), req.user!.id, lastEvent.id, JSON.stringify(lastEvent));

  broadcastMatchUpdate(req.params.id);
  res.json({ undoneEvent: lastEvent });
});

// POST /api/matches/:id/motm — set Man of the Match
router.post('/:id/motm', authMiddleware, (req: Request, res: Response) => {
  const { player_id } = req.body;
  const db = getDb();
  db.prepare('UPDATE matches SET man_of_match_id = ? WHERE id = ?').run(player_id, req.params.id);
  broadcastMatchUpdate(req.params.id);
  res.json({ message: 'Man of the Match set' });
});

// GET /api/matches/:id/events — get match timeline
router.get('/:id/events', optionalAuth, (req: Request, res: Response) => {
  const db = getDb();
  const events = db.prepare(`
    SELECT me.*,
      p.name as player_name, p.jersey_number as player_jersey,
      sp.name as secondary_player_name, sp.jersey_number as secondary_player_jersey,
      t.name as team_name, t.short_name as team_short
    FROM match_events me
    LEFT JOIN players p ON me.player_id = p.id
    LEFT JOIN players sp ON me.secondary_player_id = sp.id
    LEFT JOIN teams t ON me.team_id = t.id
    WHERE me.match_id = ? AND me.is_deleted = 0
    ORDER BY me.minute ASC, me.stoppage_minute ASC, me.created_at ASC
  `).all(req.params.id);

  res.json({ events });
});

export default router;
