import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { io } from 'socket.io-client';
import { Clock, Users, BarChart3, List, Info, Edit3, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PitchTacticalView from '../components/PitchTacticalView';

const EVENT_ICONS: Record<string, string> = {
  KICK_OFF: '🟢', GOAL: '⚽', OWN_GOAL: '⚽', PENALTY_SCORED: '⚽', PENALTY_MISSED: '❌',
  PENALTY_SAVED: '🧤', PENALTY_AWARDED: '🥅', YELLOW_CARD: '🟨', RED_CARD: '🟥', SECOND_YELLOW: '🟨🟥',
  FOUL: '⚠️', CORNER: '🚩', FREE_KICK: '🦶', OFFSIDE: '🚫', SUBSTITUTION: '🔄',
  INJURY: '🩹', HALF_TIME: '⏸️', SECOND_HALF_START: '▶️', FULL_TIME: '⏱️',
  EXTRA_TIME_START: '⏰', VAR_REVIEW: '📺', MATCH_RESUMED: '▶️',
};

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [lineupView, setLineupView] = useState<'pitch' | 'list'>('pitch');
  const [clockSeconds, setClockSeconds] = useState(0);

  const loadMatch = useCallback(() => {
    if (!id) return;
    api.getMatch(id).then(d => {
      setData(d);
      setClockSeconds(d.match?.effective_clock || 0);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadMatch();

    // WebSocket for live updates
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socket.emit('match:join', id);

    socket.on('match:update', (updatedData: any) => {
      setData(updatedData);
      setClockSeconds(updatedData.match?.effective_clock || 0);
    });

    socket.on('match:event', () => loadMatch());

    return () => { socket.emit('match:leave', id); socket.disconnect(); };
  }, [id, loadMatch]);

  // Live clock ticker
  useEffect(() => {
    if (!data?.match?.is_clock_running) return;
    const interval = setInterval(() => {
      setClockSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.match?.is_clock_running]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-pitch-500">Match not found</div>;

  const { match, events, homePlayers, awayPlayers, homeStats, awayStats } = data;
  const isLive = match.status.startsWith('LIVE') || match.status === 'HALF_TIME';
  const isCompleted = match.status === 'COMPLETED' || match.status === 'FULL_TIME';
  const mins = Math.floor(clockSeconds / 60);
  const secs = clockSeconds % 60;
  const canScore = user && (user.role === 'SCORER' || user.role === 'ORGANIZER' || user.role === 'SUPER_ADMIN');

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: List },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'lineups', label: 'Lineups', icon: Users },
    { id: 'info', label: 'Info', icon: Info },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Scoreboard */}
      <div className={`rounded-2xl p-5 sm:p-6 mb-4 border ${
        isLive ? 'bg-gradient-to-b from-pitch-900 to-crimson-500/5 border-crimson-500/30' :
        'bg-pitch-900 border-pitch-700/50'
      }`}>
        <div className="text-center">
          <Link to={`/tournament/${match.tournament_id}`} className="text-xs font-mono text-pitch-400 hover:text-emerald-400 transition">
            {match.tournament_name}
          </Link>
        </div>

        <div className="flex items-center justify-center mt-4 gap-4 sm:gap-8">
          <Link to={`/team/${match.home_team_id}`} className="text-center flex-1 group">
            <div className="w-14 h-14 mx-auto rounded-xl bg-pitch-800 border border-pitch-700 flex items-center justify-center text-2xl font-display font-bold text-emerald-400 group-hover:border-emerald-500/50 transition">
              {match.home_short?.[0]}
            </div>
            <p className="font-bold text-sm mt-2">{match.home_team_name}</p>
          </Link>

          <div className="text-center shrink-0">
            <p className="font-display font-black text-4xl sm:text-5xl tracking-tighter">
              {match.home_score} <span className="text-pitch-600 text-3xl">—</span> {match.away_score}
            </p>
            {isLive && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 bg-crimson-500/20 text-crimson-400 px-3 py-1 rounded-full text-sm font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-crimson-500 animate-live-pulse" />
                  {mins}:{String(secs).padStart(2, '0')}
                </span>
              </div>
            )}
            {isCompleted && <p className="text-pitch-500 text-xs font-mono mt-2">FULL TIME</p>}
            {match.status === 'HALF_TIME' && <p className="text-amber-400 text-xs font-mono mt-2">HALF TIME</p>}
            {match.status === 'SCHEDULED' && (
              <p className="text-pitch-500 text-xs font-mono mt-2">
                {new Date(match.scheduled_at).toLocaleString()}
              </p>
            )}
          </div>

          <Link to={`/team/${match.away_team_id}`} className="text-center flex-1 group">
            <div className="w-14 h-14 mx-auto rounded-xl bg-pitch-800 border border-pitch-700 flex items-center justify-center text-2xl font-display font-bold text-blue-400 group-hover:border-blue-500/50 transition">
              {match.away_short?.[0]}
            </div>
            <p className="font-bold text-sm mt-2">{match.away_team_name}</p>
          </Link>
        </div>

        {/* Goal scorers */}
        <div className="flex justify-between mt-4 px-2">
          <div className="text-xs text-pitch-400 space-y-0.5">
            {events.filter((e: any) => (e.event_type === 'GOAL' || e.event_type === 'PENALTY_SCORED') && e.team_id === match.home_team_id)
              .map((e: any) => <p key={e.id}>⚽ {e.player_name} {e.minute}'</p>)}
          </div>
          <div className="text-xs text-pitch-400 space-y-0.5 text-right">
            {events.filter((e: any) => (e.event_type === 'GOAL' || e.event_type === 'PENALTY_SCORED') && e.team_id === match.away_team_id)
              .map((e: any) => <p key={e.id}>⚽ {e.player_name} {e.minute}'</p>)}
          </div>
        </div>

        {/* Scorer button */}
        {canScore && (isLive || match.status === 'SCHEDULED' || match.status === 'PRE_MATCH') && (
          <div className="mt-4 text-center">
            <Link to={`/match/${id}/score`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-pitch-900 font-bold text-xs rounded-lg transition font-mono">
              <Edit3 size={14} /> OPEN SCORER CONSOLE
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-pitch-900 border border-pitch-700/50 rounded-xl p-1 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono flex-1 justify-center transition ${
              activeTab === tab.id ? 'bg-emerald-500 text-pitch-900 font-bold' : 'text-pitch-400 hover:bg-pitch-800'
            }`}>
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4">
          <div className="space-y-1">
            {events.length === 0 && <p className="text-pitch-600 text-sm text-center py-8">No events yet</p>}
            {events.map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 py-2.5 border-b border-pitch-800/50 last:border-0 animate-slide-in">
                <div className="w-10 text-right shrink-0">
                  <span className="font-mono text-xs text-pitch-400 font-bold">
                    {e.minute}'{e.stoppage_minute > 0 ? `+${e.stoppage_minute}` : ''}
                  </span>
                </div>
                <div className="w-6 text-center text-sm shrink-0">{EVENT_ICONS[e.event_type] || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {e.event_type === 'SUBSTITUTION' ? (
                      <><span className="text-emerald-400">↑ {e.player_name}</span> <span className="text-crimson-400">↓ {e.secondary_player_name}</span></>
                    ) : e.event_type === 'FOUL' ? (
                      <>{e.player_name} <span className="text-pitch-500">fouled</span> {e.secondary_player_name}</>
                    ) : (
                      e.player_name || e.event_type.replace(/_/g, ' ')
                    )}
                  </p>
                  {e.secondary_player_name && e.event_type === 'GOAL' && (
                    <p className="text-xs text-pitch-500">Assist: {e.secondary_player_name}</p>
                  )}
                  {e.notes && <p className="text-xs text-pitch-500 mt-0.5">{e.notes}</p>}
                  {e.team_short && <span className="text-[10px] text-pitch-600 font-mono">{e.team_short}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-5 space-y-4">
          {[
            { label: 'Goals', home: homeStats.goals, away: awayStats.goals },
            { label: 'Corners', home: homeStats.corners, away: awayStats.corners },
            { label: 'Fouls', home: homeStats.fouls, away: awayStats.fouls },
            { label: 'Yellow Cards', home: homeStats.yellowCards, away: awayStats.yellowCards },
            { label: 'Red Cards', home: homeStats.redCards, away: awayStats.redCards },
            { label: 'Offsides', home: homeStats.offsides, away: awayStats.offsides },
            { label: 'Substitutions', home: homeStats.substitutions, away: awayStats.substitutions },
          ].map(stat => {
            const total = stat.home + stat.away;
            const homePct = total > 0 ? (stat.home / total) * 100 : 50;
            return (
              <div key={stat.label}>
                <div className="flex justify-between text-xs text-pitch-300 mb-1">
                  <span className="font-bold">{stat.home}</span>
                  <span className="text-pitch-500">{stat.label}</span>
                  <span className="font-bold">{stat.away}</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-pitch-800">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${homePct}%` }} />
                  <div className="bg-blue-500 transition-all" style={{ width: `${100 - homePct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lineups */}
      {activeTab === 'lineups' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg bg-pitch-900 border border-pitch-700/60 p-0.5 text-xs font-mono">
              <button
                onClick={() => setLineupView('pitch')}
                className={`px-3 py-1 rounded-md transition ${
                  lineupView === 'pitch' ? 'bg-emerald-500 text-pitch-950 font-bold' : 'text-pitch-400 hover:text-white'
                }`}
              >
                Tactical Pitch
              </button>
              <button
                onClick={() => setLineupView('list')}
                className={`px-3 py-1 rounded-md transition ${
                  lineupView === 'list' ? 'bg-emerald-500 text-pitch-950 font-bold' : 'text-pitch-400 hover:text-white'
                }`}
              >
                Squad List
              </button>
            </div>
          </div>

          {lineupView === 'pitch' ? (
            <PitchTacticalView
              homeTeamName={match.home_team_name}
              homeShortName={match.home_short}
              homeFormation={match.home_formation}
              homePlayers={homePlayers}
              awayTeamName={match.away_team_name}
              awayShortName={match.away_short}
              awayFormation={match.away_formation}
              awayPlayers={awayPlayers}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4">
                <h3 className="text-xs font-mono text-emerald-400 mb-3 font-bold">{match.home_team_name} ({match.home_formation})</h3>
                <div className="space-y-1">
                  {homePlayers.map((p: any) => (
                    <Link to={`/player/${p.player_id}`} key={p.player_id}
                      className="flex items-center gap-2 py-1.5 hover:bg-pitch-800 rounded px-2 transition">
                      <span className="w-6 h-6 rounded-full bg-pitch-800 border border-pitch-700 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                        {p.jersey_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                      </div>
                      <span className="text-[10px] text-pitch-500 font-mono">{p.position}</span>
                      {p.is_starter ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <span className="text-[9px] text-pitch-600">SUB</span>}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4">
                <h3 className="text-xs font-mono text-blue-400 mb-3 font-bold">{match.away_team_name} ({match.away_formation})</h3>
                <div className="space-y-1">
                  {awayPlayers.map((p: any) => (
                    <Link to={`/player/${p.player_id}`} key={p.player_id}
                      className="flex items-center gap-2 py-1.5 hover:bg-pitch-800 rounded px-2 transition">
                      <span className="w-6 h-6 rounded-full bg-pitch-800 border border-pitch-700 flex items-center justify-center text-[10px] font-bold text-blue-400">
                        {p.jersey_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                      </div>
                      <span className="text-[10px] text-pitch-500 font-mono">{p.position}</span>
                      {p.is_starter ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> : <span className="text-[9px] text-pitch-600">SUB</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {activeTab === 'info' && (
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-5 space-y-3 text-sm">
          {match.venue && <div className="flex justify-between"><span className="text-pitch-500">Venue</span><span>{match.venue}</span></div>}
          {match.referee && <div className="flex justify-between"><span className="text-pitch-500">Referee</span><span>{match.referee}</span></div>}
          {match.round && <div className="flex justify-between"><span className="text-pitch-500">Round</span><span>{match.round}</span></div>}
          <div className="flex justify-between"><span className="text-pitch-500">Date</span><span>{new Date(match.scheduled_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-pitch-500">Half Duration</span><span>{match.half_duration} min</span></div>
          {match.motm_name && <div className="flex justify-between"><span className="text-pitch-500">Man of the Match</span><span className="text-amber-400 font-bold">🏆 {match.motm_name}</span></div>}
        </div>
      )}
    </div>
  );
}
