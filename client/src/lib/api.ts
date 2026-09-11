const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('footyheroes_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 3001.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${res.status}): backend may be down or misconfigured.`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, role: string = 'SPECTATOR') =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
  firebaseSync: (data: { email: string; name?: string; photoURL?: string; uid?: string }) =>
    request('/auth/firebase-sync', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Teams
  getTeams: () => request('/teams'),
  getTeam: (id: string) => request(`/teams/${id}`),
  createTeam: (data: any) => request('/teams', { method: 'POST', body: JSON.stringify(data) }),

  // Players
  getPlayers: (teamId?: string) => request(`/players${teamId ? `?team_id=${teamId}` : ''}`),
  getPlayer: (id: string) => request(`/players/${id}`),
  createPlayer: (data: any) => request('/players', { method: 'POST', body: JSON.stringify(data) }),

  // Tournaments
  getTournaments: () => request('/tournaments'),
  getTournament: (id: string) => request(`/tournaments/${id}`),
  getTournamentStats: (id: string) => request(`/tournaments/${id}/stats`),
  createTournament: (data: any) => request('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  registerTeam: (tournamentId: string, teamId: string) =>
    request(`/tournaments/${tournamentId}/teams`, { method: 'POST', body: JSON.stringify({ team_id: teamId }) }),
  generateFixtures: (tournamentId: string) =>
    request(`/tournaments/${tournamentId}/generate-fixtures`, { method: 'POST' }),

  // Matches
  getMatches: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/matches${qs}`);
  },
  getLiveMatches: () => request('/matches/live'),
  getMatch: (id: string) => request(`/matches/${id}`),
  createMatch: (data: any) => request('/matches', { method: 'POST', body: JSON.stringify(data) }),

  // Match lifecycle
  startMatch: (id: string) => request(`/matches/${id}/start`, { method: 'POST' }),
  controlClock: (id: string, action: string, seconds?: number) =>
    request(`/matches/${id}/clock`, { method: 'POST', body: JSON.stringify({ action, seconds }) }),
  setLineup: (matchId: string, data: any) =>
    request(`/matches/${matchId}/lineup`, { method: 'POST', body: JSON.stringify(data) }),

  // Match events
  recordEvent: (matchId: string, data: any) =>
    request(`/matches/${matchId}/events`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (matchId: string, eventId: string) =>
    request(`/matches/${matchId}/events/${eventId}`, { method: 'DELETE' }),
  undoLastEvent: (matchId: string) =>
    request(`/matches/${matchId}/undo`, { method: 'POST' }),
  setMotm: (matchId: string, playerId: string) =>
    request(`/matches/${matchId}/motm`, { method: 'POST', body: JSON.stringify({ player_id: playerId }) }),

  // Search
  search: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),
};
