import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, User, LogOut, Menu, X } from 'lucide-react';
import { api } from '../lib/api';

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults(null); return; }
    try {
      const data = await api.search(q);
      setSearchResults(data);
    } catch { /* ignore */ }
  };

  return (
    <header className="bg-pitch-900/90 backdrop-blur-xl border-b border-pitch-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <span className="text-emerald-400 text-lg">⚽</span>
          </div>
          <span className="font-display font-extrabold text-base tracking-tight hidden sm:block">
            FOOTY<span className="text-emerald-400">HEROES</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link to="/" className="px-3 py-1.5 rounded-lg hover:bg-pitch-800 text-pitch-300 hover:text-white transition">Home</Link>
          <Link to="/teams" className="px-3 py-1.5 rounded-lg hover:bg-pitch-800 text-pitch-300 hover:text-white transition">Teams</Link>
          <Link to="/manage" className="px-3 py-1.5 rounded-lg hover:bg-pitch-800 text-emerald-400 hover:text-emerald-300 transition font-mono text-xs font-bold flex items-center gap-1">
            <span>⚙️</span> Manage
          </Link>
        </nav>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <div className="flex items-center bg-pitch-800 border border-pitch-700/60 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-pitch-400 mr-2" />
            <input
              type="text"
              placeholder="Search players, teams..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              className="bg-transparent text-sm text-pitch-100 placeholder:text-pitch-500 outline-none w-full"
            />
          </div>
          {showSearch && searchResults && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-pitch-800 border border-pitch-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50">
              {searchResults.teams?.map((t: any) => (
                <button key={t.id} onClick={() => { navigate(`/team/${t.id}`); setShowSearch(false); setSearchQuery(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-pitch-700 flex items-center gap-2 text-sm">
                  <Trophy size={14} className="text-emerald-400" />
                  <span>{t.name}</span>
                  <span className="text-pitch-500 text-xs ml-auto">{t.city}</span>
                </button>
              ))}
              {searchResults.players?.map((p: any) => (
                <button key={p.id} onClick={() => { navigate(`/player/${p.id}`); setShowSearch(false); setSearchQuery(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-pitch-700 flex items-center gap-2 text-sm">
                  <User size={14} className="text-blue-400" />
                  <span>{p.name}</span>
                  <span className="text-pitch-500 text-xs ml-auto">#{p.jersey_number} · {p.team_name}</span>
                </button>
              ))}
              {(!searchResults.teams?.length && !searchResults.players?.length) && (
                <p className="px-4 py-3 text-pitch-500 text-sm">No results</p>
              )}
            </div>
          )}
        </div>

        {/* User area */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-pitch-800 rounded-lg border border-pitch-700/60">
                <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  {user.name[0]}
                </div>
                <span className="text-xs font-mono text-pitch-300">{user.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-pitch-800 text-pitch-400 hover:text-crimson-400 transition">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="px-4 py-1.5 bg-emerald-500 text-pitch-900 font-bold text-xs rounded-lg hover:bg-emerald-400 transition font-mono">
              LOGIN
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-pitch-800 text-pitch-400">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-pitch-700/50 bg-pitch-900 px-4 py-3 space-y-1">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-pitch-800 text-pitch-300 text-sm">Home</Link>
          <Link to="/teams" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-pitch-800 text-pitch-300 text-sm">Teams</Link>
          <Link to="/manage" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-pitch-800 text-emerald-400 font-bold text-sm">⚙️ Manage & Organize</Link>
        </div>
      )}
    </header>
  );
}
