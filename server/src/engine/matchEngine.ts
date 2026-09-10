import { getDb } from '../db/connection';

/**
 * Event-Driven Match Engine
 *
 * All scores, statistics, and standings are DERIVED from match events.
 * This ensures corrections, undos, and historical replay are trivial.
 */

// ============================================================
// SCORE DERIVATION
// ============================================================

interface ScoreDerived {
  homeScore: number;
  awayScore: number;
}

export function deriveMatchScore(matchId: any): ScoreDerived {
  const db = getDb();
  const match = db.prepare('SELECT home_team_id, away_team_id FROM matches WHERE id = ?').get(matchId) as any;
  if (!match) return { homeScore: 0, awayScore: 0 };

  const events = db.prepare(`
    SELECT event_type, team_id FROM match_events
    WHERE match_id = ? AND is_deleted = 0
      AND event_type IN ('GOAL', 'OWN_GOAL', 'PENALTY_SCORED')
  `).all(matchId) as any[];

  let homeScore = 0;
  let awayScore = 0;

  for (const ev of events) {
    if (ev.event_type === 'GOAL' || ev.event_type === 'PENALTY_SCORED') {
      if (ev.team_id === match.home_team_id) homeScore++;
      else if (ev.team_id === match.away_team_id) awayScore++;
    } else if (ev.event_type === 'OWN_GOAL') {
      // Own goal goes to the OTHER team
      if (ev.team_id === match.home_team_id) awayScore++;
      else if (ev.team_id === match.away_team_id) homeScore++;
    }
  }

  return { homeScore, awayScore };
}

/**
 * Recalculate and persist the match score from events
 */
export function updateMatchScore(matchId: any): ScoreDerived {
  const db = getDb();
  const score = deriveMatchScore(matchId);
  db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?')
    .run(score.homeScore, score.awayScore, matchId);
  return score;
}

// ============================================================
// MATCH STATISTICS
// ============================================================

export interface MatchTeamStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
  freeKicks: number;
  penalties: number;
  substitutions: number;
}

export function deriveMatchTeamStats(matchId: string, teamId: string): MatchTeamStats {
  const db = getDb();
  const events = db.prepare(`
    SELECT event_type, team_id FROM match_events
    WHERE match_id = ? AND is_deleted = 0 AND team_id = ?
  `).all(matchId, teamId) as any[];

  const stats: MatchTeamStats = {
    goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0,
    yellowCards: 0, redCards: 0, offsides: 0, freeKicks: 0, penalties: 0, substitutions: 0,
  };

  for (const ev of events) {
    switch (ev.event_type) {
      case 'GOAL':
      case 'PENALTY_SCORED':
        stats.goals++; stats.shotsOnTarget++; stats.shots++; break;
      case 'PENALTY_MISSED':
      case 'PENALTY_SAVED':
        stats.shots++; break;
      case 'CORNER': stats.corners++; break;
      case 'FOUL': stats.fouls++; break;
      case 'YELLOW_CARD': stats.yellowCards++; break;
      case 'RED_CARD':
      case 'SECOND_YELLOW':
        stats.redCards++; break;
      case 'OFFSIDE': stats.offsides++; break;
      case 'FREE_KICK': stats.freeKicks++; break;
      case 'PENALTY_AWARDED': stats.penalties++; break;
      case 'SUBSTITUTION': stats.substitutions++; break;
    }
  }

  return stats;
}

// ============================================================
// TOURNAMENT STANDINGS
// ============================================================

export interface StandingRow {
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  logo: string | null;
}

export function deriveStandings(tournamentId: string): StandingRow[] {
  const db = getDb();

  // Get tournament config
  const tournament = db.prepare('SELECT points_win, points_draw, points_loss FROM tournaments WHERE id = ?')
    .get(tournamentId) as any;
  if (!tournament) return [];

  const { points_win, points_draw, points_loss } = tournament;

  // Get all registered teams
  const regTeams = db.prepare(`
    SELECT t.id, t.name, t.short_name, t.logo
    FROM tournament_teams tt JOIN teams t ON tt.team_id = t.id
    WHERE tt.tournament_id = ? AND tt.registration_status = 'ACCEPTED'
  `).all(tournamentId) as any[];

  // Get all completed matches
  const completedMatches = db.prepare(`
    SELECT home_team_id, away_team_id, home_score, away_score
    FROM matches
    WHERE tournament_id = ? AND status IN ('COMPLETED', 'FULL_TIME')
  `).all(tournamentId) as any[];

  const standingMap: Record<string, StandingRow> = {};

  for (const team of regTeams) {
    standingMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      shortName: team.short_name,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
      logo: team.logo,
    };
  }

  for (const m of completedMatches) {
    const home = standingMap[m.home_team_id];
    const away = standingMap[m.away_team_id];
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.home_score;
    home.goalsAgainst += m.away_score;
    away.goalsFor += m.away_score;
    away.goalsAgainst += m.home_score;

    if (m.home_score > m.away_score) {
      home.won++; home.points += points_win;
      away.lost++; away.points += points_loss;
    } else if (m.home_score < m.away_score) {
      away.won++; away.points += points_win;
      home.lost++; home.points += points_loss;
    } else {
      home.drawn++; home.points += points_draw;
      away.drawn++; away.points += points_draw;
    }
  }

  const standings = Object.values(standingMap);
  for (const s of standings) {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  }

  // Sort by points DESC, goal difference DESC, goals scored DESC
  standings.sort((a, b) =>
    (b.points - a.points) ||
    (b.goalDifference - a.goalDifference) ||
    (b.goalsFor - a.goalsFor)
  );

  return standings;
}

