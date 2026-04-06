import { useState } from 'react';
import { createRoom, joinRoom, getRoomLink } from '../../services/roomService';

/**
 * PRESENTATION COMPONENT
 * Replace this entire component when Figma designs arrive.
 * Props contract stays the same.
 */
export default function Home({ onRoomJoined }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [moviesPerPerson, setMoviesPerPerson] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name!');
    setLoading(true);
    setError(null);
    try {
      const { roomCode: code, userId } = await createRoom(name.trim(), moviesPerPerson);
      onRoomJoined({ roomCode: code, userId, userName: name.trim() });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name!');
    if (!roomCode.trim()) return setError('Enter a room code!');
    setLoading(true);
    setError(null);
    try {
      const { userId } = await joinRoom(roomCode.trim(), name.trim());
      onRoomJoined({ roomCode: roomCode.trim().toUpperCase(), userId, userName: name.trim() });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="page-title mb-2">MOVIEMANIA</h1>
          <p className="text-text-secondary text-lg">Pick a movie. Together.</p>
        </div>

        {/* Mode Selection */}
        {mode === null && (
          <div className="space-y-4 animate-slide-up">
            <button
              onClick={() => setMode('create')}
              className="btn-primary w-full text-lg py-4"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-secondary w-full text-lg py-4"
            >
              Join Room
            </button>
          </div>
        )}

        {/* Create Room Form */}
        {mode === 'create' && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                maxLength={20}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Movies Per Person
              </label>
              <div className="flex gap-3">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMoviesPerPerson(n)}
                    className={`flex-1 py-3 rounded-button font-semibold transition-all duration-200 ${
                      moviesPerPerson === n
                        ? 'bg-accent-primary text-text-inverse'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-text-muted text-xs mt-2">
                Each person gets {moviesPerPerson - 1} veto{moviesPerPerson - 1 !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>

            <button
              onClick={() => { setMode(null); setError(null); }}
              className="w-full text-text-muted hover:text-text-secondary text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Join Room Form */}
        {mode === 'join' && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                maxLength={20}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3K"
                className="input-field text-center tracking-[0.3em] text-2xl font-display"
                maxLength={4}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>

            <button
              onClick={() => { setMode(null); setError(null); }}
              className="w-full text-text-muted hover:text-text-secondary text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center animate-scale-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
