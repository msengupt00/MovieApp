import { useState, useEffect } from 'react';
import { submitVote, setWinner } from '../../services/roomService';
import MovieCard from '../MovieCard/MovieCard';

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - roomCode: string
 * - userId: string
 * - room: Object
 * - userList: Array
 * - movieList: Array
 */
export default function FinalVote({ roomCode, userId, room, userList, movieList }) {
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const movies = room?.movies || {};
  const votes = room?.votes || {};

  // Surviving movies (not vetoed)
  const survivors = Object.entries(movies)
    .filter(([_, m]) => !m.vetoed)
    .map(([id, data]) => ({ id, ...data }));

  // Check if user already voted (page refresh)
  useEffect(() => {
    if (votes[userId]) {
      setSelectedMovieId(votes[userId]);
      setSubmitted(true);
    }
  }, [votes, userId]);

  // Check if all votes are in → determine winner
  useEffect(() => {
    const voteCount = Object.keys(votes).length;
    if (voteCount < userList.length) return;

    // Tally votes
    const tally = {};
    Object.values(votes).forEach((movieId) => {
      tally[movieId] = (tally[movieId] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(tally));
    const topMovies = Object.keys(tally).filter((id) => tally[id] === maxVotes);

    if (topMovies.length === 1) {
      // Clear winner
      setWinner(roomCode, topMovies[0]);
    } else {
      // Tie — need tiebreaker
      // For now, eliminate non-tied movies and reset votes for a re-vote
      // Only the host triggers this to avoid race conditions
      if (room.host === userId) {
        handleTiebreaker(topMovies);
      }
    }
  }, [votes, userList.length]);

  const handleTiebreaker = async (tiedMovieIds) => {
    // Veto all non-tied survivors and clear votes
    const { update } = await import('../../services/firebase');
    const { db, ref } = await import('../../services/firebase');

    const updates = {};
    // Mark non-tied survivors as vetoed
    Object.entries(movies).forEach(([id, m]) => {
      if (!m.vetoed && !tiedMovieIds.includes(id)) {
        updates[`movies/${id}/vetoed`] = true;
        updates[`movies/${id}/vetoedBy`] = 'tiebreaker';
      }
    });
    // Clear all votes for re-vote
    updates['votes'] = null;

    await update(ref(db, `rooms/${roomCode}`), updates);
    setSubmitted(false);
    setSelectedMovieId(null);
  };

  const handleSelect = (movie) => {
    if (submitted) return;
    setSelectedMovieId(movie.id);
  };

  const handleSubmitVote = async () => {
    if (!selectedMovieId) return;
    setError(null);
    try {
      await submitVote(roomCode, userId, selectedMovieId);
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    }
  };

  // Waiting for others
  if (submitted) {
    const voteCount = Object.keys(votes).length;
    return (
      <div className="page-container">
        <div className="w-full max-w-md text-center animate-fade-in">
          <h2 className="page-title mb-4" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            VOTE CAST!
          </h2>
          <p className="text-text-secondary mb-8">
            Waiting for everyone to vote...
          </p>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-muted text-sm">Votes in</span>
              <span className="text-accent-primary font-bold">
                {voteCount} / {userList.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-base overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(voteCount / userList.length) * 100}%`,
                  backgroundColor: 'var(--color-accent-primary)',
                }}
              />
            </div>
          </div>
          <p className="text-text-muted text-xs mt-6 animate-pulse-slow">
            The moment of truth approaches...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ justifyContent: 'flex-start', paddingTop: '2rem' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="page-title mb-1" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            {survivors.length === 2 ? 'TIEBREAKER!' : 'FINAL VOTE'}
          </h2>
          <p className="text-text-secondary text-sm">
            Pick your favorite from the survivors
          </p>
        </div>

        {/* Survivor Cards */}
        <div className="space-y-4 pb-24">
          {survivors.map((movie, i) => (
            <div key={movie.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <MovieCard
                movie={movie}
                onSelect={handleSelect}
                selected={selectedMovieId === movie.id}
              />
            </div>
          ))}
        </div>

        {/* Submit vote - fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4"
          style={{ backgroundColor: 'var(--color-surface-base)', borderTop: '1px solid var(--color-surface-elevated)' }}>
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmitVote}
              disabled={!selectedMovieId}
              className="btn-primary w-full text-lg py-4"
            >
              {selectedMovieId ? 'Submit Vote' : 'Select a movie'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="fixed top-4 left-4 right-4 z-30 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
