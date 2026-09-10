import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Shield,
  Zap,
} from 'lucide-react';

export default function ManagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tournaments' | 'teams' | 'matches'>('tournaments');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Form states
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    location: 'Mumbai, India',
    format: 'LEAGUE',
    half_duration: 45,
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    start_date: new Date().toISOString().split('T')[0],
  });

  const [teamForm, setTeamForm] = useState({
    name: '',
    short_name: '',
    city: 'Mumbai',
    primary_color: '#10b981',
    secondary_color: '#0f172a',
  });

  const [playerForm, setPlayerForm] = useState({
    name: '',
    jersey_number: 10,
    position: 'ST',
    team_id: '',
  });

  const [matchForm, setMatchForm] = useState({
    tournament_id: '',
    home_team_id: '',
    away_team_id: '',
    scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    venue: 'Cooperage Football Ground, Mumbai',
    referee: 'Official Referee',
    round: 'Matchday 1',
  });

  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, tmRes, mRes] = await Promise.all([
        api.getTournaments(),
        api.getTeams(),
        api.getMatches(),
      ]);
      setTournaments(tRes.tournaments || []);
      setTeams(tmRes.teams || []);
      setMatches(mRes.matches || []);

      if (tRes.tournaments?.length && !matchForm.tournament_id) {
        setMatchForm(prev => ({ ...prev, tournament_id: tRes.tournaments[0].id }));
      }
      if (tmRes.teams?.length >= 2 && !matchForm.home_team_id) {
        setMatchForm(prev => ({
          ...prev,
          home_team_id: tmRes.teams[0].id,
          away_team_id: tmRes.teams[1].id,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.createTournament(tournamentForm);
      showSuccess('Tournament created successfully!');
      setShowTournamentModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tournament');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.createTeam(teamForm);
      showSuccess('Team created successfully!');
      setShowTeamModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create team');
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.createPlayer(playerForm);
      showSuccess('Player added to squad!');
      setShowPlayerModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create player');
    }
  };

  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (matchForm.home_team_id === matchForm.away_team_id) {
      alert('Home and Away teams must be different');
      return;
    }
    try {
      await api.createMatch(matchForm);
      showSuccess('Match scheduled successfully!');
      setShowMatchModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule match');
    }
  };

  const handleGenerateFixtures = async (tournamentId: string) => {
    if (!confirm('Auto-generate round-robin fixtures for all registered teams?')) return;
    try {
      const res = await api.generateFixtures(tournamentId);
      showSuccess(`Generated ${res.count} match fixture(s)!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate fixtures (ensure >= 2 teams registered)');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-pitch-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold tracking-tight">Organizer & Admin Hub</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              OPERATOR
            </span>
          </div>
          <p className="text-sm text-pitch-400 mt-1">
            Create tournaments, manage teams & squads, schedule matches, and launch pitch-side live scoring.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTournamentModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-pitch-950 font-bold text-xs font-mono transition shadow-lg shadow-emerald-500/10"
          >
            <Plus size={14} /> New Tournament
          </button>
          <button
            onClick={() => setShowTeamModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pitch-800 hover:bg-pitch-700 text-white font-medium text-xs font-mono border border-pitch-700 transition"
          >
            <Plus size={14} /> New Team
          </button>
          <button
            onClick={() => setShowMatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pitch-800 hover:bg-pitch-700 text-white font-medium text-xs font-mono border border-pitch-700 transition"
          >
            <Plus size={14} /> Schedule Match
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-pitch-800 mb-6 gap-6 font-mono text-xs">
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'tournaments'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-pitch-400 hover:text-white'
          }`}
        >
          <Trophy size={14} /> Tournaments ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'teams'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-pitch-400 hover:text-white'
          }`}
        >
          <Users size={14} /> Teams & Squads ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'matches'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-pitch-400 hover:text-white'
          }`}
        >
          <Zap size={14} /> Matches & Live Scoring ({matches.length})
        </button>
      </div>

      {/* TAB 1: Tournaments */}
      {activeTab === 'tournaments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.map(t => (
              <div
                key={t.id}
                className="bg-pitch-900 border border-pitch-700/50 rounded-2xl p-5 hover:border-emerald-500/40 transition group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pitch-800 border border-pitch-700 text-pitch-400 font-mono font-bold">
                      {t.format}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 group-hover:text-emerald-400 transition">
                      {t.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold ${
                      t.status === 'LIVE'
                        ? 'bg-crimson-500/20 text-crimson-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-pitch-400 my-4 bg-pitch-950/60 p-3 rounded-xl border border-pitch-800">
                  <div>Teams: <span className="text-white font-bold">{t.team_count || 0}</span></div>
                  <div>Matches: <span className="text-white font-bold">{t.match_count || 0}</span></div>
                  <div>Half: <span className="text-white font-bold">{t.half_duration}m</span></div>
                  <div>Win: <span className="text-white font-bold">+{t.points_win}pts</span></div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-pitch-800">
                  <button
                    onClick={() => handleGenerateFixtures(t.id)}
                    className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    ⚡ Auto-Generate Fixtures
                  </button>
                  <Link
                    to={`/tournament/${t.id}`}
                    className="px-3 py-1.5 rounded-lg bg-pitch-800 hover:bg-pitch-700 text-xs font-mono text-white transition"
                  >
                    View Hub →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Teams */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teams.map(tm => (
              <div
                key={tm.id}
                className="bg-pitch-900 border border-pitch-700/50 rounded-2xl p-5 hover:border-pitch-600 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    style={{ backgroundColor: tm.primary_color || '#10b981' }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-pitch-950 text-base shadow"
                  >
                    {tm.short_name?.[0] || 'T'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white truncate">{tm.name}</h3>
                    <p className="text-xs text-pitch-400 font-mono">{tm.city || 'Club'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-pitch-400 bg-pitch-950/60 p-2.5 rounded-lg border border-pitch-800 mb-3">
                  <span>Squad Size</span>
                  <span className="text-white font-bold">{tm.squad_size || 0} players</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPlayerForm(p => ({ ...p, team_id: tm.id }));
                      setSelectedTeamId(tm.name);
                      setShowPlayerModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30 transition text-center"
                  >
                    + Add Player
                  </button>
                  <Link
                    to={`/team/${tm.id}`}
                    className="px-3 py-1.5 rounded-lg bg-pitch-800 hover:bg-pitch-700 text-xs font-mono text-white transition text-center"
                  >
                    Squad →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Matches & Live Scoring Launchpad */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {matches.map(m => (
            <div
              key={m.id}
              className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-pitch-600 transition"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                    m.status.startsWith('LIVE')
                      ? 'bg-crimson-500/20 text-crimson-400'
                      : m.status === 'COMPLETED'
                      ? 'bg-pitch-800 text-pitch-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {m.status.replace(/_/g, ' ')}
                </span>
                <div>
                  <p className="font-bold text-sm text-white">
                    {m.home_team_name} <span className="text-emerald-400 font-mono">{m.home_score}</span> —{' '}
                    <span className="text-blue-400 font-mono">{m.away_score}</span> {m.away_team_name}
                  </p>
                  <p className="text-xs text-pitch-500 font-mono mt-0.5">
                    {m.tournament_name} · {m.round || 'Match'} · {new Date(m.scheduled_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  to={`/match/${m.id}/score`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-pitch-950 font-bold text-xs font-mono transition"
                >
                  <Play size={12} /> Score Console
                </Link>
                <Link
                  to={`/match/${m.id}`}
                  className="px-3 py-1.5 rounded-lg bg-pitch-800 hover:bg-pitch-700 text-xs font-mono text-pitch-200 transition"
                >
                  Spectator View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create Tournament */}
      {showTournamentModal && (
        <div className="fixed inset-0 z-50 bg-pitch-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-pitch-900 border border-pitch-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Create New Tournament</h2>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <div>
                <label className="text-xs text-pitch-400 font-mono">Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore Super Cup 2026"
                  value={tournamentForm.name}
                  onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Format</label>
                  <select
                    value={tournamentForm.format}
                    onChange={e => setTournamentForm({ ...tournamentForm, format: e.target.value })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  >
                    <option value="LEAGUE">League</option>
                    <option value="KNOCKOUT">Knockout</option>
                    <option value="GROUP_AND_KNOCKOUT">Group + Knockout</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Half Duration (mins)</label>
                  <input
                    type="number"
                    value={tournamentForm.half_duration}
                    onChange={e => setTournamentForm({ ...tournamentForm, half_duration: Number(e.target.value) })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-pitch-400 font-mono">Location / City</label>
                <input
                  type="text"
                  value={tournamentForm.location}
                  onChange={e => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTournamentModal(false)}
                  className="px-4 py-2 rounded-lg bg-pitch-800 text-pitch-400 hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-pitch-950 font-bold text-xs font-mono hover:bg-emerald-400"
                >
                  Create Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Team */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-pitch-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-pitch-900 border border-pitch-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Register New Team</h2>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="text-xs text-pitch-400 font-mono">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore Rovers"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Short Code (3-4 chars)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="BLR"
                    value={teamForm.short_name}
                    onChange={e => setTeamForm({ ...teamForm, short_name: e.target.value.toUpperCase() })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-pitch-400 font-mono">City</label>
                  <input
                    type="text"
                    value={teamForm.city}
                    onChange={e => setTeamForm({ ...teamForm, city: e.target.value })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-pitch-400 font-mono">Primary Color</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    value={teamForm.primary_color}
                    onChange={e => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-pitch-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-pitch-300">{teamForm.primary_color}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 rounded-lg bg-pitch-800 text-pitch-400 hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-pitch-950 font-bold text-xs font-mono hover:bg-emerald-400"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Player */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-pitch-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-pitch-900 border border-pitch-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Add Player to {selectedTeamId || 'Squad'}</h2>
            <form onSubmit={handleCreatePlayer} className="space-y-3">
              <div>
                <label className="text-xs text-pitch-400 font-mono">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Chhetri"
                  value={playerForm.name}
                  onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Jersey Number</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={playerForm.jersey_number}
                    onChange={e => setPlayerForm({ ...playerForm, jersey_number: Number(e.target.value) })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Position</label>
                  <select
                    value={playerForm.position}
                    onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  >
                    <option value="GK">Goalkeeper (GK)</option>
                    <option value="CB">Center Back (CB)</option>
                    <option value="LB">Left Back (LB)</option>
                    <option value="RB">Right Back (RB)</option>
                    <option value="DM">Defensive Mid (DM)</option>
                    <option value="CM">Central Mid (CM)</option>
                    <option value="CAM">Attacking Mid (CAM)</option>
                    <option value="LW">Left Winger (LW)</option>
                    <option value="RW">Right Winger (RW)</option>
                    <option value="ST">Striker (ST)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlayerModal(false)}
                  className="px-4 py-2 rounded-lg bg-pitch-800 text-pitch-400 hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-pitch-950 font-bold text-xs font-mono hover:bg-emerald-400"
                >
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Match */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-pitch-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-pitch-900 border border-pitch-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Schedule Match</h2>
            <form onSubmit={handleScheduleMatch} className="space-y-3">
              <div>
                <label className="text-xs text-pitch-400 font-mono">Tournament</label>
                <select
                  value={matchForm.tournament_id}
                  onChange={e => setMatchForm({ ...matchForm, tournament_id: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Home Team</label>
                  <select
                    value={matchForm.home_team_id}
                    onChange={e => setMatchForm({ ...matchForm, home_team_id: e.target.value })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-pitch-400 font-mono">Away Team</label>
                  <select
                    value={matchForm.away_team_id}
                    onChange={e => setMatchForm({ ...matchForm, away_team_id: e.target.value })}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-pitch-400 font-mono">Date & Time</label>
                <input
                  type="datetime-local"
                  value={matchForm.scheduled_at}
                  onChange={e => setMatchForm({ ...matchForm, scheduled_at: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-pitch-400 font-mono">Venue</label>
                <input
                  type="text"
                  value={matchForm.venue}
                  onChange={e => setMatchForm({ ...matchForm, venue: e.target.value })}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-3 py-2 text-sm text-white mt-1 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 rounded-lg bg-pitch-800 text-pitch-400 hover:text-white text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-pitch-950 font-bold text-xs font-mono hover:bg-emerald-400"
                >
                  Schedule Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
