import { useState } from 'react';
import { startGame, getRoomLink } from '../../services/roomService';

/**
 * PRESENTATION COMPONENT
 * Props contract:
 * - roomCode: string
 * - userId: string
 * - room: Object (full Firebase room data)
 * - userList: Array<{ id, name, joinedAt }>
 * - userCount: number
 * - isHost: boolean
 * - settings: { moviesPerPerson: number }
 */
export default function Lobby({ roomCode, userId, room, userList, userCount, isHost, settings }) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const link = getRoomLink(roomCode);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy link instead
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {} // eslint-disable-line no-empty
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {} // eslint-disable-line no-empty
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startGame(roomCode, userId);
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="page-title mb-1">LOBBY</h1>
          <p className="text-text-muted text-sm">Waiting for players...</p>
        </div>

        {/* Room Code Display */}
        <div className="card text-center mb-6 animate-slide-up">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-2">Room Code</p>
          <button
            onClick={handleCopyCode}
            className="text-5xl font-display tracking-[0.3em] text-accent-primary hover:brightness-110 transition-all cursor-pointer"
          >
            {roomCode}
          </button>
          <p className="text-text-muted text-xs mt-2">
            {copied ? '✓ Copied!' : 'Tap to copy'}
          </p>

          {/* Share Link */}
          <button
            onClick={handleCopyLink}
            className="mt-3 text-text-secondary text-xs hover:text-accent-primary transition-colors underline underline-offset-2"
          >
            Copy invite link
          </button>
        </div>

        {/* Settings Badge */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="px-3 py-1.5 rounded-full bg-surface-elevated text-text-secondary text-xs">
            {settings.moviesPerPerson} movies each
          </div>
          <div className="px-3 py-1.5 rounded-full bg-surface-elevated text-text-secondary text-xs">
            {settings.moviesPerPerson - 1} veto{settings.moviesPerPerson - 1 !== 1 ? 's' : ''} each
          </div>
        </div>

        {/* User List */}
        <div className="card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-secondary text-sm font-semibold uppercase tracking-wider">
              Players
            </h2>
            <span className="text-text-muted text-xs">{userCount}/8</span>
          </div>

          <div className="space-y-2">
            {userList.map((user, i) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-base/50 animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Avatar circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: `hsl(${(i * 75 + 30) % 360}, 60%, 45%)`,
                    color: '#fff',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <span className="text-text-primary font-medium">{user.name}</span>

                {/* Host badge */}
                {room.host === user.id && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-semibold">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Waiting indicator */}
          {userCount < 2 && (
            <p className="text-text-muted text-xs text-center mt-4 animate-pulse-slow">
              Waiting for at least 1 more player...
            </p>
          )}
        </div>

        {/* Start Button (host only) */}
        {isHost && (
          <button
            onClick={handleStart}
            disabled={starting || userCount < 2}
            className="btn-primary w-full text-lg py-4 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            {starting ? 'Starting...' : userCount < 2 ? 'Need more players...' : 'Start Game'}
          </button>
        )}

        {/* Non-host waiting message */}
        {!isHost && (
          <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-text-muted text-sm animate-pulse-slow">
              Waiting for host to start...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-button bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
