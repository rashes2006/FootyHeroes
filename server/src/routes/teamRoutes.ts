import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/teams — list all teams
router.get('/', optionalAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM players WHERE team_id = t.id AND is_active = 1) as squad_size,
      u.name as manager_name
    FROM teams t
    LEFT JOIN users u ON t.manager_id = u.id
    ORDER BY t.name
  `).all();
  res.json({ teams });
});

// GET /api/teams/:id — team details with squad
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const db = getDb();
  const team = db.prepare(`
    SELECT t.*, u.name as manager_name
    FROM teams t LEFT JOIN users u ON t.manager_id = u.id
    WHERE t.id = ?
  `).get(req.params.id) as any;

  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const players = db.prepare(`
    SELECT * FROM players WHERE team_id = ? AND is_active = 1
    ORDER BY
      CASE position
        WHEN 'GK' THEN 1 WHEN 'CB' THEN 2 WHEN 'LB' THEN 3 WHEN 'RB' THEN 4
        WHEN 'DM' THEN 5 WHEN 'CM' THEN 6 WHEN 'CAM' THEN 7
        WHEN 'LW' THEN 8 WHEN 'RW' THEN 9 WHEN 'ST' THEN 10
      END,
      jersey_number
  `).all(req.params.id);

  // Get team's tournament participations
  const tournaments = db.prepare(`
    SELECT t.* FROM tournaments t
    JOIN tournament_teams tt ON t.id = tt.tournament_id
    WHERE tt.team_id = ? AND tt.registration_status = 'ACCEPTED'
    ORDER BY t.start_date DESC
  `).all(req.params.id);

  // Get team's match history
  const matches = db.prepare(`
    SELECT m.*, ht.name as home_team_name, ht.short_name as home_short,
           at.name as away_team_name, at.short_name as away_short,
           tour.name as tournament_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments tour ON m.tournament_id = tour.id
    WHERE m.home_team_id = ? OR m.away_team_id = ?
    ORDER BY m.scheduled_at DESC
  `).all(req.params.id, req.params.id);

  res.json({ team, players, tournaments, matches });
});

// POST /api/teams — create team
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { name, short_name, city, description, founded_year } = req.body;

  if (!name || !short_name) {
    res.status(400).json({ error: 'Team name and short name are required' });
    return;
  }

  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO teams (id, name, short_name, city, description, manager_id, founded_year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, short_name, city || null, description || null, req.user!.id, founded_year || null);

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  res.status(201).json({ team });
});

// PUT /api/teams/:id — update team
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;

  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  if (team.manager_id !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Only the team manager can edit' });
    return;
  }

  const { name, short_name, city, description, captain_id } = req.body;

  db.prepare(`
    UPDATE teams SET
      name = COALESCE(?, name),
      short_name = COALESCE(?, short_name),
      city = COALESCE(?, city),
      description = COALESCE(?, description),
      captain_id = COALESCE(?, captain_id)
    WHERE id = ?
  `).run(name, short_name, city, description, captain_id, req.params.id);

  const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  res.json({ team: updated });
});

export default router;
