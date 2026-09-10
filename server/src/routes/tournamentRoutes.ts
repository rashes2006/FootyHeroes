import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { deriveStandings, getTopScorers, derivePlayerStats } from '../engine/matchEngine';

const router = Router();

// GET /api/tournaments — list all tournaments
router.get('/', optionalAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const tournaments = db.prepare(`
    SELECT t.*,
      u.name as organizer_name,
      (SELECT COUNT(*) FROM tournament_teams WHERE tournament_id = t.id AND registration_status = 'ACCEPTED') as team_count,
      (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) as match_count
    FROM tournaments t
    LEFT JOIN users u ON t.organizer_id = u.id
    ORDER BY
      CASE t.status
        WHEN 'LIVE' THEN 1 WHEN 'UPCOMING' THEN 2 WHEN 'REGISTRATION_OPEN' THEN 3
        WHEN 'DRAFT' THEN 4 WHEN 'COMPLETED' THEN 5 ELSE 6
      END,
      t.start_date DESC
  `).all();
  res.json({ tournaments });
});

// GET /api/tournaments/:id — tournament details
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDb();
  const tournament = db.prepare(`
    SELECT t.*, u.name as organizer_name
    FROM tournaments t LEFT JOIN users u ON t.organizer_id = u.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  // Registered teams
  const teams = db.prepare(`
    SELECT t.*, tt.group_name, tt.registration_status
    FROM tournament_teams tt
    JOIN teams t ON tt.team_id = t.id
    WHERE tt.tournament_id = ? AND tt.registration_status = 'ACCEPTED'
    ORDER BY tt.group_name, t.name
  `).all(id);

  // Fixtures grouped by status
  const matches = db.prepare(`
    SELECT m.*,
      ht.name as home_team_name, ht.short_name as home_short, ht.logo as home_logo,
      at.name as away_team_name, at.short_name as away_short, at.logo as away_logo
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.tournament_id = ?
    ORDER BY m.scheduled_at ASC
  `).all(id);

  // Standings
  const standings = deriveStandings(id);

  // Top scorers
  const topScorers = getTopScorers(id, 10);

  // Top assists
  const allStats = derivePlayerStats(id);
  const topAssists = allStats
    .filter(s => s.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10);

  res.json({ tournament, teams, matches, standings, topScorers, topAssists });
});

// GET /api/tournaments/:id/standings
router.get('/:id/standings', optionalAuth, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const standings = deriveStandings(id);
  res.json({ standings });
});

// GET /api/tournaments/:id/stats
router.get('/:id/stats', optionalAuth, (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDb();

  // Tournament-level aggregated stats
  const matchStats = db.prepare(`
    SELECT
      COUNT(*) as total_matches,
      SUM(CASE WHEN status IN ('COMPLETED','FULL_TIME') THEN 1 ELSE 0 END) as completed_matches,
      SUM(home_score + away_score) as total_goals
    FROM matches WHERE tournament_id = ?
  `).get(id) as any;

  const eventStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN event_type = 'GOAL' THEN 1 END) as open_play_goals,
      COUNT(CASE WHEN event_type = 'PENALTY_SCORED' THEN 1 END) as penalty_goals,
      COUNT(CASE WHEN event_type = 'OWN_GOAL' THEN 1 END) as own_goals,
      COUNT(CASE WHEN event_type = 'YELLOW_CARD' THEN 1 END) as yellow_cards,
      COUNT(CASE WHEN event_type IN ('RED_CARD','SECOND_YELLOW') THEN 1 END) as red_cards,
      COUNT(CASE WHEN event_type = 'CORNER' THEN 1 END) as corners,
      COUNT(CASE WHEN event_type = 'FOUL' THEN 1 END) as fouls,
      COUNT(CASE WHEN event_type = 'OFFSIDE' THEN 1 END) as offsides
    FROM match_events me
    JOIN matches m ON me.match_id = m.id
    WHERE m.tournament_id = ? AND me.is_deleted = 0
  `).get(id) as any;

  const avgGoals = matchStats.completed_matches > 0
    ? (matchStats.total_goals / matchStats.completed_matches).toFixed(1)
    : '0.0';

  const topScorers = getTopScorers(id, 10);
  const playerStats = derivePlayerStats(id);

  res.json({
    overview: { ...matchStats, ...eventStats, avgGoalsPerMatch: avgGoals },
    topScorers,
    topAssists: playerStats.filter(s => s.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 10),
    mostYellowCards: playerStats.filter(s => s.yellowCards > 0).sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 10),
    mostRedCards: playerStats.filter(s => s.redCards > 0).sort((a, b) => b.redCards - a.redCards).slice(0, 10),
  });
});

// POST /api/tournaments — create tournament
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { name, description, location, start_date, end_date, format, half_duration, points_win, points_draw, points_loss, max_substitutions } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Tournament name is required' });
    return;
  }

  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO tournaments (id, name, organizer_id, description, location, start_date, end_date, format, status, half_duration, points_win, points_draw, points_loss, max_substitutions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)
  `).run(id, name, req.user!.id, description || null, location || null,
    start_date || null, end_date || null, format || 'LEAGUE',
    half_duration || 45, points_win || 3, points_draw || 1, points_loss || 0, max_substitutions || 5);

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
  res.status(201).json({ tournament });
});

// PUT /api/tournaments/:id — update tournament
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const { name, description, location, start_date, end_date, format, status, half_duration } = req.body;

  db.prepare(`
    UPDATE tournaments SET
      name = COALESCE(?, name), description = COALESCE(?, description),
      location = COALESCE(?, location), start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date), format = COALESCE(?, format),
      status = COALESCE(?, status), half_duration = COALESCE(?, half_duration)
    WHERE id = ?
  `).run(name, description, location, start_date, end_date, format, status, half_duration, req.params.id);

  const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  res.json({ tournament: updated });
});

// POST /api/tournaments/:id/teams — register team
router.post('/:id/teams', authMiddleware, (req: Request, res: Response) => {
  const { team_id, group_name } = req.body;
  const db = getDb();

  db.prepare(`
    INSERT OR REPLACE INTO tournament_teams (tournament_id, team_id, group_name, registration_status)
    VALUES (?, ?, ?, 'ACCEPTED')
  `).run(req.params.id, team_id, group_name || 'A');

  res.status(201).json({ message: 'Team registered' });
});

// POST /api/tournaments/:id/generate-fixtures — auto-generate round-robin
router.post('/:id/generate-fixtures', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const teams = db.prepare(`
    SELECT t.id, t.name FROM tournament_teams tt
    JOIN teams t ON tt.team_id = t.id
    WHERE tt.tournament_id = ? AND tt.registration_status = 'ACCEPTED'
  `).all(req.params.id) as any[];

  if (teams.length < 2) {
    res.status(400).json({ error: 'At least 2 teams needed' });
    return;
  }

  // Round-robin fixture generation
  const fixtures: any[] = [];
  let dayOffset = 0;
  const startDate = new Date(tournament.start_date || Date.now());

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const matchDate = new Date(startDate);
      matchDate.setDate(matchDate.getDate() + dayOffset * 3);
      const matchId = uuid();

      db.prepare(`
        INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, scheduled_at, venue, status, round)
        VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
      `).run(matchId, req.params.id, teams[i].id, teams[j].id,
        matchDate.toISOString(), tournament.location || 'TBD',
        `Round ${dayOffset + 1}`);

      fixtures.push({ id: matchId, home: teams[i].name, away: teams[j].name, date: matchDate.toISOString() });
      dayOffset++;
    }
  }

  res.status(201).json({ fixtures, count: fixtures.length });
});

export default router;
