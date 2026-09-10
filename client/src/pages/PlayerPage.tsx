import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MapPin, Calendar, Target, Shield, Clock, Award } from 'lucide-react';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getPlayer(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-pitch-500">Player not found</div>;

  const { player, stats, matchHistory } = data;

  const statCards = [
    { label: 'Goals', value: (stats.goals || 0) + (stats.penalty_goals || 0), icon: '⚽', color: 'text-emerald-400' },
    { label: 'Assists', value: stats.assists || 0, icon: '🎯', color: 'text-blue-400' },
    { label: 'Matches', value: stats.matches_played || 0, icon: '📋', color: 'text-pitch-300' },
    { label: 'Minutes', value: stats.total_minutes || 0, icon: '⏱️', color: 'text-pitch-300' },
    { label: 'Yellow Cards', value: stats.yellow_cards || 0, icon: '🟨', color: 'text-amber-400' },
    { label: 'Red Cards', value: stats.red_cards || 0, icon: '🟥', color: 'text-crimson-400' },
    { label: 'Fouls', value: stats.fouls || 0, icon: '⚠️', color: 'text-pitch-400' },
    { label: 'MOTM Awards', value: stats.motm_awards || 0, icon: '🏆', color: 'text-amber-400' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pitch-900 via-pitch-800 to-emerald-500/10 border border-pitch-700/50 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-pitch-800 border border-pitch-700 flex items-center justify-center font-display font-black text-3xl text-emerald-400">
            {player.jersey_number}
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight">{player.name}</h1>
            <div className="flex items-center gap-3 text-xs text-pitch-400 mt-1">
              <Link to={`/team/${player.team_id}`} className="flex items-center gap-1 hover:text-emerald-400 transition">
                <Shield size={12} /> {player.team_name}
              </Link>
              <span className="px-2 py-0.5 bg-pitch-800 rounded font-mono">{player.position}</span>
              <span className="flex items-center gap-1">🦶 {player.preferred_foot}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-3 text-center">
            <span className="text-lg">{s.icon}</span>
            <p className={`font-display font-bold text-xl ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[10px] text-pitch-500 font-mono mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Match History */}
      <div>
        <h2 className="font-display font-bold text-sm mb-3 text-pitch-300">MATCH HISTORY</h2>
        <div className="space-y-2">
          {matchHistory?.map((m: any) => (
            <Link to={`/match/${m.id}`} key={m.id}
              className="block bg-pitch-900 border border-pitch-700/50 rounded-xl p-3 hover:border-pitch-600 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-pitch-500 font-mono">{m.tournament_name}</p>
                  <p className="text-sm font-medium mt-0.5">
                    {m.home_short} <span className="text-pitch-500">{m.home_score} - {m.away_score}</span> {m.away_short}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {m.match_goals > 0 && <span className="text-emerald-400 text-xs">⚽{m.match_goals}</span>}
                    {m.match_assists > 0 && <span className="text-blue-400 text-xs">🎯{m.match_assists}</span>}
                    {m.match_yellows > 0 && <span className="text-xs">🟨{m.match_yellows}</span>}
                    {m.match_reds > 0 && <span className="text-xs">🟥{m.match_reds}</span>}
                  </div>
                  <p className="text-[10px] text-pitch-500 font-mono mt-0.5">
                    {m.minutes_played}' · {m.is_starter ? 'Started' : 'Sub'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {(!matchHistory || matchHistory.length === 0) && (
            <p className="text-pitch-600 text-sm text-center py-8">No match history</p>
          )}
        </div>
      </div>
    </div>
  );
}
