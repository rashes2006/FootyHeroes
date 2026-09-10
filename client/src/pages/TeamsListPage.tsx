import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MapPin, Users, ChevronRight } from 'lucide-react';

export default function TeamsListPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTeams().then(d => setTeams(d.teams || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-display font-extrabold text-2xl tracking-tight mb-6">ALL TEAMS</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {teams.map(t => (
          <Link to={`/team/${t.id}`} key={t.id}
            className="bg-pitch-900 border border-pitch-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition card-glow flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pitch-800 border border-pitch-700 flex items-center justify-center font-display font-bold text-lg text-emerald-400 shrink-0">
              {t.short_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{t.name}</h3>
              <div className="flex items-center gap-3 text-xs text-pitch-400 mt-0.5">
                {t.city && <span className="flex items-center gap-1"><MapPin size={11} /> {t.city}</span>}
                <span className="flex items-center gap-1"><Users size={11} /> {t.squad_size} players</span>
              </div>
              {t.manager_name && <p className="text-[10px] text-pitch-500 mt-0.5">Manager: {t.manager_name}</p>}
            </div>
            <ChevronRight size={16} className="text-pitch-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
