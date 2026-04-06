# MovieMania — Full Project Specification & Handoff Document

## Overview
MovieMania is a real-time multiplayer movie picker web app. A host creates a room, friends join, everyone suggests movies, then players veto movies down to a final winner via collaborative voting.

**Tech Stack:** React (Vite) + Firebase Realtime Database + OMDb API + Tailwind CSS + GitHub Pages

---

## User Flow

### Phase 1: Room Creation & Lobby
1. Host lands on homepage, clicks "Create Room"
2. Host picks movies-per-person: 3, 4, or 5
3. System generates a 4-digit room code + shareable link (`moviemania.github.io/room/XXXX`)
4. Host enters their display name, enters the lobby
5. Friends visit link or enter code on homepage, enter their display name
6. Lobby shows all connected users in real-time
7. Host sees "Start" button (disabled until ≥2 users). Host clicks Start → Phase 2

### Phase 2: Movie Entry
1. Each user sees a search bar. They type a movie title.
2. App calls OMDb API (`?t=TITLE` for exact match or `?s=TITLE` for search results)
3. User sees movie card preview: title, poster, year, plot, director, top 3 cast, IMDb rating, RT rating, duration
4. User confirms → movie is added to room's movie list in Firebase
5. User repeats until they've submitted exactly N movies (set by host)
6. Users who finish early see a waiting screen: "Waiting for others... (2 of 4 done)"
7. Once all users have submitted → Phase 3

### Phase 3: Veto Round
1. Each user gets `(movies_per_person - 1)` vetos
2. All movies displayed in a scrollable card stack (swipeable on mobile)
3. Veto mechanics (first-come-first-served lock):
   - Each movie has a global state: `{vetoed: false, vetoedBy: null}`
   - User taps "Veto" on an un-vetoed movie → sets `{vetoed: true, vetoedBy: username}`
   - Only `vetoedBy` user sees the "Undo" button on that card
   - Other users see the card grayed out, no undo
   - If original user undoes → movie returns to `{vetoed: false, vetoedBy: null}`
   - Veto budget counter: "Vetos remaining: 3 of 4"
4. Auto-complete: if a user can't use remaining vetos (all movies already vetoed by others), their round auto-completes
5. User clicks "Done" when all vetos are placed (or auto-completed)
6. Once all users are done → Phase 4

### Phase 4: Final Vote
1. Surviving movies (num_users count) are displayed
2. Each user votes for their #1 pick
3. If clear winner → Phase 5
4. If tie → re-vote with only tied movies. Repeat until resolved.

### Phase 5: Winner Reveal
1. Winning movie card displayed prominently
2. Confetti animation (canvas-confetti library)
3. "Play Again" button returns to lobby

---

## Veto Math

```
vetos_per_user = movies_per_person - 1
total_movies = num_users × movies_per_person
surviving_movies = total_movies - (num_users × vetos_per_user)
                 = num_users × movies_per_person - num_users × (movies_per_person - 1)
                 = num_users
```

**Examples:**
| Users | Movies/Person | Total Movies | Vetos/User | Survivors |
|-------|--------------|--------------|------------|-----------|
| 3     | 3            | 9            | 2          | 3         |
| 3     | 5            | 15           | 4          | 3         |
| 4     | 3            | 12           | 2          | 4         |
| 4     | 5            | 20           | 4          | 4         |
| 5     | 4            | 20           | 3          | 5         |

---

## Firebase Data Schema

```json
{
  "rooms": {
    "ABCD": {
      "host": "user_id_1",
      "settings": {
        "moviesPerPerson": 4
      },
      "phase": "lobby",  // "lobby" | "entry" | "veto" | "finals" | "winner"
      "users": {
        "user_id_1": { "name": "Alice", "ready": false },
        "user_id_2": { "name": "Bob", "ready": false }
      },
      "movies": {
        "movie_id_1": {
          "title": "Inception",
          "year": "2010",
          "poster": "https://...",
          "plot": "A thief who...",
          "director": "Christopher Nolan",
          "actors": "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page",
          "imdbRating": "8.8",
          "rtRating": "87%",
          "runtime": "148 min",
          "imdbID": "tt1375666",
          "submittedBy": "user_id_1",
          "vetoed": false,
          "vetoedBy": null
        }
      },
      "votes": {
        "user_id_1": "movie_id_1",
        "user_id_2": "movie_id_3"
      },
      "winner": null,
      "createdAt": 1712345678
    }
  }
}
```

