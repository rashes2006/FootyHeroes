# ⚽ FootyHeroes

A **CrickHeroes-style football tournament management & live scoring platform** built as a full-stack TypeScript application.

FootyHeroes is designed for amateur, grassroots, and local football tournaments where organizers schedule matches, referees/scorers manually operate live matches pitch-side with an offline-resilient console, and spectators follow live scores, minute-by-minute timelines, match statistics, lineups on a 2D tactical pitch, and tournament standings.

---

## ✨ Features

- **🏆 Tournament Hub & Standings**: Points table with goal difference calculation, status-grouped fixtures, top scorers & top assists leaderboards.
- **📱 Pitch-Side Scorer Console**: Mobile-first operator console with large quick-tap event buttons (Goal, Yellow/Red Cards, Substitutions, Fouls, Corners, Penalties), clock management (Pause, Resume, Halftime, Stoppage, Full Time), and undo functionality.
- **⚡ Offline Event Queue**: LocalStorage event queue resilient to pitch-side cellular dropouts with automatic FIFO background replay upon reconnection.
- **⚽ Tactical 2D Football Pitch**: Visual SVG field layout showing starting lineups with dynamic formations (4-3-3, 4-4-2, 3-5-2, etc.), jersey nodes, card/goal indicators, and substitutes bench.
- **⚡ Real-Time Live Broadcasting**: Instant WebSocket updates via Socket.io for live score tickers and match events.
- **⚙️ Organizer & Admin Hub (`/manage`)**: Create tournaments, register clubs, build squad rosters with jersey numbers, and auto-generate round-robin fixtures with 1 click.
- **🔥 Firebase Authentication**: Integrated with Google Sign-in and Email/Password authentication.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Socket.io Client, Firebase Web SDK, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Socket.io, SQLite (WAL mode), Better-SQLite3, JWT Authentication.
- **Architecture**: Event-sourced match engine where scores, standings, and stats are derived from an immutable match events stream.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Copy the example environment file in `client/`:
```bash
cp client/.env.example client/.env
```

### 3. Run the Development Servers

```bash
# Terminal 1 — Backend (runs on port 3001)
cd server
npm run dev

# Terminal 2 — Frontend (runs on port 5173)
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 👥 Demo Accounts (Password: `password123`)

- **Admin**: `admin@footyheroes.com`
- **Organizer**: `organizer@mumbaipremier.com`
- **Scorer**: `scorer1@footyheroes.com`
- **Spectator**: `fan@footyheroes.com`

---

## 📄 License

MIT
