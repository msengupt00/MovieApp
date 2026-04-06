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
export default function VetoRound({ roomCode, userId, room, userList, movieList, settings }) {
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

  // Check if ALL users are done → transition to finals
  useEffect(() => {
    const allDone = userList.every((u) => u.ready);
    if (allDone && userList.length >= 2) {
      goToFinals(roomCode);
    }
  }, [userList, roomCode]);

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
    <div className="page-container" style={{ justifyContent: 'flex-start', paddingTop: '2rem' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-4 sticky top-0 z-10 py-3"
          style={{ backgroundColor: 'var(--color-surface-base)' }}>
          <h2 className="page-title mb-1" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}>
            VETO ROUND
          </h2>
          <div className="flex items-center justify-center gap-4">
            <span className="text-text-secondary text-sm">
              Vetos remaining:{' '}
              <span className={`font-bold ${remaining === 0 ? 'text-accent-success' : 'text-accent-primary'}`}>
                {remaining}
              </span>
              <span className="text-text-muted"> / {vetoBudget}</span>
            </span>
          </div>
        </div>

        {/* Movie Cards */}
        <div className="space-y-4 pb-24">
          {movieEntries.map((movie, i) => (
            <div key={movie.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <MovieCard
                movie={movie}
                vetoed={movie.vetoed}
                vetoedByMe={movie.vetoedBy === userId}
                onVeto={remaining > 0 && !movie.vetoed ? handleVeto : undefined}
                onUndoVeto={movie.vetoedBy === userId ? handleUndo : undefined}
              />
            </div>
          ))}
        </div>

        {/* Done button - fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4"
          style={{ backgroundColor: 'var(--color-surface-base)', borderTop: '1px solid var(--color-surface-elevated)' }}>
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
          <div className="fixed top-4 left-4 right-4 z-30 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center animate-scale-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