---

## Firebase Security Rules (for MVP)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> **Note:** For production, lock down writes per-phase and per-user. MVP uses open rules.

---

## OMDb API Integration

**Endpoints used:**
- Search: `https://www.omdbapi.com/?apikey=KEY&s=TITLE&type=movie`
- Detail: `https://www.omdbapi.com/?apikey=KEY&t=TITLE&type=movie&plot=short`
- By ID: `https://www.omdbapi.com/?apikey=KEY&i=IMDB_ID&plot=short`

**Response fields we use:**
- `Title`, `Year`, `Poster`, `Plot`, `Director`, `Actors` (string, split by ", "), `imdbRating`, `Ratings` (array — find Rotten Tomatoes entry), `Runtime`, `imdbID`

**Rate limit:** 1,000 requests/day on free tier. Each movie search = 1 request. Each confirmation (by ID) = 1 request. With 5 users × 5 movies = 50 requests per session — well within limits.

**API key exposure:** The key will be in client-side JS. Acceptable for MVP. For hardening later, proxy through Firebase Cloud Functions.

---

## Project Structure

```
moviemania/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── main.jsx              # App entry point
│   ├── App.jsx                # Router & phase controller
│   ├── firebase.js            # Firebase config & initialization
│   ├── config.js              # OMDb API key, constants
│   ├── components/
│   │   ├── Home.jsx           # Landing page (create/join room)
│   │   ├── Lobby.jsx          # Waiting room with user list
│   │   ├── MovieEntry.jsx     # Search & submit movies
│   │   ├── MovieCard.jsx      # Reusable movie card component
│   │   ├── VetoRound.jsx      # Scrollable veto interface
│   │   ├── FinalVote.jsx      # Vote on survivors
│   │   ├── Winner.jsx         # Winner reveal + confetti
│   │   └── WaitingScreen.jsx  # "Waiting for others" component
│   ├── hooks/
│   │   ├── useRoom.js         # Firebase room listener
│   │   ├── useMovieSearch.js  # OMDb search hook
│   │   └── useVeto.js         # Veto logic hook
│   ├── utils/
│   │   ├── roomCode.js        # Generate 4-digit codes
│   │   └── vetoMath.js        # Calculate veto budgets
│   └── styles/
│       └── index.css          # Tailwind + custom styles
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example               # VITE_OMDB_API_KEY=xxx, VITE_FIREBASE_* keys
├── .gitignore
└── MOVIEMANIA_SPEC.md         # This file
```

---

## Setup Instructions (for the developer)

### 1. Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Create a project" → name it "moviemania" → disable Google Analytics (not needed)
3. Once created, click the web icon (`</>`) to add a web app
4. Register app name as "moviemania-web"
5. Copy the `firebaseConfig` object — you'll need: `apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
6. Go to **Realtime Database** → Create Database → choose region → Start in **Test Mode**
7. Your `databaseURL` will look like: `https://moviemania-XXXXX-default-rtdb.firebaseio.com`

### 2. OMDb API Key
1. Go to [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)
2. Select "Free" tier (1,000 daily limit)
3. Enter your email, receive verification, activate key
4. Your key will look like: `a1b2c3d4`

