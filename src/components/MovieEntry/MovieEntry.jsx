import { useState, useEffect, useRef } from 'react';
import { searchMovies, getMovieDetails, getSessionRequestCount } from '../../services/omdb';
import { submitMovie, removeMovie, markUserReady, checkAllReady } from '../../services/roomService';
import MovieCard from '../MovieCard/MovieCard';

/**
 * Generate initials for search result fallback (mirrors MovieCard logic)
 */
function getInitials(title) {
  if (!title) return '?';
  const words = title.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - roomCode: string
 * - userId: string
 * - userName: string
 * - room: Object
 * - userList: Array
 * - settings: { moviesPerPerson: number }
 * - movieList: Array - all submitted movies
 */
export default function MovieEntry({ roomCode, userId, userName, room, userList, settings, movieList }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(null); // movieId being removed
  const [error, setError] = useState(null);
  const [myDone, setMyDone] = useState(false);
  const [failedPosters, setFailedPosters] = useState(new Set());
  const [sessionRequests, setSessionRequests] = useState(getSessionRequestCount);
  const scrollContainerRef = useRef(null);

  const myMovies = movieList.filter((m) => m.submittedBy === userId);
  const maxMovies = settings.moviesPerPerson || 3;
  const remaining = maxMovies - myMovies.length;

  // Scroll to top whenever the selected movie changes (show or hide)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedMovie]);

  // Check if user already finished (page refresh case)
  useEffect(() => {
    if (remaining <= 0 && room?.users?.[userId]?.ready) {
      setMyDone(true);
    }
  }, [remaining, room, userId]);

  // Search handler with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const results = await searchMovies(query);
        setSearchResults(results);
      } catch (e) {
        setError(e.message || 'Search failed. Try again.');
      } finally {
        setSearching(false);
        setSessionRequests(getSessionRequestCount());
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = async (result) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const details = await getMovieDetails(result.imdbID);
      if (details) {
        setSelectedMovie(details);
        setSearchResults([]);
        setQuery('');
      } else {
        setError('Could not load movie details.');
      }
    } catch (e) {
      setError(e.message || 'Failed to load details.');
    } finally {
      setLoadingDetails(false);
      setSessionRequests(getSessionRequestCount());
    }
  };

  const handleConfirm = async () => {
    if (!selectedMovie) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitMovie(roomCode, userId, selectedMovie);
      setSelectedMovie(null);

      // If that was the last movie, mark ready
      if (myMovies.length + 1 >= maxMovies) {
        await markUserReady(roomCode, userId);
        setMyDone(true);
        await checkAllReady(roomCode);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedMovie(null);
    setQuery('');
    setError(null);
  };

  const handleRemoveMovie = async (movieId) => {
    setRemoving(movieId);
    setError(null);
    try {
      await removeMovie(roomCode, movieId, userId);
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  };

  const handleSearchPosterError = (imdbID) => {
    setFailedPosters((prev) => new Set(prev).add(imdbID));
  };

  // Waiting screen - user is done, others aren't
  if (myDone) {
    const readyCount = userList.filter((u) => u.ready).length;
    return (
      <div className="page-container">
        <div className="w-full max-w-md text-center animate-fade-in">
          <h2 className="page-title mb-4" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            YOU'RE SET!
          </h2>
          <p className="text-text-secondary mb-8">
            Waiting for others to finish picking...
          </p>

          {/* Progress */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-muted text-sm">Players ready</span>
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

          {/* My picks summary */}
          <div className="card">
            <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
              Your picks
            </h3>
            <div className="space-y-2">
              {myMovies.map((m) => (
                <div key={m.id} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-accent-primary shrink-0 mt-0.5">•</span>
                  <span className="text-left">{m.title} ({m.year})</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-text-muted text-xs mt-6 animate-pulse-slow">
            Hang tight...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface-base)' }}>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-8"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
      <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="page-title mb-1" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            PICK YOUR MOVIES
          </h2>
          <p className="text-text-secondary text-sm">
            {remaining} of {maxMovies} remaining
          </p>
        </div>

        {/* Already submitted movies - with X to remove */}
        {myMovies.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {myMovies.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated text-text-secondary text-xs group"
                >
                  {m.title}
                  <button
                    onClick={() => handleRemoveMovie(m.id)}
                    disabled={removing === m.id}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors"
                    title={`Remove ${m.title}`}
                  >
                    {removing === m.id ? (
                      <span className="w-3 h-3 border border-text-muted border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '✕'
                    )}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preview selected movie */}
        {selectedMovie && (
          <div className="mb-4 animate-scale-in">
            <MovieCard movie={selectedMovie} previewPoster />
            <div className="flex gap-3 mt-3">
              <button onClick={handleCancel} className="btn-secondary flex-1 text-sm">
                Try another
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-primary flex-1 text-sm"
              >
                {submitting ? 'Adding...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* Search input */}
        {!selectedMovie && (
          <>
            <div className="relative mb-4">
              {sessionRequests > 0 && (
                <p className="text-text-muted text-xs text-right mb-1">
                  {sessionRequests} search{sessionRequests !== 1 ? 'es' : ''} this session
                </p>
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a movie..."
                className="input-field pr-10"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                {searchResults.map((result) => {
                  const posterOk = result.poster && !failedPosters.has(result.imdbID);
                  const alreadyAdded = movieList.some((m) => m.imdbID === result.imdbID);
                  return (
                    <button
                      key={result.imdbID}
                      onClick={() => !alreadyAdded && handleSelectResult(result)}
                      disabled={loadingDetails || alreadyAdded}
                      className={`w-full text-left card p-3 flex items-center gap-3 transition-colors ${
                        alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-elevated cursor-pointer'
                      }`}
                    >
                      {posterOk ? (
                        <img
                          src={result.poster}
                          alt={result.title}
                          className="w-10 h-14 object-cover object-top rounded shrink-0"
                          loading="lazy"
                          onError={() => handleSearchPosterError(result.imdbID)}
                        />
                      ) : (
                        <div
                          className="w-10 h-14 rounded flex items-center justify-center shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-surface-elevated), var(--color-surface-card))',
                          }}
                        >
                          <span className="font-display text-text-muted text-[10px]">
                            {getInitials(result.title)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{result.title}</p>
                        <p className="text-text-muted text-xs">{result.year}</p>
                      </div>
                      {alreadyAdded && (
                        <span className="text-xs px-2 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)' }}>
                          Already added
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading details overlay */}
            {loadingDetails && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-muted text-sm">Loading movie details...</p>
              </div>
            )}

            {/* No results */}
            {query.trim().length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">
                No movies found. Try a different title.
              </p>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center animate-scale-in">
            {error}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
