import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Player {
  player_id: string;
  name: string;
  jersey_number: number;
  position: string;
  is_starter: number | boolean;
  yellow_cards?: number;
  red_cards?: number;
  goals?: number;
}

interface PitchTacticalViewProps {
  homeTeamName: string;
  homeShortName?: string;
  homeFormation?: string;
  homeColor?: string;
  homePlayers: Player[];
  awayTeamName: string;
  awayShortName?: string;
  awayFormation?: string;
  awayColor?: string;
  awayPlayers: Player[];
}

// Coordinate mapping for football formations
// Coordinates are in % (x: 0-100 from left to right, y: 0-100 from goal line towards halfway line)
function getFormationCoords(formation: string = '4-3-3', isAway: boolean = false): { x: number; y: number }[] {
  // 11 positions: GK, Def (4), Mid (3), Att (3) etc.
  const f = formation.replace(/\s+/g, '');

  let rows: number[] = [1, 4, 3, 3]; // default 4-3-3: 1 GK, 4 DEF, 3 MID, 3 FWD
  if (f === '4-4-2') rows = [1, 4, 4, 2];
  else if (f === '4-2-3-1') rows = [1, 4, 2, 3, 1];
  else if (f === '3-5-2') rows = [1, 3, 5, 2];
  else if (f === '5-3-2') rows = [1, 5, 3, 2];
  else if (f === '3-4-3') rows = [1, 3, 4, 3];
  else if (f === '4-1-4-1') rows = [1, 4, 1, 4, 1];
  else if (f === '4-5-1') rows = [1, 4, 5, 1];

  const coords: { x: number; y: number }[] = [];
  const numRows = rows.length;

  rows.forEach((count, rowIndex) => {
    // y spacing: GK near 6%, last row near 44% (halfway line is 50%)
    const yPercent = 7 + (rowIndex / (numRows - 1 || 1)) * 38;
    for (let i = 0; i < count; i++) {
      // x spacing evenly across width 15% to 85%
      const xPercent = count === 1 ? 50 : 15 + (i / (count - 1)) * 70;
      if (isAway) {
        // Mirrored across halfway line (y from 93% down to 56%)
        coords.push({ x: 100 - xPercent, y: 100 - yPercent });
      } else {
        coords.push({ x: xPercent, y: yPercent });
      }
    }
  });

  return coords;
}