### 3. GitHub Repository
1. Create new repo on GitHub (e.g., `yourusername/moviemania`)
2. Do NOT initialize with README (we'll push our own)
3. Copy the repo URL

### 4. Local Development
```bash
# Clone the repo (or init locally)
git clone https://github.com/yourusername/moviemania.git
cd moviemania

# Install dependencies
npm install

# Create .env file with your keys
cp .env.example .env
# Edit .env with your actual keys:
# VITE_OMDB_API_KEY=your_omdb_key
# VITE_FIREBASE_API_KEY=your_firebase_api_key
# VITE_FIREBASE_AUTH_DOMAIN=moviemania-xxxxx.firebaseapp.com
# VITE_FIREBASE_DATABASE_URL=https://moviemania-xxxxx-default-rtdb.firebaseio.com
# VITE_FIREBASE_PROJECT_ID=moviemania-xxxxx
# VITE_FIREBASE_STORAGE_BUCKET=moviemania-xxxxx.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
# VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Start dev server
npm run dev
```

### 5. Deploy to GitHub Pages
```bash
# Build the project
npm run build

# Deploy (using gh-pages package)
npm run deploy
```

The `vite.config.js` is set with `base: '/MovieApp/'` for GitHub Pages compatibility.
The GitHub repo is: `https://github.com/msengupt00/MovieApp.git`

---

## Build Phases & Context Handoff Plan

### Phase 1: Full Codebase (COMPLETE — Chat 1)
- [x] Spec finalized
- [x] Project scaffolded (Vite + React + Tailwind + Firebase)
- [x] Home page (create/join room)
- [x] Room code generation (collision-safe)
- [x] Firebase room creation & joining
- [x] Lobby with real-time user list
- [x] Host "Start" button
- [x] Design token system (Figma-ready architecture — single tokens.css file)
- [x] OMDb API service (search + detail fetching)
- [x] MovieCard presentation component (reusable across all phases)
- [x] MovieEntry with debounced search, preview, confirm, waiting screen
- [x] VetoRound with first-come-first-served locking, budget counter, auto-complete
- [x] FinalVote with tiebreaker re-vote
- [x] Winner reveal with confetti
- [x] Session persistence (sessionStorage)
- [x] Production build passing (Vite)

### Phase 2: Local Testing & Bug Fixes (PARTIALLY COMPLETE — Chat 1)
- [x] Clone repo to local machine (Mac, Node v24, npm 11)
- [x] Run `npm install` and `npm run dev` — working
- [x] Home page tested — Create Room and Join Room both work
- [x] Lobby tested — real-time user sync works, host Start button works, edge case (can't start with <2 users) works
- [x] Movie Entry tested — OMDb search works, movie cards render, submissions sync across tabs and to Firebase
- [x] Bug fix: poster fallback — broken OMDb poster URLs now show initials placeholder (onError handler)
- [x] Bug fix: poster cropping — cards now use aspect-ratio 2/3 with object-position top
- [x] Bug fix: remove submitted movies — X button on pills, removeMovie() service function, count resets
- [ ] Test veto round with concurrent users (2+ tabs)
- [ ] Test tiebreaker flow end-to-end
- [ ] Test final vote → winner reveal with confetti
- [ ] Mobile responsiveness pass
- [ ] Deploy to GitHub Pages via `npm run deploy`
- [ ] Test deployed version with real devices

### Phase 3: Polish & Figma Integration (FUTURE)
- [ ] Connect Figma MCP, export design tokens, swap tokens.css
- [ ] Replace presentation components with Figma-derived designs
- [ ] Animations and micro-interactions pass
- [ ] Error handling edge cases (user disconnect, stale rooms, network loss)
- [ ] Room expiry / automatic cleanup (Firebase TTL or scheduled function)
- [ ] Share link with URL preview meta tags (Open Graph)
- [ ] Accessibility pass (keyboard nav, screen readers)
- [ ] Performance optimization (lazy loading, code splitting)

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.0",
    "canvas-confetti": "^1.9.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "gh-pages": "^6.1.0"
  }
}
```

---

## Design Direction

**Aesthetic:** Dark, cinematic. Think movie theater ambiance — deep blacks, warm gold/amber accents, subtle film grain texture. Cards should feel like real movie posters with soft shadows and hover lifts.

**Typography:** Display font for headers (cinematic feel), clean sans-serif for body text.

**Color palette:**
- Background: `#0a0a0f` (near black)
- Card background: `#1a1a2e`
- Primary accent: `#e2b616` (gold/amber)
- Secondary accent: `#c70039` (deep red for vetos)
- Text: `#f0f0f0` (off-white)
- Muted text: `#888`
- Success/winner: `#00b894` (green)

