import { useState } from 'react';

/**
 * Generate initials from a movie title
 * e.g. "The Dark Knight" → "TDK", "Inception" → "IN"
 */
function getInitials(title) {
  if (!title) return '?';
  const words = title.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Poster placeholder with movie title initials
 */
function PosterFallback({ title, compact = false }) {
  const initials = getInitials(title);
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${
        compact ? 'w-16 rounded-lg' : 'w-full'
      }`}
      style={{
        aspectRatio: '2/3',
        background: 'linear-gradient(135deg, var(--color-surface-elevated), var(--color-surface-card))',
      }}
    >
      <span
        className={`font-display text-text-muted ${compact ? 'text-lg' : 'text-4xl'}`}
        style={{ letterSpacing: '2px' }}
      >
        {initials}
      </span>
    </div>
  );
}

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - movie: { title, year, poster, plot, director, actors, imdbRating, rtRating, runtime }
 * - vetoed: boolean (optional)
 * - vetoedByMe: boolean (optional)
 * - onVeto: function (optional)
 * - onUndoVeto: function (optional)
 * - onSelect: function (optional) - for final vote
 * - selected: boolean (optional) - for final vote
 * - compact: boolean (optional) - smaller card for search results
 * - winner: boolean (optional) - winner styling
 */
export default function MovieCard({
  movie,
  vetoed = false,
  vetoedByMe = false,
  onVeto,
  onUndoVeto,
  onSelect,
  selected = false,
  compact = false,
  previewPoster = false,
  winner = false,
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!movie) return null;

  const hasPoster = movie.poster && !imgFailed;

  const cardClasses = [
    'relative rounded-card overflow-hidden transition-all',
    vetoed && !vetoedByMe ? 'opacity-40 grayscale pointer-events-none' : '',
    vetoed && vetoedByMe ? 'opacity-60 grayscale' : '',
    selected ? 'ring-2 ring-accent-primary' : '',
    winner ? 'ring-2 ring-accent-success shadow-glow' : '',
    !vetoed && !compact ? 'hover:translate-y-[-2px]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      style={{
        backgroundColor: 'var(--color-surface-card)',
        boxShadow: winner ? '0 0 30px rgba(0, 184, 148, 0.3)' : 'var(--shadow-card)',
        transition: 'var(--transition-base)',
      }}
    >
      <div className={`flex ${compact ? 'flex-row gap-3 p-3' : 'flex-col'}`}>
        {/* Poster */}
        {hasPoster ? (
          <div
            className={`overflow-hidden shrink-0 ${compact ? 'w-16 rounded-lg' : 'w-full'}`}
            style={{ aspectRatio: '2/3', ...(previewPoster && !compact ? { maxHeight: '200px' } : {}) }}
          >
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <PosterFallback title={movie.title} compact={compact} />
        )}

        {/* Info */}
        <div className={compact ? 'flex-1 min-w-0' : 'p-4'}>
          {/* Title & Year */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`font-bold text-text-primary leading-tight ${
                compact ? 'text-sm' : 'text-lg'
              }`}
            >
              {movie.title}
            </h3>
            {movie.year && (
              <span className="text-text-muted text-xs shrink-0">{movie.year}</span>
            )}
          </div>

          {/* Compact: ratings + runtime + director */}
          {compact && (
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                  <span className="text-xs text-text-muted">★ {movie.imdbRating}</span>
                )}
                {movie.rtRating && movie.rtRating !== 'N/A' && (
                  <span className="text-xs text-text-muted">🍅 {movie.rtRating}</span>
                )}
                {movie.runtime && movie.runtime !== 'N/A' && (
                  <span className="text-xs text-text-muted">{movie.runtime}</span>
                )}
              </div>
              {movie.director && movie.director !== 'N/A' && (
                <p className="text-text-muted text-xs truncate">
                  <span className="text-text-secondary">Dir:</span> {movie.director}
                </p>
              )}
            </div>
          )}

          {/* Ratings Row */}
          {!compact && (
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-yellow-400">★</span>
                  <span className="text-text-secondary">{movie.imdbRating}</span>
                  <span className="text-text-muted">IMDb</span>
                </span>
              )}
              {movie.rtRating && movie.rtRating !== 'N/A' && (
                <span className="flex items-center gap-1 text-xs">
                  <span>🍅</span>
                  <span className="text-text-secondary">{movie.rtRating}</span>
                </span>
              )}
              {movie.runtime && movie.runtime !== 'N/A' && (
                <span className="text-text-muted text-xs">{movie.runtime}</span>
              )}
            </div>
          )}

          {/* Director */}
          {!compact && movie.director && movie.director !== 'N/A' && (
            <p className="text-text-muted text-xs mb-2">
              <span className="text-text-secondary">Dir:</span> {movie.director}
            </p>
          )}

          {/* Cast */}
          {!compact && movie.actors && movie.actors.length > 0 && (
            <p className="text-text-muted text-xs mb-3">
              <span className="text-text-secondary">Cast:</span>{' '}
              {Array.isArray(movie.actors) ? movie.actors.join(', ') : movie.actors}
            </p>
          )}

          {/* Plot */}
          {!compact && movie.plot && movie.plot !== 'N/A' && (
            <p className="text-text-secondary text-xs leading-relaxed line-clamp-3">
              {movie.plot}
            </p>
          )}
        </div>
      </div>

      {/* Veto / Undo Buttons */}
      {(onVeto || onUndoVeto) && (
        <div className="p-4 pt-0">
          {!vetoed && onVeto && (
            <button
              onClick={() => onVeto(movie)}
              className="btn-danger w-full text-sm"
            >
              ✕ Veto
            </button>
          )}
          {vetoed && vetoedByMe && onUndoVeto && (
            <button
              onClick={() => onUndoVeto(movie)}
              className="btn-secondary w-full text-sm border-text-muted text-text-muted hover:text-text-secondary"
            >
              ↩ Undo Veto
            </button>
          )}
          {vetoed && !vetoedByMe && (
            <div className="text-center text-text-muted text-xs py-2">
              Vetoed by another player
            </div>
          )}
        </div>
      )}

      {/* Final Vote Select */}
      {onSelect && !vetoed && (
        <div className="p-4 pt-0">
          <button
            onClick={() => onSelect(movie)}
            className={`w-full py-3 rounded-button font-semibold transition-all text-sm ${
              selected
                ? 'bg-accent-primary text-text-inverse'
                : 'btn-secondary'
            }`}
          >
            {selected ? '✓ Selected' : 'Vote for this'}
          </button>
        </div>
      )}

      {/* Vetoed Overlay */}
      {vetoed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl opacity-20 rotate-[-15deg]">✕</span>
        </div>
      )}
    </div>
  );
}
