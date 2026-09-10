import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy, Calendar, MapPin, Users, Target, AlertTriangle, ChevronRight } from 'lucide-react';

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('standings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getTournament(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-pitch-500">Tournament not found</div>;

  const { tournament, teams, matches, standings, topScorers, topAssists } = data;
  const liveMatches = matches.filter((m: any) => m.status.startsWith('LIVE') || m.status === 'HALF_TIME');
  const completed = matches.filter((m: any) => m.status === 'COMPLETED' || m.status === 'FULL_TIME');
  const upcoming = matches.filter((m: any) => m.status === 'SCHEDULED');

  const tabs = [
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'stats', label: 'Stats', icon: Target },
    { id: 'teams', label: 'Teams', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pitch-900 via-pitch-800 to-emerald-500/10 border border-pitch-700/50 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold mb-2 inline-block ${
              tournament.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pitch-700 text-pitch-400'
            }`}>{tournament.status}</span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-pitch-400">
              <span className="flex items-center gap-1"><MapPin size={12} /> {tournament.location}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {tournament.start_date} — {tournament.end_date}</span>
              <span className="flex items-center gap-1"><Users size={12} /> {teams.length} teams</span>
              <span className="font-mono bg-pitch-800 px-2 py-0.5 rounded">{tournament.format}</span>
            </div>
            {tournament.description && <p className="text-pitch-400 text-sm mt-3 max-w-xl">{tournament.description}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-pitch-900 border border-pitch-700/50 rounded-xl p-1.5 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-emerald-500 text-pitch-900 font-bold' : 'text-pitch-400 hover:text-white hover:bg-pitch-800'
            }`}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pitch-800 text-pitch-400 text-xs font-mono">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="text-center px-2 py-3">P</th>
                  <th className="text-center px-2 py-3">W</th>
                  <th className="text-center px-2 py-3">D</th>
                  <th className="text-center px-2 py-3">L</th>
                  <th className="text-center px-2 py-3">GF</th>
                  <th className="text-center px-2 py-3">GA</th>
                  <th className="text-center px-2 py-3">GD</th>
                  <th className="text-center px-3 py-3 font-bold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row: any, i: number) => (
                  <tr key={row.teamId} className={`border-t border-pitch-800 hover:bg-pitch-800/50 transition ${i === 0 ? 'border-l-2 border-l-emerald-500' : ''}`}>
                    <td className="px-4 py-3 text-pitch-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/team/${row.teamId}`} className="font-medium hover:text-emerald-400 transition">
                        {row.teamName}
                      </Link>
                    </td>
                    <td className="text-center px-2 py-3 text-pitch-300">{row.played}</td>
                    <td className="text-center px-2 py-3 text-emerald-400 font-medium">{row.won}</td>
                    <td className="text-center px-2 py-3 text-pitch-400">{row.drawn}</td>
                    <td className="text-center px-2 py-3 text-crimson-400">{row.lost}</td>
                    <td className="text-center px-2 py-3 text-pitch-300">{row.goalsFor}</td>
                    <td className="text-center px-2 py-3 text-pitch-300">{row.goalsAgainst}</td>
                    <td className="text-center px-2 py-3 font-mono text-xs">
                      <span className={row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-crimson-400' : 'text-pitch-400'}>
                        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3 font-display font-bold text-lg text-emerald-400">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fixtures Tab */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          {liveMatches.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-crimson-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-crimson-500 animate-live-pulse" /> LIVE
              </h3>
              {liveMatches.map((m: any) => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-pitch-400 mb-3">UPCOMING</h3>
              <div className="space-y-2">{upcoming.map((m: any) => <MatchCard key={m.id} match={m} />)}</div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-pitch-400 mb-3">COMPLETED</h3>
              <div className="space-y-2">{completed.map((m: any) => <MatchCard key={m.id} match={m} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
              <span className="text-amber-400">🏆</span> TOP SCORERS
            </h3>
            <div className="space-y-2">
              {topScorers.map((p: any, i: number) => (
                <Link to={`/player/${p.playerId}`} key={p.playerId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-pitch-800 transition">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-500/30 text-amber-400' : i === 1 ? 'bg-pitch-600 text-pitch-300' : 'bg-pitch-700 text-pitch-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.playerName}</p>
                    <p className="text-[10px] text-pitch-500">{p.teamName} · #{p.jerseyNumber}</p>
                  </div>
                  <span className="font-display font-bold text-lg text-emerald-400">{p.goals}</span>
                </Link>
              ))}
              {topScorers.length === 0 && <p className="text-pitch-600 text-xs">No goals scored yet</p>}
            </div>
          </div>

          <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
              <span className="text-blue-400">🎯</span> TOP ASSISTS
            </h3>
            <div className="space-y-2">
              {topAssists.map((p: any, i: number) => (
                <Link to={`/player/${p.playerId}`} key={p.playerId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-pitch-800 transition">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-blue-500/30 text-blue-400' : 'bg-pitch-700 text-pitch-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.playerName}</p>
                    <p className="text-[10px] text-pitch-500">{p.teamName}</p>
                  </div>
                  <span className="font-display font-bold text-lg text-blue-400">{p.assists}</span>
                </Link>
              ))}
              {topAssists.length === 0 && <p className="text-pitch-600 text-xs">No assists yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {teams.map((t: any) => (
            <Link to={`/team/${t.id}`} key={t.id}
              className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition card-glow flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{t.name}</h3>
                <p className="text-xs text-pitch-500">{t.city} · Group {t.group_name}</p>
              </div>
              <ChevronRight size={16} className="text-pitch-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match: m }: { match: any }) {
  const isLive = m.status.startsWith('LIVE') || m.status === 'HALF_TIME';
  const isCompleted = m.status === 'COMPLETED' || m.status === 'FULL_TIME';

  return (
    <Link to={`/match/${m.id}`}
      className={`block bg-pitch-900 border rounded-xl p-4 hover:border-emerald-500/30 transition card-glow ${
        isLive ? 'border-crimson-500/30' : 'border-pitch-700/50'
      }`}>
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <p className="font-bold text-sm">{m.home_team_name}</p>
        </div>
        <div className="mx-4 text-center min-w-[80px]">
          {(isLive || isCompleted) ? (
            <p className="font-display font-extrabold text-xl">{m.home_score} — {m.away_score}</p>
          ) : (
            <p className="text-pitch-500 font-mono text-xs">
              {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <span className={`text-[10px] font-mono ${isLive ? 'text-crimson-400' : isCompleted ? 'text-pitch-500' : 'text-pitch-500'}`}>
            {isLive && '🔴 LIVE'}
            {isCompleted && 'FT'}
            {!isLive && !isCompleted && new Date(m.scheduled_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{m.away_team_name}</p>
        </div>
      </div>
    </Link>
  );
}