// ============================================================
// PLAYER STATISTICS (aggregated across a tournament or all matches)
// ============================================================

export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  jerseyNumber: number;
  position: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  foulsSuffered: number;
  offsides: number;
  penaltiesScored: number;
  penaltiesMissed: number;
  minutesPlayed: number;
}

export function derivePlayerStats(tournamentId?: string): PlayerStats[] {
  const db = getDb();

  let matchFilter = '';
  const params: any[] = [];

  if (tournamentId) {
    matchFilter = 'AND m.tournament_id = ?';
    params.push(tournamentId);
  }

  // Get all players who participated in matches
  const participants = db.prepare(`
    SELECT DISTINCT mp.player_id, p.name as player_name, mp.team_id,
           t.name as team_name, p.jersey_number, p.position,
           SUM(mp.minutes_played) as total_minutes,
           COUNT(DISTINCT mp.match_id) as matches_played
    FROM match_players mp
    JOIN players p ON mp.player_id = p.id
    JOIN teams t ON mp.team_id = t.id
    JOIN matches m ON mp.match_id = m.id
    WHERE 1=1 ${matchFilter}
    GROUP BY mp.player_id
  `).all(...params) as any[];

  // For each player, aggregate events
  const result: PlayerStats[] = [];

  for (const p of participants) {
    let eventFilter = '';
    const eventParams: any[] = [p.player_id];
    if (tournamentId) {
      eventFilter = 'AND m.tournament_id = ?';
      eventParams.push(tournamentId);
    }

    const events = db.prepare(`
      SELECT event_type, player_id, secondary_player_id FROM match_events me
      JOIN matches m ON me.match_id = m.id
      WHERE me.is_deleted = 0 ${eventFilter}
        AND (me.player_id = ? OR me.secondary_player_id = ?)
    `).all(...eventParams, p.player_id) as any[];

    const stats: PlayerStats = {
      playerId: p.player_id,
      playerName: p.player_name,
      teamId: p.team_id,
      teamName: p.team_name,
      jerseyNumber: p.jersey_number,
      position: p.position,
      matchesPlayed: p.matches_played,
      goals: 0, assists: 0, ownGoals: 0,
      yellowCards: 0, redCards: 0, fouls: 0, foulsSuffered: 0,
      offsides: 0, penaltiesScored: 0, penaltiesMissed: 0,
      minutesPlayed: p.total_minutes || 0,
    };

    for (const ev of events) {
      if (ev.player_id === p.player_id) {
        switch (ev.event_type) {
          case 'GOAL': stats.goals++; break;
          case 'OWN_GOAL': stats.ownGoals++; break;
          case 'PENALTY_SCORED': stats.penaltiesScored++; stats.goals++; break;
          case 'PENALTY_MISSED':
          case 'PENALTY_SAVED': stats.penaltiesMissed++; break;
          case 'YELLOW_CARD': stats.yellowCards++; break;
          case 'RED_CARD':
          case 'SECOND_YELLOW': stats.redCards++; break;
          case 'FOUL': stats.fouls++; break;
          case 'OFFSIDE': stats.offsides++; break;
        }
      }
      // Assists: secondary_player_id on GOAL events
      if (ev.secondary_player_id === p.player_id && (ev.event_type === 'GOAL' || ev.event_type === 'PENALTY_SCORED')) {
        stats.assists++;
      }
      // Fouls suffered: secondary_player_id on FOUL events
      if (ev.secondary_player_id === p.player_id && ev.event_type === 'FOUL') {
        stats.foulsSuffered++;
      }
    }

    result.push(stats);
  }

  return result;
}

// ============================================================
// TOP SCORERS
// ============================================================

export function getTopScorers(tournamentId: string, limit: number = 10) {
  const allStats = derivePlayerStats(tournamentId);
  return allStats
    .filter(s => s.goals > 0)
    .sort((a, b) => (b.goals - a.goals) || (b.assists - a.assists))
    .slice(0, limit);
}

// ============================================================
// MATCH CLOCK HELPERS
// ============================================================

export function getEffectiveClockSeconds(match: any): number {
  if (!match.is_clock_running || !match.clock_started_at) {
    return match.clock_seconds;
  }
  const elapsed = (Date.now() - new Date(match.clock_started_at).getTime()) / 1000;
  return match.clock_seconds + Math.floor(elapsed);
}

export function formatMatchMinute(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
