import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/players — list players (optionally filtered by team)
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { team_id } = req.query;

  let query = `
    SELECT p.*, t.name as team_name, t.short_name as team_short
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.is_active = 1
  `;
  const params: any[] = [];

  if (team_id) {
    query += ' AND p.team_id = ?';
    params.push(team_id);
  }

  query += ' ORDER BY t.name, p.jersey_number';

  const players = db.prepare(query).all(...params);
  res.json({ players });
});

// GET /api/players/:id — player profile with stats
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const db = getDb();
  const player = db.prepare(`
    SELECT p.*, t.name as team_name, t.short_name as team_short, t.id as team_id
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.id = ?
  `).get(req.params.id) as any;

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // Aggregate stats from match events
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT mp.match_id) as matches_played,
      COALESCE(SUM(mp.minutes_played), 0) as total_minutes,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'GOAL' AND is_deleted = 0) as goals,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'PENALTY_SCORED' AND is_deleted = 0) as penalty_goals,
      (SELECT COUNT(*) FROM match_events WHERE secondary_player_id = ? AND event_type IN ('GOAL','PENALTY_SCORED') AND is_deleted = 0) as assists,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'OWN_GOAL' AND is_deleted = 0) as own_goals,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'YELLOW_CARD' AND is_deleted = 0) as yellow_cards,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type IN ('RED_CARD','SECOND_YELLOW') AND is_deleted = 0) as red_cards,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'FOUL' AND is_deleted = 0) as fouls,
      (SELECT COUNT(*) FROM match_events WHERE secondary_player_id = ? AND event_type = 'FOUL' AND is_deleted = 0) as fouls_suffered,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type = 'OFFSIDE' AND is_deleted = 0) as offsides,
      (SELECT COUNT(*) FROM match_events WHERE player_id = ? AND event_type IN ('PENALTY_MISSED','PENALTY_SAVED') AND is_deleted = 0) as penalties_missed,
      (SELECT COUNT(*) FROM matches WHERE man_of_match_id = ?) as motm_awards
    FROM match_players mp
    WHERE mp.player_id = ?
  `).get(
    req.params.id, req.params.id, req.params.id, req.params.id,
    req.params.id, req.params.id, req.params.id, req.params.id,
    req.params.id, req.params.id, req.params.id, req.params.id
  );

  // Match history
  const matchHistory = db.prepare(`
    SELECT m.id, m.scheduled_at, m.status, m.home_score, m.away_score,
           ht.name as home_team_name, ht.short_name as home_short,
           at.name as away_team_name, at.short_name as away_short,
           mp.minutes_played, mp.is_starter,
           tour.name as tournament_name,
           (SELECT COUNT(*) FROM match_events WHERE match_id = m.id AND player_id = ? AND event_type = 'GOAL' AND is_deleted = 0) as match_goals,
           (SELECT COUNT(*) FROM match_events WHERE match_id = m.id AND secondary_player_id = ? AND event_type IN ('GOAL','PENALTY_SCORED') AND is_deleted = 0) as match_assists,
           (SELECT COUNT(*) FROM match_events WHERE match_id = m.id AND player_id = ? AND event_type = 'YELLOW_CARD' AND is_deleted = 0) as match_yellows,
           (SELECT COUNT(*) FROM match_events WHERE match_id = m.id AND player_id = ? AND event_type IN ('RED_CARD','SECOND_YELLOW') AND is_deleted = 0) as match_reds
    FROM match_players mp
    JOIN matches m ON mp.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments tour ON m.tournament_id = tour.id
    WHERE mp.player_id = ?
    ORDER BY m.scheduled_at DESC
  `).all(req.params.id, req.params.id, req.params.id, req.params.id, req.params.id);

  res.json({ player, stats, matchHistory });
});

// POST /api/players — add player to a team
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { team_id, name, jersey_number, position, preferred_foot, dob } = req.body;

  if (!team_id || !name) {
    res.status(400).json({ error: 'Team ID and player name are required' });
    return;
  }

  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO players (id, team_id, name, jersey_number, position, preferred_foot, dob)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, team_id, name, jersey_number || null, position || null, preferred_foot || 'RIGHT', dob || null);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  res.status(201).json({ player });
});

// PUT /api/players/:id — update player
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const { name, jersey_number, position, preferred_foot, dob, is_active } = req.body;

  db.prepare(`
    UPDATE players SET
      name = COALESCE(?, name),
      jersey_number = COALESCE(?, jersey_number),
      position = COALESCE(?, position),
      preferred_foot = COALESCE(?, preferred_foot),
      dob = COALESCE(?, dob),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, jersey_number, position, preferred_foot, dob, is_active, req.params.id);

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json({ player: updated });
});

export default router;
