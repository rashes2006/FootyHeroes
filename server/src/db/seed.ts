import { initDb, getDb, closeDb } from './connection';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Seed the database with realistic demo data:
 * - Users with different roles
 * - Two teams: Mumbai Strikers & Delhi United with full squads
 * - Mumbai Premier League tournament (LEAGUE format)
 * - Two additional teams for league depth
 * - Scheduled matches (fixtures)
 * - One live/completed demo match with full event timeline
 */
async function seed() {
  initDb();
  const db = getDb();

  // Clear existing data
  db.exec(`
    DELETE FROM match_events;
    DELETE FROM match_players;
    DELETE FROM matches;
    DELETE FROM tournament_teams;
    DELETE FROM tournaments;
    DELETE FROM players;
    DELETE FROM teams;
    DELETE FROM audit_logs;
    DELETE FROM followers;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // ================================================================
  // USERS
  // ================================================================
  const users = {
    admin:     { id: uuid(), name: 'Admin',           email: 'admin@footyheroes.com',    role: 'SUPER_ADMIN' },
    organizer: { id: uuid(), name: 'Vikram Mehta',    email: 'vikram@footyheroes.com',   role: 'ORGANIZER' },
    manager1:  { id: uuid(), name: 'Suresh Raina',    email: 'suresh@mumbaistrikers.com',role: 'TEAM_MANAGER' },
    manager2:  { id: uuid(), name: 'Pradeep Kumar',   email: 'pradeep@delhiunited.com',  role: 'TEAM_MANAGER' },
    scorer:    { id: uuid(), name: 'Match Operator',   email: 'scorer@footyheroes.com',   role: 'SCORER' },
    spectator: { id: uuid(), name: 'Football Fan',    email: 'fan@footyheroes.com',      role: 'SPECTATOR' },
    manager3:  { id: uuid(), name: 'Anil Sharma',     email: 'anil@bengalurufc.com',     role: 'TEAM_MANAGER' },
    manager4:  { id: uuid(), name: 'Rajesh Singh',    email: 'rajesh@chennaitigers.com', role: 'TEAM_MANAGER' },
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)
  `);

  for (const u of Object.values(users)) {
    insertUser.run(u.id, u.name, u.email, passwordHash, u.role);
  }

  // ================================================================
  // TEAMS
  // ================================================================
  const teams = {
    mumbai: {
      id: uuid(), name: 'Mumbai Strikers', short_name: 'MUM',
      city: 'Mumbai', description: 'The pride of Mumbai football',
      manager_id: users.manager1.id, founded_year: 2018
    },
    delhi: {
      id: uuid(), name: 'Delhi United', short_name: 'DEL',
      city: 'Delhi', description: 'Capital city warriors',
      manager_id: users.manager2.id, founded_year: 2019
    },
    bengaluru: {
      id: uuid(), name: 'Bengaluru FC', short_name: 'BFC',
      city: 'Bengaluru', description: 'Silicon Valley of Indian football',
      manager_id: users.manager3.id, founded_year: 2017
    },
    chennai: {
      id: uuid(), name: 'Chennai Tigers', short_name: 'CHE',
      city: 'Chennai', description: 'Roaring from the south',
      manager_id: users.manager4.id, founded_year: 2020
    },
  };

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, short_name, city, description, manager_id, founded_year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of Object.values(teams)) {
    insertTeam.run(t.id, t.name, t.short_name, t.city, t.description, t.manager_id, t.founded_year);
  }

  // ================================================================
  // PLAYERS — Full squads for Mumbai & Delhi
  // ================================================================
  const insertPlayer = db.prepare(`
    INSERT INTO players (id, team_id, name, jersey_number, position, preferred_foot)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Mumbai Strikers Squad
  const mumbaiPlayers: Record<string, { id: string; name: string; number: number; pos: string; foot: string }> = {};
  const mumbaiSquad = [
    { name: 'Vikash Sharma',     number: 1,  pos: 'GK',  foot: 'RIGHT' },
    { name: 'Deepak Nair',       number: 2,  pos: 'RB',  foot: 'RIGHT' },
    { name: 'Ajay Mishra',       number: 4,  pos: 'CB',  foot: 'RIGHT' },
    { name: 'Sameer Joshi',      number: 5,  pos: 'CB',  foot: 'LEFT'  },
    { name: 'Ravi Patel',        number: 3,  pos: 'LB',  foot: 'LEFT'  },
    { name: 'Kiran Rao',         number: 6,  pos: 'DM',  foot: 'RIGHT' },
    { name: 'Arjun Singh',       number: 8,  pos: 'CM',  foot: 'RIGHT' },
    { name: 'Nikhil Verma',      number: 10, pos: 'CAM', foot: 'RIGHT' },
    { name: 'Rahul Sharma',      number: 7,  pos: 'RW',  foot: 'LEFT'  },
    { name: 'Sanjay Gupta',      number: 11, pos: 'LW',  foot: 'LEFT'  },
    { name: 'Amit Kumar',        number: 9,  pos: 'ST',  foot: 'RIGHT' },
    // Subs
    { name: 'Rohit Mehta',       number: 12, pos: 'GK',  foot: 'RIGHT' },
    { name: 'Vishal Tiwari',     number: 14, pos: 'CB',  foot: 'RIGHT' },
    { name: 'Manoj Dubey',       number: 15, pos: 'CM',  foot: 'RIGHT' },
    { name: 'Pranav Desai',      number: 16, pos: 'RW',  foot: 'RIGHT' },
    { name: 'Yash Chauhan',      number: 17, pos: 'ST',  foot: 'LEFT'  },
  ];

  for (const p of mumbaiSquad) {
    const pid = uuid();
    insertPlayer.run(pid, teams.mumbai.id, p.name, p.number, p.pos, p.foot);
    mumbaiPlayers[p.name] = { id: pid, name: p.name, number: p.number, pos: p.pos, foot: p.foot };
  }

  // Delhi United Squad
  const delhiPlayers: Record<string, { id: string; name: string; number: number; pos: string; foot: string }> = {};
  const delhiSquad = [
    { name: 'Naveen Reddy',      number: 1,  pos: 'GK',  foot: 'RIGHT' },
    { name: 'Sunil Yadav',       number: 2,  pos: 'RB',  foot: 'RIGHT' },
    { name: 'David Kumar',       number: 4,  pos: 'CB',  foot: 'RIGHT' },
    { name: 'Vikram Chauhan',    number: 5,  pos: 'CB',  foot: 'LEFT'  },
    { name: 'Arun Pillai',       number: 3,  pos: 'LB',  foot: 'LEFT'  },
    { name: 'Mohit Saxena',      number: 6,  pos: 'DM',  foot: 'RIGHT' },
    { name: 'Harsh Pandey',      number: 8,  pos: 'CM',  foot: 'RIGHT' },
    { name: 'Tarun Kapoor',      number: 10, pos: 'CAM', foot: 'LEFT'  },
    { name: 'Akash Thakur',      number: 7,  pos: 'RW',  foot: 'RIGHT' },
    { name: 'Siddharth Menon',   number: 11, pos: 'LW',  foot: 'LEFT'  },
    { name: 'Rohan Bhatia',      number: 9,  pos: 'ST',  foot: 'RIGHT' },
    // Subs
    { name: 'Neeraj Garg',       number: 12, pos: 'GK',  foot: 'RIGHT' },
    { name: 'Pankaj Jain',       number: 14, pos: 'CB',  foot: 'RIGHT' },
    { name: 'Gaurav Sinha',      number: 15, pos: 'CM',  foot: 'LEFT'  },
    { name: 'Kunal Malhotra',    number: 16, pos: 'LW',  foot: 'LEFT'  },
    { name: 'Sahil Oberoi',      number: 17, pos: 'ST',  foot: 'RIGHT' },
  ];

  for (const p of delhiSquad) {
    const pid = uuid();
    insertPlayer.run(pid, teams.delhi.id, p.name, p.number, p.pos, p.foot);
    delhiPlayers[p.name] = { id: pid, name: p.name, number: p.number, pos: p.pos, foot: p.foot };
  }

  // Bengaluru & Chennai squads (abbreviated for seeding)
  const bfcSquad = [
    'Aditya GK', 'Raghu RB', 'Suresh CB', 'Vinay CB', 'Ramesh LB',
    'Ganesh DM', 'Chetan CM', 'Prakash CAM', 'Lokesh RW', 'Dinesh LW', 'Mahesh ST',
    'Spare GK2', 'Spare CB3', 'Spare CM2', 'Spare RW2', 'Spare ST2'
  ];
  const positions = ['GK','RB','CB','CB','LB','DM','CM','CAM','RW','LW','ST','GK','CB','CM','RW','ST'];

  for (let i = 0; i < bfcSquad.length; i++) {
    insertPlayer.run(uuid(), teams.bengaluru.id, bfcSquad[i], i + 1, positions[i], 'RIGHT');
  }

  const cheSquad = [
    'Praveen GK', 'Ashwin RB', 'Kartik CB', 'Deepak CB', 'Shankar LB',
    'Bharath DM', 'Venkat CM', 'Anand CAM', 'Surya RW', 'Karthik LW', 'Vijay ST',
    'Spare GK3', 'Spare CB4', 'Spare CM3', 'Spare LW2', 'Spare ST3'
  ];

  for (let i = 0; i < cheSquad.length; i++) {
    insertPlayer.run(uuid(), teams.chennai.id, cheSquad[i], i + 1, positions[i], 'RIGHT');
  }

  // ================================================================
  // TOURNAMENT — Mumbai Premier League
  // ================================================================
  const tournamentId = uuid();
  db.prepare(`
    INSERT INTO tournaments (id, name, organizer_id, location, start_date, end_date, format, status, half_duration, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tournamentId,
    'Mumbai Premier League 2026',
    users.organizer.id,
    'Mumbai, Maharashtra',
    '2026-09-15',
    '2026-10-30',
    'LEAGUE',
    'LIVE',
    45,
    'The biggest amateur football league in Mumbai. 4 teams battle it out in a round-robin format for the championship.'
  );

  // Register all 4 teams
  const insertTT = db.prepare(`
    INSERT INTO tournament_teams (tournament_id, team_id, group_name, registration_status)
    VALUES (?, ?, ?, ?)
  `);

  insertTT.run(tournamentId, teams.mumbai.id, 'A', 'ACCEPTED');
  insertTT.run(tournamentId, teams.delhi.id, 'A', 'ACCEPTED');
  insertTT.run(tournamentId, teams.bengaluru.id, 'A', 'ACCEPTED');
  insertTT.run(tournamentId, teams.chennai.id, 'A', 'ACCEPTED');

  // ================================================================
  // MATCHES — Generate full round-robin fixtures
  // ================================================================
  const insertMatch = db.prepare(`
    INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, scheduled_at, venue, operator_id, status, round, home_score, away_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const teamList = [teams.mumbai, teams.delhi, teams.bengaluru, teams.chennai];
  const matchIds: string[] = [];
  let matchDay = 15;
  let roundNum = 1;

  // Round-robin: each team plays every other team once
  for (let i = 0; i < teamList.length; i++) {
    for (let j = i + 1; j < teamList.length; j++) {
      const matchId = uuid();
      matchIds.push(matchId);
      const isFirstMatch = (i === 0 && j === 1); // Mumbai vs Delhi — the demo match
      insertMatch.run(
        matchId,
        tournamentId,
        teamList[i].id,
        teamList[j].id,
        `2026-09-${String(matchDay).padStart(2, '0')}T19:00:00`,
        'DY Patil Stadium, Mumbai',
        users.scorer.id,
        isFirstMatch ? 'COMPLETED' : 'SCHEDULED',
        `Round ${roundNum}`,
        isFirstMatch ? 2 : 0,
        isFirstMatch ? 0 : 0,
      );
      matchDay += 3;
      roundNum++;
    }
  }

  // The first match is Mumbai Strikers vs Delhi United (completed demo)
  const demoMatchId = matchIds[0];

  // ================================================================
  // MATCH PLAYERS — Starting XI for demo match
  // ================================================================
  const insertMP = db.prepare(`
    INSERT INTO match_players (match_id, player_id, team_id, is_starter, pitch_position, jersey_number, minutes_played)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Mumbai Starting XI (4-3-3)
  const mumbaiStarters = ['Vikash Sharma', 'Deepak Nair', 'Ajay Mishra', 'Sameer Joshi', 'Ravi Patel',
                           'Kiran Rao', 'Arjun Singh', 'Nikhil Verma',
                           'Rahul Sharma', 'Sanjay Gupta', 'Amit Kumar'];
  const mumbaiSubs = ['Rohit Mehta', 'Vishal Tiwari', 'Manoj Dubey', 'Pranav Desai', 'Yash Chauhan'];

  for (const name of mumbaiStarters) {
    const p = mumbaiPlayers[name];
    insertMP.run(demoMatchId, p.id, teams.mumbai.id, 1, p.pos, p.number, name === 'Rahul Sharma' ? 52 : 90);
  }
  for (const name of mumbaiSubs) {
    const p = mumbaiPlayers[name];
    const mins = name === 'Amit Kumar' ? 0 : (name === 'Pranav Desai' ? 0 : 0);
    insertMP.run(demoMatchId, p.id, teams.mumbai.id, 0, null, p.number, mins);
  }

  // Delhi Starting XI (4-4-2)
  const delhiStarters = ['Naveen Reddy', 'Sunil Yadav', 'David Kumar', 'Vikram Chauhan', 'Arun Pillai',
                          'Mohit Saxena', 'Harsh Pandey', 'Tarun Kapoor', 'Akash Thakur',
                          'Siddharth Menon', 'Rohan Bhatia'];
  const delhiSubs = ['Neeraj Garg', 'Pankaj Jain', 'Gaurav Sinha', 'Kunal Malhotra', 'Sahil Oberoi'];

  for (const name of delhiStarters) {
    const p = delhiPlayers[name];
    insertMP.run(demoMatchId, p.id, teams.delhi.id, 1, p.pos, p.number, name === 'David Kumar' ? 71 : 90);
  }
  for (const name of delhiSubs) {
    const p = delhiPlayers[name];
    insertMP.run(demoMatchId, p.id, teams.delhi.id, 0, null, p.number, 0);
  }

  // ================================================================
  // MATCH EVENTS — Demo match timeline (Mumbai 2 - 0 Delhi)
  // ================================================================
  const insertEvent = db.prepare(`
    INSERT INTO match_events (id, match_id, team_id, player_id, secondary_player_id, event_type, minute, stoppage_minute, period, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const events = [
    { type: 'KICK_OFF',        min: 0,  period: '1H', team: null,          player: null,                  secondary: null,                     notes: 'Match started' },
    { type: 'GOAL',            min: 12, period: '1H', team: teams.mumbai,  player: mumbaiPlayers['Rahul Sharma'],  secondary: mumbaiPlayers['Arjun Singh'], notes: 'Beautiful strike from outside the box' },
    { type: 'YELLOW_CARD',     min: 27, period: '1H', team: teams.delhi,   player: delhiPlayers['David Kumar'],    secondary: null,                     notes: 'Reckless tackle from behind' },
    { type: 'CORNER',          min: 31, period: '1H', team: teams.mumbai,  player: null,                  secondary: null,                     notes: 'Deflected off defender' },
    { type: 'FOUL',            min: 42, period: '1H', team: teams.delhi,   player: delhiPlayers['David Kumar'],    secondary: mumbaiPlayers['Rahul Sharma'], notes: 'Hard tackle on the edge of the box' },
    { type: 'HALF_TIME',       min: 45, period: '1H', team: null,          player: null,                  secondary: null,                     notes: 'Half Time — Mumbai Strikers 1 - 0 Delhi United' },
    { type: 'SECOND_HALF_START', min: 45, period: '2H', team: null,       player: null,                  secondary: null,                     notes: 'Second half underway' },
    { type: 'SUBSTITUTION',    min: 52, period: '2H', team: teams.mumbai,  player: mumbaiPlayers['Amit Kumar'],    secondary: mumbaiPlayers['Rahul Sharma'], notes: 'Tactical substitution — Amit Kumar replaces Rahul Sharma' },
    { type: 'PENALTY_AWARDED', min: 64, period: '2H', team: teams.mumbai,  player: null,                  secondary: null,                     notes: 'Handball in the box by Delhi defender' },
    { type: 'PENALTY_SCORED',  min: 65, period: '2H', team: teams.mumbai,  player: mumbaiPlayers['Arjun Singh'],   secondary: null,                     notes: 'Arjun Singh sends the keeper the wrong way' },
    { type: 'RED_CARD',        min: 71, period: '2H', team: teams.delhi,   player: delhiPlayers['David Kumar'],    secondary: null,                     notes: 'Professional foul — last man, denying clear goal-scoring opportunity' },
    { type: 'FULL_TIME',       min: 90, period: '2H', team: null,          player: null,                  secondary: null,                     notes: 'Full Time — Mumbai Strikers 2 - 0 Delhi United' },
  ];

  for (const ev of events) {
    insertEvent.run(
      uuid(),
      demoMatchId,
      ev.team?.id ?? null,
      ev.player?.id ?? null,
      ev.secondary?.id ?? null,
      ev.type,
      ev.min,
      0,
      ev.period,
      ev.notes,
      users.scorer.id,
    );
  }

  console.log('✅ Seed data inserted successfully');
  console.log('');
  console.log('📊 Demo Data Summary:');
  console.log(`   Users: ${Object.keys(users).length}`);
  console.log(`   Teams: ${Object.keys(teams).length}`);
  console.log(`   Tournament: Mumbai Premier League 2026`);
  console.log(`   Matches: ${matchIds.length} (1 completed, ${matchIds.length - 1} scheduled)`);
  console.log(`   Demo Match: Mumbai Strikers 2 - 0 Delhi United (COMPLETED)`);
  console.log(`   Match Events: ${events.length}`);
  console.log('');
  console.log('🔑 Login credentials (all passwords: password123):');
  for (const [key, u] of Object.entries(users)) {
    console.log(`   ${u.role.padEnd(14)} — ${u.email}`);
  }

  closeDb();
}

seed().catch(console.error);