export default function PitchTacticalView({
  homeTeamName,
  homeShortName,
  homeFormation = '4-3-3',
  homeColor = '#10b981',
  homePlayers = [],
  awayTeamName,
  awayShortName,
  awayFormation = '4-3-3',
  awayColor = '#3b82f6',
  awayPlayers = [],
}: PitchTacticalViewProps) {
  const [viewMode, setViewMode] = useState<'both' | 'home' | 'away'>('both');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const homeStarters = homePlayers.filter(p => Boolean(p.is_starter)).slice(0, 11);
  const homeSubs = homePlayers.filter(p => !p.is_starter);
  const awayStarters = awayPlayers.filter(p => Boolean(p.is_starter)).slice(0, 11);
  const awaySubs = awayPlayers.filter(p => !p.is_starter);

  const homeCoords = getFormationCoords(homeFormation, false);
  const awayCoords = getFormationCoords(awayFormation, true);

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-pitch-900 border border-pitch-700/50 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-pitch-400">PITCH VIEW:</span>
          <div className="inline-flex rounded-lg bg-pitch-800 p-0.5 border border-pitch-700">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1 text-xs font-mono rounded-md transition ${
                viewMode === 'both' ? 'bg-emerald-500 text-pitch-950 font-bold' : 'text-pitch-400 hover:text-pitch-200'
              }`}
            >
              Full Pitch
            </button>
            <button
              onClick={() => setViewMode('home')}
              className={`px-3 py-1 text-xs font-mono rounded-md transition ${
                viewMode === 'home' ? 'bg-emerald-500 text-pitch-950 font-bold' : 'text-pitch-400 hover:text-pitch-200'
              }`}
            >
              {homeShortName || 'Home'}
            </button>
            <button
              onClick={() => setViewMode('away')}
              className={`px-3 py-1 text-xs font-mono rounded-md transition ${
                viewMode === 'away' ? 'bg-blue-500 text-white font-bold' : 'text-pitch-400 hover:text-pitch-200'
              }`}
            >
              {awayShortName || 'Away'}
            </button>
          </div>
        </div>

        {/* Formation Badges */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
            <span className="text-pitch-300 font-bold">{homeTeamName}</span>
            <span className="text-pitch-500">({homeFormation})</span>
          </div>
          <span className="text-pitch-600">vs</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: awayColor }} />
            <span className="text-pitch-300 font-bold">{awayTeamName}</span>
            <span className="text-pitch-500">({awayFormation})</span>
          </div>
        </div>
      </div>

      {/* Football Pitch Graphic Canvas */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-emerald-900/60 shadow-2xl bg-gradient-to-b from-emerald-950 via-pitch-950 to-emerald-950 select-none">
        {/* Grass Stripes Pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none flex flex-col">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-emerald-600' : 'bg-transparent'}`} />
          ))}
        </div>

        {/* SVG Pitch Markings */}
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          className="w-full h-[580px] sm:h-[680px] stroke-white/40 fill-none"
          strokeWidth="0.75"
        >
          {/* Outer Boundary */}
          <rect x="4" y="4" width="92" height="132" rx="2" />

          {/* Halfway Line */}
          <line x1="4" y1="70" x2="96" y2="70" strokeWidth="0.8" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="70" r="12" />
          <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.6)" />

          {/* Top Goal Box (Home side in 'both' or 'home') */}
          <rect x="35" y="4" width="30" height="7" />
          {/* Top Penalty Box */}
          <rect x="22" y="4" width="56" height="20" />
          {/* Top Penalty Spot & Arc */}
          <circle cx="50" cy="16" r="0.8" fill="rgba(255,255,255,0.6)" />
          <path d="M 40 24 A 10 10 0 0 0 60 24" />

          {/* Bottom Goal Box */}
          <rect x="35" y="129" width="30" height="7" />
          {/* Bottom Penalty Box */}
          <rect x="22" y="116" width="56" height="20" />
          {/* Bottom Penalty Spot & Arc */}
          <circle cx="50" cy="124" r="0.8" fill="rgba(255,255,255,0.6)" />
          <path d="M 40 116 A 10 10 0 0 1 60 116" />

          {/* Corner Arcs */}
          <path d="M 4 8 A 4 4 0 0 1 8 4" />
          <path d="M 92 4 A 4 4 0 0 1 96 8" />
          <path d="M 4 132 A 4 4 0 0 0 8 136" />
          <path d="M 92 136 A 4 4 0 0 0 96 132" />
        </svg>

        {/* Home Players Nodes */}
        {(viewMode === 'both' || viewMode === 'home') &&
          homeStarters.map((player, idx) => {
            const coord = homeCoords[idx] || { x: 50, y: 20 };
            const yPos = viewMode === 'home' ? coord.y * 1.8 : coord.y * 0.9 + 5; // adjust for single-team or dual view

            return (
              <div
                key={`home-${player.player_id || idx}`}
                onClick={() => setSelectedPlayer(player)}
                style={{ left: `${coord.x}%`, top: `${yPos}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group transition-transform hover:scale-110 z-10"
              >
                {/* Jersey Node */}
                <div
                  style={{ borderColor: homeColor, boxShadow: `0 0 12px ${homeColor}55` }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-pitch-900/95 border-2 flex items-center justify-center relative font-mono font-bold text-xs sm:text-sm text-pitch-50 group-hover:border-white transition shadow-lg"
                >
                  {player.jersey_number}
                  {/* Position Tag */}
                  <span className="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-pitch-950/90 text-emerald-400 font-mono border border-pitch-700">
                    {player.position}
                  </span>
                  {/* Goal Indicator */}
                  {(player.goals ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 text-[10px]" title={`${player.goals} goal(s)`}>
                      ⚽
                    </span>
                  )}
                  {/* Card Indicator */}
                  {(player.yellow_cards ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-3.5 bg-amber-400 rounded-sm border border-pitch-900 shadow" />
                  )}
                </div>
                {/* Player Name Tag */}
                <span className="mt-1 px-2 py-0.5 rounded-full bg-pitch-950/90 backdrop-blur border border-pitch-800 text-[10px] sm:text-xs font-medium text-pitch-200 truncate max-w-[85px] sm:max-w-[100px] text-center group-hover:text-emerald-300 transition">
                  {player.name.split(' ').pop()}
                </span>
              </div>
            );
          })}

        {/* Away Players Nodes */}
        {(viewMode === 'both' || viewMode === 'away') &&
          awayStarters.map((player, idx) => {
            const coord = awayCoords[idx] || { x: 50, y: 80 };
            const yPos = viewMode === 'away' ? (100 - (100 - coord.y) * 1.8) : coord.y * 0.9 + 5;

            return (
              <div
                key={`away-${player.player_id || idx}`}
                onClick={() => setSelectedPlayer(player)}
                style={{ left: `${coord.x}%`, top: `${yPos}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group transition-transform hover:scale-110 z-10"
              >
                {/* Jersey Node */}
                <div
                  style={{ borderColor: awayColor, boxShadow: `0 0 12px ${awayColor}55` }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-pitch-900/95 border-2 flex items-center justify-center relative font-mono font-bold text-xs sm:text-sm text-pitch-50 group-hover:border-white transition shadow-lg"
                >
                  {player.jersey_number}
                  {/* Position Tag */}
                  <span className="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-pitch-950/90 text-blue-400 font-mono border border-pitch-700">
                    {player.position}
                  </span>
                  {/* Goal Indicator */}
                  {(player.goals ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 text-[10px]" title={`${player.goals} goal(s)`}>
                      ⚽
                    </span>
                  )}
                  {/* Card Indicator */}
                  {(player.yellow_cards ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-3.5 bg-amber-400 rounded-sm border border-pitch-900 shadow" />
                  )}
                </div>
                {/* Player Name Tag */}
                <span className="mt-1 px-2 py-0.5 rounded-full bg-pitch-950/90 backdrop-blur border border-pitch-800 text-[10px] sm:text-xs font-medium text-pitch-200 truncate max-w-[85px] sm:max-w-[100px] text-center group-hover:text-blue-300 transition">
                  {player.name.split(' ').pop()}
                </span>
              </div>
            );
          })}
      </div>

      {/* Substitutes / Bench Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home Bench */}
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {homeTeamName} Substitutes
            </h4>
            <span className="text-[10px] font-mono text-pitch-500">{homeSubs.length} Available</span>
          </div>
          {homeSubs.length === 0 ? (
            <p className="text-xs text-pitch-500 italic">No substitutes listed</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {homeSubs.map(p => (
                <Link
                  to={`/player/${p.player_id}`}
                  key={p.player_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-pitch-800/60 hover:bg-pitch-800 border border-pitch-700/40 transition"
                >
                  <span className="w-6 h-6 rounded-full bg-pitch-700 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400">
                    {p.jersey_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-pitch-200 truncate">{p.name}</p>
                    <span className="text-[10px] text-pitch-500 font-mono">{p.position}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Away Bench */}
        <div className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {awayTeamName} Substitutes
            </h4>
            <span className="text-[10px] font-mono text-pitch-500">{awaySubs.length} Available</span>
          </div>
          {awaySubs.length === 0 ? (
            <p className="text-xs text-pitch-500 italic">No substitutes listed</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {awaySubs.map(p => (
                <Link
                  to={`/player/${p.player_id}`}
                  key={p.player_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-pitch-800/60 hover:bg-pitch-800 border border-pitch-700/40 transition"
                >
                  <span className="w-6 h-6 rounded-full bg-pitch-700 flex items-center justify-center text-[10px] font-mono font-bold text-blue-400">
                    {p.jersey_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-pitch-200 truncate">{p.name}</p>
                    <span className="text-[10px] text-pitch-500 font-mono">{p.position}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
