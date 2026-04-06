import { useState, useEffect, useCallback } from 'react';
import { subscribeToRoom } from '../services/roomService';

/**
 * Hook to subscribe to real-time room data from Firebase
 * @param {string|null} roomCode - Room code to subscribe to
 * @returns {{ room: Object|null, loading: boolean, error: string|null }}
 */
export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoom(data);
        setError(null);
      } else {
        setError('Room no longer exists.');
        setRoom(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode]);

  // Derived state
  const users = room?.users || {};
  const userList = Object.entries(users).map(([id, data]) => ({ id, ...data }));
  const userCount = userList.length;
  const phase = room?.phase || null;
  const isHost = useCallback(
    (userId) => room?.host === userId,
    [room?.host]
  );
  const movies = room?.movies || {};
  const movieList = Object.entries(movies).map(([id, data]) => ({ id, ...data }));
  const settings = room?.settings || {};

  return {
    room,
    loading,
    error,
    users,
    userList,
    userCount,
    phase,
    isHost,
    movies,
    movieList,
    settings,
  };
}
