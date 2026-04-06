import { useEffect, useRef, useState } from 'react';
import { useSession } from './hooks/useSession';
import { useRoom } from './hooks/useRoom';
import Home from './components/Home/Home';
import Lobby from './components/Lobby/Lobby';
import MovieEntry from './components/MovieEntry/MovieEntry';
import VetoRound from './components/VetoRound/VetoRound';
import FinalVote from './components/FinalVote/FinalVote';
import Winner from './components/Winner/Winner';

const TRANSITION_MESSAGES = {
  entry: 'Time to pick your movies!',
  veto: "Time to veto!",
  finals: 'Moving to Final Vote...',
  winner: "We have a winner!",
};

export default function App() {
  const { userId, roomCode, userName, setSession, clearSession, isInRoom } = useSession();
  const { room, loading, error, userList, userCount, phase, isHost, movies, movieList, settings } =
    useRoom(roomCode);

  const [transitioning, setTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const prevPhaseRef = useRef(null);

  // Phase transition: show a brief interstitial screen when phase changes
  useEffect(() => {
    if (!phase) return;

    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Skip transition on initial load (prev is null)
    if (!prev || prev === phase) return;

    const message = TRANSITION_MESSAGES[phase];
    if (message) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTransitionMessage(message);
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Check URL for room code (from shared link)
  useEffect(() => {
    if (isInRoom) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      // Don't auto-join, but pre-fill the join form
      // We'll handle this by storing the code temporarily
      window.__prefilledRoomCode = code.toUpperCase();
    }
  }, [isInRoom]);

  const handleRoomJoined = ({ roomCode: code, userId: uid, userName: name }) => {
    setSession({ roomCode: code, userId: uid, userName: name });
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handlePlayAgain = () => {
    clearSession();
  };

  // Loading state
  if (isInRoom && loading) {
    return (
      <div className="page-container">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Connecting to room...</p>
        </div>
      </div>
    );
  }

  // Room not found or expired
  if (isInRoom && error) {
    return (
      <div className="page-container">
        <div className="w-full max-w-md text-center">
          <h2 className="page-title mb-4" style={{ fontSize: '2rem' }}>
            ROOM NOT FOUND
          </h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={clearSession} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Not in a room → show home
  if (!isInRoom || !room) {
    return <Home onRoomJoined={handleRoomJoined} />;
  }

  // Phase transition interstitial
  if (transitioning) {
    return (
      <div className="page-container">
        <div className="text-center animate-fade-in">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-6"
            style={{ borderColor: 'var(--color-accent-primary)', borderTopColor: 'transparent' }}
          />
          <p
            className="page-title animate-scale-in"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', animationDelay: '0.1s' }}
          >
            {transitionMessage}
          </p>
        </div>
      </div>
    );
  }

  // Phase router
  const commonProps = {
    roomCode,
    userId,
    userName,
    room,
    userList,
    userCount,
    isHost: isHost(userId),
    settings,
    movieList,
  };

  switch (phase) {
    case 'lobby':
      return <Lobby {...commonProps} />;

    case 'entry':
      return <MovieEntry {...commonProps} />;

    case 'veto':
      return <VetoRound {...commonProps} />;

    case 'finals':
      return <FinalVote {...commonProps} />;

    case 'winner':
      return <Winner room={room} onPlayAgain={handlePlayAgain} />;

    default:
      return (
        <div className="page-container">
          <p className="text-text-muted">Unknown phase: {phase}</p>
          <button onClick={clearSession} className="btn-primary mt-4">
            Back to Home
          </button>
        </div>
      );
  }
}
