# 🎬 MovieMania

Pick a movie together with friends — a real-time multiplayer movie voting app.

## How It Works

1. **Create a room** — pick how many movies each person submits (3, 4, or 5)
2. **Share the code** — friends join with a 4-digit code or link
3. **Submit movies** — search OMDb, preview the card, confirm your picks
4. **Veto round** — each player vetoes movies they don't want to watch (first-come-first-served locking)
5. **Final vote** — vote on the survivors, tiebreaker if needed
6. **Winner!** — confetti and your movie for the night

## Tech Stack

- **React 18** (Vite)
- **Firebase Realtime Database** (real-time sync)
- **OMDb API** (movie data)
- **Tailwind CSS** (styling)
- **GitHub Pages** (hosting)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/msengupt00/MovieApp.git
cd MovieApp

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Edit .env with your actual API keys

# 4. Start dev server
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

Your app will be live at `https://msengupt00.github.io/MovieApp/`

## Project Structure

```
src/
├── theme/tokens.css          # Design tokens (single file to update for redesign)
├── services/
│   ├── firebase.js           # Firebase config
│   ├── omdb.js               # OMDb API calls
│   └── roomService.js        # All room operations
├── hooks/
│   ├── useRoom.js            # Real-time room subscription
│   └── useSession.js         # Local session management
├── utils/
│   ├── roomCode.js           # Code generation
│   └── vetoMath.js           # Veto budget calculations
├── components/
│   ├── Home/Home.jsx         # Landing page
│   ├── Lobby/Lobby.jsx       # Waiting room
│   ├── MovieEntry/MovieEntry.jsx
│   ├── MovieCard/MovieCard.jsx
│   ├── VetoRound/VetoRound.jsx
│   ├── FinalVote/FinalVote.jsx
│   └── Winner/Winner.jsx
└── App.jsx                   # Phase router
```

## Design System

All visual tokens live in `src/theme/tokens.css`. To reskin the app, update that single file. Tailwind classes reference CSS variables so changes cascade everywhere.
