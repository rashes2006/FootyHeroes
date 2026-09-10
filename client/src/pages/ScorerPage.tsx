import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Play, Pause, RotateCcw, Check, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { OfflineQueueManager } from '../lib/offlineQueue';

const EVENT_BUTTONS = [
  { type: 'GOAL',            icon: '⚽', label: 'GOAL',         color: 'bg-emerald-500 text-pitch-900', needsPlayer: true, needsAssist: true },
  { type: 'YELLOW_CARD',     icon: '🟨', label: 'YELLOW',       color: 'bg-amber-500 text-pitch-900', needsPlayer: true },
  { type: 'RED_CARD',        icon: '🟥', label: 'RED CARD',     color: 'bg-crimson-500 text-white', needsPlayer: true },
  { type: 'SUBSTITUTION',    icon: '🔄', label: 'SUB',          color: 'bg-blue-500 text-white', needsPlayer: true, needsSecondary: true },
  { type: 'FOUL',            icon: '⚠️', label: 'FOUL',         color: 'bg-pitch-700 text-pitch-200', needsPlayer: true, needsSecondary: true },
  { type: 'CORNER',          icon: '🚩', label: 'CORNER',       color: 'bg-pitch-700 text-pitch-200', needsTeamOnly: true },
  { type: 'OFFSIDE',         icon: '🚫', label: 'OFFSIDE',      color: 'bg-pitch-700 text-pitch-200', needsPlayer: true },
  { type: 'PENALTY_AWARDED', icon: '🥅', label: 'PENALTY',      color: 'bg-purple-500 text-white', needsTeamOnly: true },
  { type: 'PENALTY_SCORED',  icon: '⚽', label: 'PEN SCORED',   color: 'bg-emerald-600 text-white', needsPlayer: true },
  { type: 'PENALTY_MISSED',  icon: '❌', label: 'PEN MISSED',   color: 'bg-crimson-600 text-white', needsPlayer: true },
  { type: 'FREE_KICK',       icon: '🦶', label: 'FREE KICK',    color: 'bg-pitch-700 text-pitch-200', needsTeamOnly: true },
  { type: 'INJURY',          icon: '🩹', label: 'INJURY',       color: 'bg-orange-500 text-white', needsPlayer: true },
];

type EventConfig = typeof EVENT_BUTTONS[number];

