import { useState, useEffect } from 'react';
import { vetoMovie, undoVeto, markVetosDone, goToFinals } from '../../services/roomService';
import { getVetosPerUser, getVetoStatus, shouldAutoComplete } from '../../utils/vetoMath';
import MovieCard from '../MovieCard/MovieCard';

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - roomCode: string
 * - userId: string
 * - room: Object
 * - userList: Array
 * - movieList: Array
 * - settings: { moviesPerPerson: number }
 */
export default function VetoRound({ roomCode, userId, room, userList, movieList, settings, isHost }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [myDone, setMyDone] = useState(false);

  const vetoBudget = getVetosPerUser(settings.moviesPerPerson);
  const movies = room?.movies || {};
  const { used, remaining, isDone } = getVetoStatus(movies, userId, vetoBudget);

  // Check auto-complete: user can't veto anything (all vetoed by others)
  useEffect(() => {
    if (!myDone && remaining > 0 && shouldAutoComplete(movies, userId)) {
      handleDone();
    }
  }, [movies, myDone, remaining, userId]);

  // Check if user already marked done (page refresh)
  useEffect(() => {
    if (room?.users?.[userId]?.ready) {
      setMyDone(true);
    }
  }, [room, userId]);

  // Host checks if ALL users are done → transition to finals
  useEffect(() => {
    if (!isHost) return;
    const allDone = userList.every((u) => u.ready);
    if (allDone && userList.length >= 2) {
      goToFinals(roomCode);
    }
  }, [userList, roomCode, isHost]);

  const handleVeto = async (movie) => {
    if (remaining <= 0) return;
    setError(null);
    try {
      await vetoMovie(roomCode, movie.id || Object.keys(movies).find(k => movies[k].imdbID === movie.imdbID), userId);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUndo = async (movie) => {
    setError(null);
    try {
      await undoVeto(roomCode, movie.id || Object.keys(movies).find(k => movies[k].imdbID === movie.imdbID), userId);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDone = async () => {
    setSubmitting(true);
    try {
      await markVetosDone(roomCode, userId);
      setMyDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Waiting screen
  if (myDone) {
    const readyCount = userList.filter((u) => u.ready).length;
    return (
      <div className="page-container">
        <div className="w-full max-w-md text-center animate-fade-in">
          <h2 className="page-title mb-4" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            VETOS LOCKED IN
          </h2>
          <p className="text-text-secondary mb-8">
            Waiting for other players to finish vetoing...
          </p>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-muted text-sm">Players done</span>
              <span className="text-accent-primary font-bold">
                {readyCount} / {userList.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-base overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(readyCount / userList.length) * 100}%`,
                  backgroundColor: 'var(--color-accent-primary)',
                }}
              />
            </div>
          </div>
          <p className="text-text-muted text-xs mt-6 animate-pulse-slow">
            The suspense builds...
          </p>
        </div>
      </div>
    );
  }

  // Build movie list with IDs
  const movieEntries = Object.entries(movies).map(([id, data]) => ({ id, ...data }));

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface-base)' }}>
      {/* Header */}
      <div className="text-center py-3 px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-surface-elevated)' }}>
        <h2 className="page-title mb-1" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}>
          VETO ROUND
        </h2>
        <span className="text-text-secondary text-sm">
          Vetos remaining:{' '}
          <span className={`font-bold ${remaining === 0 ? 'text-accent-success' : 'text-accent-primary'}`}>
            {remaining}
          </span>
          <span className="text-text-muted"> / {vetoBudget}</span>
        </span>
      </div>

      {/* Scrollable Movie Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-md mx-auto space-y-3">
          {movieEntries.map((movie, i) => (
            <div key={movie.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <MovieCard
                movie={movie}
                compact
                vetoed={movie.vetoed}
                vetoedByMe={movie.vetoedBy === userId}
                onVeto={remaining > 0 && !movie.vetoed ? handleVeto : undefined}
                onUndoVeto={movie.vetoedBy === userId ? handleUndo : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Done button — pinned at bottom, outside scroll container */}
      <div className="shrink-0 p-4"
        style={{ borderTop: '1px solid var(--color-surface-elevated)', backgroundColor: 'var(--color-surface-base)' }}>
        <div className="max-w-md mx-auto">
          <button
            onClick={handleDone}
            disabled={submitting || remaining > 0}
            className="btn-primary w-full text-lg py-4"
          >
            {submitting
              ? 'Submitting...'
              : remaining > 0
                ? `Use ${remaining} more veto${remaining !== 1 ? 's' : ''}`
                : 'Lock In Vetos'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-30 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center animate-scale-in">
          {error}
        </div>
      )}
    </div>
  );
}
