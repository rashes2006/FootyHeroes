-- FootyHeroes Database Schema
-- Event-driven football tournament management platform

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'SPECTATOR'
    CHECK(role IN ('SUPER_ADMIN','ORGANIZER','TEAM_MANAGER','SCORER','PLAYER','SPECTATOR')),
  profile_image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo TEXT,
  city TEXT,
  description TEXT,
  manager_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  captain_id TEXT,
  founded_year INTEGER,
  contact_info TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT CHECK(position IN ('GK','CB','LB','RB','DM','CM','CAM','LW','RW','ST')),
  preferred_foot TEXT DEFAULT 'RIGHT' CHECK(preferred_foot IN ('LEFT','RIGHT','BOTH')),
  dob TEXT,
  profile_photo TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  logo TEXT,
  banner TEXT,
  description TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  format TEXT DEFAULT 'LEAGUE'
    CHECK(format IN ('LEAGUE','KNOCKOUT','GROUP_KNOCKOUT')),
  status TEXT DEFAULT 'DRAFT'
    CHECK(status IN ('DRAFT','REGISTRATION_OPEN','UPCOMING','LIVE','COMPLETED','CANCELLED')),
  half_duration INTEGER DEFAULT 45,
  extra_time_duration INTEGER DEFAULT 15,
  max_substitutions INTEGER DEFAULT 5,
  squad_size_min INTEGER DEFAULT 11,
  squad_size_max INTEGER DEFAULT 23,
  points_win INTEGER DEFAULT 3,
  points_draw INTEGER DEFAULT 1,
  points_loss INTEGER DEFAULT 0,
  rules_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TOURNAMENT TEAMS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_teams (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  group_name TEXT DEFAULT 'A',
  registration_status TEXT DEFAULT 'ACCEPTED'
    CHECK(registration_status IN ('PENDING','ACCEPTED','REJECTED')),
  PRIMARY KEY (tournament_id, team_id)
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  round TEXT,
  group_name TEXT,
  scheduled_at TEXT NOT NULL,
  venue TEXT,
  field_name TEXT,
  referee TEXT,
  operator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'SCHEDULED'
    CHECK(status IN (
      'SCHEDULED','PRE_MATCH',
      'LIVE_FIRST_HALF','HALF_TIME','LIVE_SECOND_HALF',
      'EXTRA_TIME_1','EXTRA_TIME_2','PENALTY_SHOOTOUT',
      'FULL_TIME','COMPLETED','POSTPONED','CANCELLED'
    )),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  home_penalty_score INTEGER DEFAULT 0,
  away_penalty_score INTEGER DEFAULT 0,
  clock_seconds INTEGER DEFAULT 0,
  is_clock_running INTEGER DEFAULT 0,
  clock_started_at TEXT,
  stoppage_first_half INTEGER DEFAULT 0,
  stoppage_second_half INTEGER DEFAULT 0,
  home_formation TEXT DEFAULT '4-3-3',
  away_formation TEXT DEFAULT '4-4-2',
  man_of_match_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============================================================
-- MATCH PLAYERS (lineup registration per match)
-- ============================================================
CREATE TABLE IF NOT EXISTS match_players (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id),
  is_starter INTEGER DEFAULT 0,
  pitch_position TEXT,
  jersey_number INTEGER,
  minutes_played INTEGER DEFAULT 0,
  subbed_in_minute INTEGER,
  subbed_out_minute INTEGER,
  PRIMARY KEY (match_id, player_id)
);

-- ============================================================
-- MATCH EVENTS (immutable event stream)
-- ============================================================
CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id),
  player_id TEXT REFERENCES players(id),
  secondary_player_id TEXT REFERENCES players(id),
  event_type TEXT NOT NULL CHECK(event_type IN (
    'KICK_OFF','GOAL','OWN_GOAL','YELLOW_CARD','RED_CARD','SECOND_YELLOW',
    'FOUL','PENALTY_AWARDED','PENALTY_SCORED','PENALTY_MISSED','PENALTY_SAVED',
    'CORNER','FREE_KICK','OFFSIDE','SUBSTITUTION','INJURY',
    'HALF_TIME','SECOND_HALF_START','FULL_TIME','EXTRA_TIME_START','PENALTY_SHOOTOUT_START',
    'SHOOTOUT_GOAL','SHOOTOUT_MISS','SHOOTOUT_SAVE',
    'VAR_REVIEW','MATCH_RESUMED'
  )),
  minute INTEGER NOT NULL DEFAULT 0,
  stoppage_minute INTEGER DEFAULT 0,
  period TEXT DEFAULT '1H' CHECK(period IN ('1H','2H','ET1','ET2','PEN')),
  notes TEXT,
  metadata_json TEXT,
  created_by TEXT REFERENCES users(id),
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_player ON match_events(player_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- FOLLOWERS (follow teams, tournaments, matches)
-- ============================================================
CREATE TABLE IF NOT EXISTS followers (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('TEAM','TOURNAMENT','MATCH')),
  entity_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, entity_type, entity_id)
);
