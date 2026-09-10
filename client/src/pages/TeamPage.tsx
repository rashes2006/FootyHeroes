import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MapPin, Calendar, Users, Trophy, ChevronRight } from 'lucide-react';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('squad');

  useEffect(() => {
    if (!id) return;
    api.getTeam(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-pitch-500">Team not found</div>;

  const { team, players, tournaments, matches } = data;

  const positionGroups: Record<string, string[]> = {
    'Goalkeepers': ['GK'],
    'Defenders': ['CB', 'LB', 'RB'],
    'Midfielders': ['DM', 'CM', 'CAM'],
    'Forwards': ['LW', 'RW', 'ST'],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pitch-900 via-pitch-800 to-emerald-500/10 border border-pitch-700/50 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-pitch-800 border border-pitch-700 flex items-center justify-center text-3xl font-display font-bold text-emerald-400">
            {team.short_name?.[0]}
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight">{team.name}</h1>
            <div className="flex items-center gap-3 text-xs text-pitch-400 mt-1">
              {team.city && <span className="flex items-center gap-1"><MapPin size={12} /> {team.city}</span>}
              {team.founded_year && <span className="flex items-center gap-1"><Calendar size={12} /> Est. {team.founded_year}</span>}
              <span className="flex items-center gap-1"><Users size={12} /> {players.length} players</span>
            </div>
            {team.description && <p className="text-pitch-400 text-sm mt-2">{team.description}</p>}
            {team.manager_name && <p className="text-[10px] text-pitch-500 mt-1 font-mono">Manager: {team.manager_name}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-pitch-900 border border-pitch-700/50 rounded-xl p-1 mb-6">
        {['squad', 'matches', 'tournaments'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-mono rounded-lg transition capitalize ${
              activeTab === tab ? 'bg-emerald-500 text-pitch-900 font-bold' : 'text-pitch-400 hover:bg-pitch-800'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Squad */}
      {activeTab === 'squad' && (
        <div className="space-y-6">
          {Object.entries(positionGroups).map(([groupName, positions]) => {
            const groupPlayers = players.filter((p: any) => positions.includes(p.position));
            if (groupPlayers.length === 0) return null;
            return (
              <div key={groupName}>
                <h3 className="text-xs font-mono text-pitch-400 mb-2 uppercase">{groupName}</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {groupPlayers.map((p: any) => (
                    <Link to={`/player/${p.id}`} key={p.id}
                      className="flex items-center gap-3 bg-pitch-900 border border-pitch-700/50 rounded-xl p-3 hover:border-emerald-500/30 transition card-glow">
                      <span className="w-10 h-10 rounded-xl bg-pitch-800 border border-pitch-700 flex items-center justify-center text-sm font-bold text-emerald-400">
                        {p.jersey_number}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-[10px] text-pitch-500 font-mono">{p.position} · {p.preferred_foot} foot</p>
                      </div>
                      <ChevronRight size={14} className="text-pitch-600" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Matches */}
      {activeTab === 'matches' && (
        <div className="space-y-2">
          {matches.map((m: any) => {
            const isHome = m.home_team_id === team.id;
            const isCompleted = m.status === 'COMPLETED' || m.status === 'FULL_TIME';
            const won = isCompleted && ((isHome && m.home_score > m.away_score) || (!isHome && m.away_score > m.home_score));
            const lost = isCompleted && ((isHome && m.home_score < m.away_score) || (!isHome && m.away_score < m.home_score));

            return (
              <Link to={`/match/${m.id}`} key={m.id}
                className={`block bg-pitch-900 border rounded-xl p-4 hover:border-pitch-600 transition ${
                  won ? 'border-emerald-500/30' : lost ? 'border-crimson-500/20' : 'border-pitch-700/50'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-pitch-500 font-mono">{m.tournament_name} · {m.round || ''}</p>
                    <p className="font-bold text-sm mt-0.5">{m.home_team_name} vs {m.away_team_name}</p>
                  </div>
                  <div className="text-right">
                    {isCompleted ? (
                      <>
                        <p className="font-display font-bold text-lg">{m.home_score} - {m.away_score}</p>
                        <span className={`text-[10px] font-mono font-bold ${won ? 'text-emerald-400' : lost ? 'text-crimson-400' : 'text-pitch-400'}`}>
                          {won ? 'WIN' : lost ? 'LOSS' : 'DRAW'}
                        </span>
                      </>
                    ) : (
                      <p className="text-xs text-pitch-500 font-mono">
                        {new Date(m.scheduled_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {matches.length === 0 && <p className="text-pitch-600 text-sm text-center py-8">No matches found</p>}
        </div>
      )}

      {/* Tournaments */}
      {activeTab === 'tournaments' && (
        <div className="space-y-2">
          {tournaments.map((t: any) => (
            <Link to={`/tournament/${t.id}`} key={t.id}
              className="block bg-pitch-900 border border-pitch-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" />
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-pitch-500">{t.location} · {t.format}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  t.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pitch-700 text-pitch-400'
                }`}>{t.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
