import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const {
    login,
    register,
    loginWithFirebaseGoogle,
    loginWithFirebaseEmail,
    registerWithFirebaseEmail,
    isFirebaseConfigured,
  } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SPECTATOR');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithFirebaseGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        if (isRegister) {
          await registerWithFirebaseEmail(email, password, name);
        } else {
          await loginWithFirebaseEmail(email, password);
        }
      } else {
        if (isRegister) {
          await register(name, email, password, role);
        } else {
          await login(email, password);
        }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick login presets — always use direct backend login (these seeded accounts are not in Firebase)
  const presets = [
    { label: 'Scorer', email: 'scorer@footyheroes.com' },
    { label: 'Organizer', email: 'vikram@footyheroes.com' },
    { label: 'Admin', email: 'admin@footyheroes.com' },
    { label: 'Spectator', email: 'fan@footyheroes.com' },
  ];

  const handleQuickLogin = async (presetEmail: string) => {
    setError('');
    setLoading(true);
    try {
      await login(presetEmail, 'password123'); // always hits backend directly
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Quick login failed. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">
            FOOTY<span className="text-emerald-400">HEROES</span>
          </h1>
          <p className="text-pitch-400 text-sm mt-1">Tournament & Live Scoring Platform</p>
        </div>

        <div className="bg-pitch-900 border border-pitch-700/60 rounded-2xl p-6">
          {/* Google Sign In with Firebase */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs font-mono flex items-center justify-center gap-3 transition shadow-md mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>CONTINUE WITH GOOGLE (FIREBASE)</span>
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-pitch-800" />
            <span className="text-[10px] font-mono text-pitch-500 uppercase">Or with Email</span>
            <div className="flex-1 h-px bg-pitch-800" />
          </div>

          {/* Tab switch */}
          <div className="flex bg-pitch-800 rounded-lg p-1 mb-6">
            <button onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition ${!isRegister ? 'bg-emerald-500 text-pitch-900 font-bold' : 'text-pitch-400'}`}>
              LOGIN
            </button>
            <button onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition ${isRegister ? 'bg-emerald-500 text-pitch-900 font-bold' : 'text-pitch-400'}`}>
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-mono text-pitch-400 mb-1.5">FULL NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-4 py-2.5 text-sm text-pitch-100 outline-none focus:border-emerald-500 transition" />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-pitch-400 mb-1.5">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-4 py-2.5 text-sm text-pitch-100 outline-none focus:border-emerald-500 transition" />
            </div>

            <div>
              <label className="block text-xs font-mono text-pitch-400 mb-1.5">PASSWORD</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-4 py-2.5 text-sm text-pitch-100 outline-none focus:border-emerald-500 transition pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-pitch-500">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-mono text-pitch-400 mb-1.5">ROLE</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-pitch-800 border border-pitch-700 rounded-lg px-4 py-2.5 text-sm text-pitch-100 outline-none focus:border-emerald-500">
                  <option value="SPECTATOR">Spectator / Fan</option>
                  <option value="PLAYER">Player</option>
                  <option value="TEAM_MANAGER">Team Manager</option>
                  <option value="ORGANIZER">Tournament Organizer</option>
                  <option value="SCORER">Match Scorer / Operator</option>
                </select>
              </div>
            )}

            {error && <p className="text-crimson-400 text-sm bg-crimson-500/10 border border-crimson-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-pitch-900 font-bold text-sm rounded-lg transition disabled:opacity-50 font-mono tracking-wide">
              {loading ? 'LOADING...' : isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </form>

          {/* Quick login */}
          {!isRegister && (
            <div className="mt-6 pt-4 border-t border-pitch-700/50">
              <p className="text-xs font-mono text-pitch-500 mb-3">QUICK LOGIN (password: password123)</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => (
                  <button key={p.email}
                    onClick={() => handleQuickLogin(p.email)}
                    disabled={loading}
                    className="px-3 py-2 bg-pitch-800 hover:bg-pitch-700 border border-pitch-700/60 rounded-lg text-xs font-mono text-pitch-300 transition disabled:opacity-40">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