**Key interactions:**
- Movie cards: subtle parallax tilt on hover
- Veto: card grays out with a red X overlay, smooth transition
- Waiting: pulsing dots animation
- Winner: confetti burst + card scales up with glow

---

## Edge Cases & Rules

1. **Room expiry:** Rooms auto-delete after 24 hours (Firebase TTL or cleanup function)
2. **Minimum users:** 2 (host + 1 friend). Max: 8 (to keep veto rounds manageable)
3. **Duplicate movies:** If User A and User B both submit "Inception", deduplicate by imdbID. Second submission is rejected with a "Already added!" message.
4. **User disconnect:** If a user disconnects mid-session, their data stays. No auto-kick. Host can manually remove in future version.
5. **OMDb not found:** If a movie isn't in OMDb, show error and let user retry.
6. **All movies vetoed:** If somehow every movie gets vetoed (shouldn't happen with correct math), show a "No movies survived!" screen and let host restart the veto round.
7. **Final vote tie after 3 rounds:** Random pick with dramatic reveal animation.
8. **Same room code collision:** Generate code, check Firebase if exists, regenerate if collision.

---

## Collaboration Rules for AI Assistant

1. **Source all claims.** Every factual claim, technical recommendation, or assertion must be backed by a verifiable source (official docs, reputable blog posts, GitHub issues from core maintainers, etc.). If you can't source it, say so explicitly.
2. **No unsourced "just ignore it" advice.** If something looks safe to ignore (warnings, errors, deprecations), explain *why* with a source.
3. **Context handoff.** If approaching context limits, proactively create/update this spec file before the conversation ends. Flag it clearly: "We're approaching context limits — let me save our progress."
4. **Push back on bad ideas.** If something in the spec or a request would create technical debt, fragile architecture, or a bad user experience, say so and explain why.
5. **Figma-ready architecture.** All code changes must maintain the container/presentation split and design token system so Figma MCP integration remains viable.

---

## Known Issues & Technical Debt

1. **FinalVote.jsx dynamic import warning:** The tiebreaker function in FinalVote.jsx dynamically imports firebase.js (`await import(...)`) when it should use the static imports already available via roomService. Harmless but should be refactored to use a new `runTiebreaker()` function in roomService.js instead.
2. **Veto round — no "all movies vetoed" screen:** If the math somehow results in zero survivors (shouldn't happen with current formula, but defensive coding), there's no fallback UI. Should add a "No movies survived" state with a host restart option.
3. **No room cleanup:** Old rooms persist in Firebase indefinitely. Need to implement either Firebase TTL rules or a cleanup function that removes rooms older than 24 hours.
4. **OMDb API key exposed in client code:** Acceptable for MVP. For production, proxy through Firebase Cloud Functions to hide the key.
5. **No disconnect handling:** If a user closes their tab mid-session, their slot stays but they can't rejoin. Future: detect disconnect via Firebase onDisconnect() and show status indicator.

---

## Next Session Pickup Instructions

**For the AI assistant in the next chat:**

The user is building MovieMania, a real-time multiplayer movie voting app. The full codebase is written, builds successfully, and runs locally. The user has tested: home page, lobby, real-time sync between tabs, movie entry with OMDb search, and three bug fixes (poster fallback, poster cropping, movie removal).

**What to do next:**
1. Resume testing from the **veto round** — have the user submit 3 movies in each tab, then test the veto mechanics with both tabs open
2. Test the **final vote** and **winner reveal** with confetti
3. Do a **mobile responsiveness** check
4. **Deploy to GitHub Pages** via `npm run deploy`
5. Test the deployed version

**User's environment:** Mac, Node v24.14.1, npm 11.11.0, GitHub repo at `https://github.com/msengupt00/MovieApp.git`

**User preferences:**
- Sources all claims — do not make unsourced assertions
- Wants Figma MCP integration later — maintain container/presentation split
- First-time web developer — explain concepts clearly when asked
- Pragmatic — wants working software, not over-engineered abstractions