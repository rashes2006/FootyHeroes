import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy, Clock, MapPin, ChevronRight, Zap, Users } from 'lucide-react';

export default function HomePage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTournaments(),
      api.getLiveMatches(),
      api.getMatches(),
    ]).then(([t, l, m]) => {
      setTournaments(t.tournaments || []);
      setLiveMatches(l.matches || []);
      setAllMatches(m.matches || []);
    }).finally(() => setLoading(false));
  }, []);

  const completedMatches = allMatches.filter(m => m.status === 'COMPLETED' || m.status === 'FULL_TIME');
  const upcomingMatches = allMatches.filter(m => m.status === 'SCHEDULED');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-pitch-900 via-pitch-800 to-emerald-500/10 border border-pitch-700/50 rounded-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-2">
            FOOTY<span className="text-emerald-400">HEROES</span>
          </h1>
          <p className="text-pitch-300 text-sm sm:text-base max-w-lg">
            Create tournaments, manage teams, score matches live, and follow every goal, card, and substitution in real time.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pitch-800/80 border border-pitch-700/60 rounded-lg text-xs font-mono text-pitch-300">
              <Trophy size={14} className="text-amber-400" />
              {tournaments.length} Tournament{tournaments.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pitch-800/80 border border-pitch-700/60 rounded-lg text-xs font-mono text-pitch-300">
              <Zap size={14} className="text-crimson-400" />
              {liveMatches.length} Live Match{liveMatches.length !== 1 ? 'es' : ''}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pitch-800/80 border border-pitch-700/60 rounded-lg text-xs font-mono text-pitch-300">
              <Users size={14} className="text-blue-400" />
              {allMatches.length} Fixture{allMatches.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-crimson-500 animate-live-pulse" />
            LIVE MATCHES
          </h2>
          <div className="grid gap-3">
            {liveMatches.map(m => (
              <Link to={`/match/${m.id}`} key={m.id}
                className="bg-pitch-900 border border-crimson-500/30 rounded-xl p-4 hover:border-crimson-400/50 transition card-glow">
                <div className="text-xs font-mono text-pitch-500 mb-2">{m.tournament_name}</div>
                <div className="flex items-center justify-between">
                  <div className="text-right flex-1">
                    <p className="font-bold text-sm">{m.home_team_name}</p>
                    <p className="text-pitch-500 text-xs">{m.home_short}</p>
                  </div>
                  <div className="mx-4 text-center">
                    <p className="font-display font-extrabold text-2xl">
                      {m.home_score} <span className="text-pitch-600">—</span> {m.away_score}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-mono bg-crimson-500/20 text-crimson-400 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-live-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{m.away_team_name}</p>
                    <p className="text-pitch-500 text-xs">{m.away_short}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tournaments */}
        <section className="lg:col-span-2">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            TOURNAMENTS
          </h2>
          <div className="space-y-3">
            {tournaments.map(t => (
              <Link to={`/tournament/${t.id}`} key={t.id}
                className="block bg-pitch-900 border border-pitch-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition card-glow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{t.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-pitch-400">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {t.location || 'TBD'}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {t.team_count} teams</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {t.match_count} matches</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      t.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.status === 'COMPLETED' ? 'bg-pitch-700 text-pitch-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {t.status}
                    </span>
                    <ChevronRight size={16} className="text-pitch-600" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent & Upcoming */}
        <section className="space-y-6">
          {/* Recent Results */}
          <div>
            <h2 className="font-display font-bold text-sm mb-3 text-pitch-300">RECENT RESULTS</h2>
            <div className="space-y-2">
              {completedMatches.slice(0, 5).map(m => (
                <Link to={`/match/${m.id}`} key={m.id}
                  className="block bg-pitch-900 border border-pitch-700/40 rounded-lg p-3 hover:border-pitch-600 transition">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate flex-1">{m.home_short}</span>
                    <span className="font-display font-bold text-sm mx-2 text-emerald-400">
                      {m.home_score} - {m.away_score}
                    </span>
                    <span className="font-medium truncate flex-1 text-right">{m.away_short}</span>
                  </div>
                  <p className="text-[10px] text-pitch-500 mt-1 font-mono">FT · {m.tournament_name}</p>
                </Link>
              ))}
              {completedMatches.length === 0 && <p className="text-pitch-600 text-xs">No results yet</p>}
            </div>
          </div>

          {/* Upcoming */}
          <div>
            <h2 className="font-display font-bold text-sm mb-3 text-pitch-300">UPCOMING FIXTURES</h2>
            <div className="space-y-2">
              {upcomingMatches.slice(0, 5).map(m => (
                <Link to={`/match/${m.id}`} key={m.id}
                  className="block bg-pitch-900 border border-pitch-700/40 rounded-lg p-3 hover:border-pitch-600 transition">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate flex-1">{m.home_short}</span>
                    <span className="text-pitch-500 font-mono text-[10px] mx-2">vs</span>
                    <span className="font-medium truncate flex-1 text-right">{m.away_short}</span>
                  </div>
                  <p className="text-[10px] text-pitch-500 mt-1 font-mono">
                    {new Date(m.scheduled_at).toLocaleDateString()} · {m.tournament_name}
                  </p>
                </Link>
              ))}
              {upcomingMatches.length === 0 && <p className="text-pitch-600 text-xs">No upcoming fixtures</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