export default function ScorerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clockSeconds, setClockSeconds] = useState(0);

  // Offline queue state
  const [isOnline, setIsOnline] = useState<boolean>(OfflineQueueManager.isOnline());
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineToast, setOfflineToast] = useState<string | null>(null);

  // Event recording state
  const [activeEvent, setActiveEvent] = useState<EventConfig | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<any>(null);
  const [eventNotes, setEventNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [step, setStep] = useState<'team' | 'player' | 'secondary' | 'confirm'>('team');

  const loadMatch = useCallback(() => {
    if (!id) return;
    api.getMatch(id).then(d => {
      setData(d);
      setClockSeconds(d.match?.effective_clock || 0);
    }).catch(err => {
      console.warn('Network issue fetching match details:', err);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  // Subscribe to offline queue & connection status
  useEffect(() => {
    const unsubscribe = OfflineQueueManager.subscribe((queue, online) => {
      setIsOnline(online);
      setQueueCount(queue.length);
      if (online && queue.length > 0) {
        handleManualSync();
      }
    });
    return unsubscribe;
  }, []);

  // Live clock ticker
  useEffect(() => {
    if (!data?.match?.is_clock_running) return;
    const interval = setInterval(() => setClockSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [data?.match?.is_clock_running]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-pitch-500">Match not found</div>;

  const { match, homePlayers, awayPlayers } = data;
  const isLive = match.status.startsWith('LIVE') || match.status === 'HALF_TIME';
  const mins = Math.floor(clockSeconds / 60);
  const secs = clockSeconds % 60;

  const getTeamPlayers = (teamId: string) =>
    teamId === match.home_team_id ? homePlayers : awayPlayers;

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await OfflineQueueManager.flush();
      if (res.processed > 0) {
        setOfflineToast(`Synced ${res.processed} pending action(s)`);
        setTimeout(() => setOfflineToast(null), 3000);
        loadMatch();
      }
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clock actions
  const handleStart = async () => {
    if (!OfflineQueueManager.isOnline()) {
      OfflineQueueManager.enqueue(id!, 'START', {});
      setOfflineToast('Saved match start to offline queue');
      setTimeout(() => setOfflineToast(null), 3000);
      return;
    }
    try {
      await api.startMatch(id!);
      loadMatch();
    } catch (err) {
      console.warn('Network issue starting match, queueing offline:', err);
      OfflineQueueManager.enqueue(id!, 'START', {});
      setOfflineToast('Saved to offline queue');
      setTimeout(() => setOfflineToast(null), 3000);
    }
  };

  const handleClockAction = async (action: string) => {
    if (!OfflineQueueManager.isOnline()) {
      OfflineQueueManager.enqueue(id!, 'CLOCK', { action });
      setOfflineToast(`Saved "${action}" to offline queue`);
      setTimeout(() => setOfflineToast(null), 3000);
      return;
    }
    try {
      await api.controlClock(id!, action);
      loadMatch();
    } catch (err) {
      console.warn('Network issue controlling clock, queueing offline:', err);
      OfflineQueueManager.enqueue(id!, 'CLOCK', { action });
      setOfflineToast(`Saved "${action}" to offline queue`);
      setTimeout(() => setOfflineToast(null), 3000);
    }
  };

  // Event recording
  const startEvent = (ev: EventConfig) => {
    setActiveEvent(ev);
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSelectedSecondary(null);
    setEventNotes('');

    if (ev.needsTeamOnly && !ev.needsPlayer) {
      setStep('team');
    } else {
      setStep('team');
    }
  };

  const selectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    if (activeEvent?.needsPlayer || activeEvent?.needsAssist) {
      setStep('player');
    } else {
      setStep('confirm');
    }
  };

  const selectPlayer = (player: any) => {
    setSelectedPlayer(player);
    if (activeEvent?.needsSecondary || activeEvent?.needsAssist) {
      setStep('secondary');
    } else {
      setStep('confirm');
    }
  };

  const selectSecondary = (player: any) => {
    setSelectedSecondary(player);
    setStep('confirm');
  };

  const confirmEvent = async () => {
    if (!activeEvent) return;
    setRecording(true);

    const payload = {
      event_type: activeEvent.type,
      team_id: selectedTeam,
      player_id: activeEvent.type === 'SUBSTITUTION' ? selectedSecondary?.player_id : selectedPlayer?.player_id,
      secondary_player_id: activeEvent.type === 'SUBSTITUTION' ? selectedPlayer?.player_id : selectedSecondary?.player_id,
      notes: eventNotes || undefined,
    };

    if (!OfflineQueueManager.isOnline()) {
      OfflineQueueManager.enqueue(id!, 'EVENT', payload);
      setRecording(false);
      cancelEvent();
      setOfflineToast(`Offline: Recorded ${activeEvent.label} in local queue`);
      setTimeout(() => setOfflineToast(null), 3500);
      return;
    }

    try {
      await api.recordEvent(id!, payload);
      cancelEvent();
      loadMatch();
    } catch (err) {
      console.warn('Failed to send event to server, saving to offline queue:', err);
      OfflineQueueManager.enqueue(id!, 'EVENT', payload);
      cancelEvent();
      setOfflineToast(`Network error: Queued ${activeEvent.label} offline`);
      setTimeout(() => setOfflineToast(null), 3500);
    } finally {
      setRecording(false);
    }
  };

  const cancelEvent = () => {
    setActiveEvent(null);
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSelectedSecondary(null);
    setStep('team');
  };

  const handleUndo = async () => {
    if (!confirm('Undo the last recorded event?')) return;
    await api.undoLastEvent(id!);
    loadMatch();
  };

  return (
    <div className="min-h-screen bg-pitch-950 flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-pitch-900/95 backdrop-blur-xl border-b border-pitch-700/50 px-4 py-3">
        {/* Connection & Match Status Bar */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(`/match/${id}`)} className="text-pitch-400 hover:text-white p-1">
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-pitch-500 hidden sm:inline">{match.tournament_name}</span>
            {/* Online / Offline status badge */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
              isOnline && queueCount === 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {isOnline ? (
                <>
                  <Wifi size={11} className={queueCount > 0 ? 'text-amber-400' : 'text-emerald-400'} />
                  <span>{queueCount > 0 ? `${queueCount} Queued` : 'Online'}</span>
                </>
              ) : (
                <>
                  <WifiOff size={11} className="text-crimson-400" />
                  <span>Offline ({queueCount})</span>
                </>
              )}
              {queueCount > 0 && isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="ml-1 hover:text-white transition"
                  title="Sync now"
                >
                  <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              isLive ? 'bg-crimson-500/20 text-crimson-400' : match.status === 'COMPLETED' ? 'bg-pitch-700 text-pitch-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {match.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Offline notification toast */}
        {offlineToast && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-pitch-800 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center justify-between animate-fade-in">
            <span>⚡ {offlineToast}</span>
            <button onClick={() => setOfflineToast(null)} className="text-pitch-400 hover:text-white ml-2 text-xs">✕</button>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <p className="font-bold text-sm">{match.home_short}</p>
          </div>
          <div className="text-center">
            <p className="font-display font-black text-3xl">{match.home_score} — {match.away_score}</p>
            {isLive && (
              <p className="text-crimson-400 font-mono text-sm font-bold mt-0.5">{mins}:{String(secs).padStart(2, '0')}</p>
            )}
          </div>
          <div className="text-center flex-1">
            <p className="font-bold text-sm">{match.away_short}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pb-32">
        {/* Clock Controls */}
        {match.status === 'SCHEDULED' && (
          <button onClick={handleStart}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-pitch-900 font-display font-bold text-lg rounded-xl transition mb-4 flex items-center justify-center gap-2">
            <Play size={20} /> START MATCH
          </button>
        )}

        {isLive && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {match.is_clock_running ? (
              <button onClick={() => handleClockAction('pause')}
                className="py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-mono font-bold flex flex-col items-center gap-1">
                <Pause size={16} /> PAUSE
              </button>
            ) : (
              <button onClick={() => handleClockAction('resume')}
                className="py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold flex flex-col items-center gap-1">
                <Play size={16} /> RESUME
              </button>
            )}
            {match.status === 'LIVE_FIRST_HALF' && (
              <button onClick={() => handleClockAction('half_time')}
                className="py-3 bg-pitch-800 text-pitch-300 border border-pitch-700 rounded-xl text-xs font-mono font-bold">
                ⏸️ HALF TIME
              </button>
            )}
            {match.status === 'HALF_TIME' && (
              <button onClick={() => handleClockAction('second_half')}
                className="py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold">
                ▶️ 2ND HALF
              </button>
            )}
            {match.status === 'LIVE_SECOND_HALF' && (
              <button onClick={() => handleClockAction('full_time')}
                className="py-3 bg-crimson-500/20 text-crimson-400 border border-crimson-500/30 rounded-xl text-xs font-mono font-bold">
                ⏱️ FULL TIME
              </button>
            )}
            <button onClick={handleUndo}
              className="py-3 bg-pitch-800 text-pitch-400 border border-pitch-700 rounded-xl text-xs font-mono flex flex-col items-center gap-1">
              <RotateCcw size={14} /> UNDO
            </button>
          </div>
        )}

        {/* Event Recording Modal Overlay */}
        {activeEvent && (
          <div className="fixed inset-0 z-50 bg-pitch-950/95 flex flex-col">
            {/* Modal header */}
            <div className="bg-pitch-900 border-b border-pitch-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeEvent.icon}</span>
                <span className="font-mono font-bold text-sm">{activeEvent.label}</span>
              </div>
              <button onClick={cancelEvent} className="p-2 text-pitch-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Step: Team Selection */}
            {step === 'team' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-pitch-400 text-sm font-mono mb-4">SELECT TEAM</p>
                <button onClick={() => selectTeam(match.home_team_id)}
                  className="w-full max-w-sm py-6 bg-pitch-800 border-2 border-emerald-500/40 hover:border-emerald-500 rounded-2xl text-center transition">
                  <span className="font-display font-bold text-lg">{match.home_team_name}</span>
                </button>
                <button onClick={() => selectTeam(match.away_team_id)}
                  className="w-full max-w-sm py-6 bg-pitch-800 border-2 border-blue-500/40 hover:border-blue-500 rounded-2xl text-center transition">
                  <span className="font-display font-bold text-lg">{match.away_team_name}</span>
                </button>
              </div>
            )}

            {/* Step: Player Selection */}
            {step === 'player' && selectedTeam && (
              <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-pitch-400 text-sm font-mono">
                    {activeEvent.type === 'SUBSTITUTION' ? 'SELECT PLAYER GOING OFF' : 'SELECT PLAYER'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPlayer(null);
                      setStep(activeEvent.needsAssist || activeEvent.needsSecondary ? 'secondary' : 'confirm');
                    }}
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Skip Player →
                  </button>
                </div>

                {/* Quick Skip Button */}
                <button
                  onClick={() => {
                    setSelectedPlayer(null);
                    setStep(activeEvent.needsAssist || activeEvent.needsSecondary ? 'secondary' : 'confirm');
                  }}
                  className="w-full mb-3 py-3 px-4 bg-pitch-800 hover:bg-pitch-700 border border-pitch-700 rounded-xl text-left flex items-center justify-between text-xs font-mono text-pitch-200 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>⚡</span>
                    <span className="font-bold">Record as Team Event (No specific player)</span>
                  </span>
                  <span className="text-emerald-400 font-bold">Continue →</span>
                </button>

                {/* Player List */}
                {getTeamPlayers(selectedTeam).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {getTeamPlayers(selectedTeam).map((p: any) => (
                      <button key={p.player_id} onClick={() => selectPlayer(p)}
                        className="py-3 px-3 bg-pitch-800 border border-pitch-700 hover:border-emerald-500 rounded-xl text-left transition">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-pitch-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                            {p.jersey_number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-pitch-500">{p.position}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-pitch-800/80 border border-pitch-700 rounded-2xl p-6 text-center my-3">
                    <p className="text-pitch-200 font-bold text-sm mb-1">No Squad Players Found</p>
                    <p className="text-xs text-pitch-400 mb-4">
                      This team doesn't have players registered yet in the match lineup. You can still record the event to update the score!
                    </p>
                    <button
                      onClick={() => {
                        setSelectedPlayer(null);
                        setStep('confirm');
                      }}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-pitch-950 font-bold font-mono text-xs rounded-xl transition shadow-lg shadow-emerald-500/20"
                    >
                      Record for Team (Score updates immediately) →
                    </button>
                  </div>
                )}

                {/* Optional Custom Notes / Unlisted Player Name */}
                <div className="mt-3 pt-3 border-t border-pitch-800">
                  <label className="text-[11px] font-mono text-pitch-400 block mb-1">
                    Or specify unlisted player / note:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #9 John Doe or Penalty rebound"
                    value={eventNotes}
                    onChange={e => setEventNotes(e.target.value)}
                    className="w-full bg-pitch-800 border border-pitch-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Step: Secondary Player (Assist or Sub On) */}
            {step === 'secondary' && selectedTeam && (
              <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-pitch-400 text-sm font-mono">
                    {activeEvent.type === 'SUBSTITUTION' ? 'SELECT PLAYER COMING ON' :
                     activeEvent.type === 'FOUL' ? 'SELECT FOULED PLAYER' :
                     'SELECT ASSIST PROVIDER (optional)'}
                  </p>
                  <button
                    onClick={() => { setSelectedSecondary(null); setStep('confirm'); }}
                    className="text-xs font-mono text-amber-400 hover:underline"
                  >
                    Skip Assist →
                  </button>
                </div>

                <button onClick={() => { setSelectedSecondary(null); setStep('confirm'); }}
                  className="w-full mb-3 py-3 bg-pitch-800 border border-pitch-700 hover:border-amber-500 rounded-xl text-pitch-300 text-xs font-mono">
                  ⚡ SKIP — No assist / Not applicable
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {(activeEvent.type === 'FOUL' ?
                    getTeamPlayers(selectedTeam === match.home_team_id ? match.away_team_id : match.home_team_id) :
                    getTeamPlayers(selectedTeam)
                  ).filter((p: any) => p.player_id !== selectedPlayer?.player_id).map((p: any) => (
                    <button key={p.player_id} onClick={() => selectSecondary(p)}
                      className="py-3 px-3 bg-pitch-800 border border-pitch-700 hover:border-emerald-500 rounded-xl text-left transition">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-pitch-700 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                          {p.jersey_number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-pitch-500">{p.position}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
                <div className="bg-pitch-800 border border-pitch-700 rounded-2xl p-6 w-full max-w-sm text-center">
                  <span className="text-3xl mb-3 block">{activeEvent.icon}</span>
                  <p className="font-display font-bold text-lg">{activeEvent.label}</p>
                  <p className="text-emerald-400 font-mono text-sm mt-2">{mins}'</p>
                  
                  {selectedPlayer ? (
                    <p className="text-sm mt-2 font-medium">{selectedPlayer.name} #{selectedPlayer.jersey_number}</p>
                  ) : (
                    <p className="text-xs text-pitch-400 font-mono mt-2">Team Event (Unassigned player)</p>
                  )}

                  {selectedSecondary && (
                    <p className="text-pitch-400 text-xs mt-1 font-mono">
                      {activeEvent.type === 'SUBSTITUTION' ? `↑ ON: ${selectedSecondary.name}` :
                       activeEvent.type === 'FOUL' ? `Fouled: ${selectedSecondary.name}` :
                       `Assist: ${selectedSecondary.name}`}
                    </p>
                  )}

                  {eventNotes && (
                    <p className="text-xs text-amber-400 font-mono mt-2 bg-pitch-900/60 py-1 px-2 rounded border border-pitch-700">
                      Note: {eventNotes}
                    </p>
                  )}
                </div>

                <button onClick={confirmEvent} disabled={recording}
                  className="w-full max-w-sm py-4 bg-emerald-500 hover:bg-emerald-400 text-pitch-900 font-bold text-base rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20">
                  <Check size={18} /> {recording ? 'RECORDING...' : 'CONFIRM & UPDATE SCORE'}
                </button>
                <button onClick={cancelEvent}
                  className="text-pitch-500 text-xs font-mono hover:text-white transition">
                  CANCEL
                </button>
              </div>
            )}
          </div>
        )}

        {/* Event Buttons Grid */}
        {isLive && !activeEvent && (
          <div className="grid grid-cols-3 gap-2">
            {EVENT_BUTTONS.map(ev => (
              <button key={ev.type} onClick={() => startEvent(ev)}
                className={`py-4 px-2 rounded-xl font-bold text-xs font-mono transition active:scale-95 flex flex-col items-center gap-1.5 ${ev.color} border border-transparent hover:opacity-90`}>
                <span className="text-xl">{ev.icon}</span>
                {ev.label}
              </button>
            ))}
          </div>
        )}

        {/* Recent Events (mini timeline) */}
        {data.events?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-mono text-pitch-500 mb-2">RECENT EVENTS</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...data.events].reverse().slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 bg-pitch-900 rounded-lg text-xs">
                  <span className="font-mono text-pitch-500 w-8">{e.minute}'</span>
                  <span>{({'GOAL':'⚽','YELLOW_CARD':'🟨','RED_CARD':'🟥','SUBSTITUTION':'🔄','FOUL':'⚠️','CORNER':'🚩','OFFSIDE':'🚫','HALF_TIME':'⏸️','FULL_TIME':'⏱️','KICK_OFF':'🟢','PENALTY_SCORED':'⚽','PENALTY_MISSED':'❌','SECOND_HALF_START':'▶️','INJURY':'🩹','FREE_KICK':'🦶','PENALTY_AWARDED':'🥅'} as any)[e.event_type] || '📋'}</span>
                  <span className="text-pitch-300 truncate">{e.player_name || e.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-pitch-600 ml-auto">{e.team_short}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
