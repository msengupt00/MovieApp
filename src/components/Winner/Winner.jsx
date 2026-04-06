import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import MovieCard from '../MovieCard/MovieCard';

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - room: Object
 * - onPlayAgain: function (optional)
 */
export default function Winner({ room, onPlayAgain }) {
  const hasConfettied = useRef(false);

  const movies = room?.movies || {};
  const winnerId = room?.winner;
  const winnerMovie = winnerId ? { id: winnerId, ...movies[winnerId] } : null;

  // Fire confetti on mount, cancel on unmount to prevent leaking into next screens
  useEffect(() => {
    if (!winnerMovie || hasConfettied.current) return;
    hasConfettied.current = true;

    const duration = 3000;
    const end = Date.now() + duration;
    let rafId;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#e2b616', '#c70039', '#00b894', '#f0f0f0'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#e2b616', '#c70039', '#00b894', '#f0f0f0'],
      });

      if (Date.now() < end) {
        rafId = requestAnimationFrame(frame);
      }
    };

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#e2b616', '#c70039', '#00b894', '#f0f0f0'],
    });

    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [winnerMovie]);

  if (!winnerMovie) {
    return (
      <div className="page-container">
        <p className="text-text-muted">Something went wrong. No winner found.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-text-muted text-sm uppercase tracking-widest mb-2 animate-fade-in">
            Tonight you're watching
          </p>
          <h1
            className="page-title animate-scale-in"
            style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', animationDelay: '0.3s' }}
          >
            {winnerMovie.title}
          </h1>
        </div>

        {/* Winner Card */}
        <div className="animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <MovieCard movie={winnerMovie} winner />
        </div>

        {/* Play Again */}
        {onPlayAgain && (
          <div className="mt-8 animate-fade-in" style={{ animationDelay: '1.5s' }}>
            <button onClick={onPlayAgain} className="btn-secondary w-full text-lg py-4">
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
