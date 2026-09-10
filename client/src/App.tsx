import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import TournamentPage from './pages/TournamentPage';
import MatchPage from './pages/MatchPage';
import ScorerPage from './pages/ScorerPage';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';
import TeamsListPage from './pages/TeamsListPage';
import ManagePage from './pages/ManagePage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-pitch-950 text-pitch-50 flex flex-col">
            <Navigation />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/tournament/:id" element={<TournamentPage />} />
                <Route path="/match/:id" element={<MatchPage />} />
                <Route path="/match/:id/score" element={<ScorerPage />} />
                <Route path="/team/:id" element={<TeamPage />} />
                <Route path="/player/:id" element={<PlayerPage />} />
                <Route path="/teams" element={<TeamsListPage />} />
                <Route path="/manage" element={<ManagePage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
