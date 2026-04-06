import { useState, useCallback } from 'react';

const STORAGE_KEY = 'moviemania_session';

function loadSession() {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSessionStorage() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Hook to manage the current user's session
 * Persists across page refreshes via sessionStorage
 */
export function useSession() {
  const [session, setSession] = useState(loadSession);

  const setSessionData = useCallback(({ userId, roomCode, userName }) => {
    const data = { userId, roomCode, userName };
    saveSession(data);
    setSession(data);
  }, []);

  const clearSession = useCallback(() => {
    clearSessionStorage();
    setSession(null);
  }, []);

  return {
    userId: session?.userId || null,
    roomCode: session?.roomCode || null,
    userName: session?.userName || null,
    setSession: setSessionData,
    clearSession,
    isInRoom: !!session?.roomCode,
  };
}
