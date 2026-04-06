import { db, ref, set, get, push, onValue, update, remove } from './firebase';
import { generateRoomCode, generateUserId } from '../utils/roomCode';

/**
 * Create a new room in Firebase
 * @param {string} hostName - Display name of the host
 * @param {number} moviesPerPerson - 3, 4, or 5
 * @returns {Promise<{ roomCode: string, userId: string }>}
 */
export async function createRoom(hostName, moviesPerPerson) {
  let roomCode = generateRoomCode();
  let attempts = 0;

  // Avoid code collisions
  while (attempts < 10) {
    const snapshot = await get(ref(db, `rooms/${roomCode}`));
    if (!snapshot.exists()) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const userId = generateUserId();

  const roomData = {
    host: userId,
    settings: {
      moviesPerPerson: moviesPerPerson,
    },
    phase: 'lobby',
    users: {
      [userId]: {
        name: hostName,
        ready: false,
        joinedAt: Date.now(),
      },
    },
    createdAt: Date.now(),
  };

  await set(ref(db, `rooms/${roomCode}`), roomData);
  return { roomCode, userId };
}

/**
 * Join an existing room
 * @param {string} roomCode - 4-digit room code
 * @param {string} userName - Display name
 * @returns {Promise<{ userId: string, room: Object }>}
 */
export async function joinRoom(roomCode, userName) {
  const code = roomCode.toUpperCase().trim();
  const snapshot = await get(ref(db, `rooms/${code}`));

  if (!snapshot.exists()) {
    throw new Error('Room not found. Check the code and try again.');
  }

  const room = snapshot.val();

  if (room.phase !== 'lobby') {
    throw new Error('This room has already started. You can\'t join mid-session.');
  }

  const userCount = Object.keys(room.users || {}).length;
  if (userCount >= 8) {
    throw new Error('Room is full (max 8 players).');
  }

  // Check for duplicate names
  const existingNames = Object.values(room.users || {}).map((u) => u.name.toLowerCase());
  if (existingNames.includes(userName.toLowerCase().trim())) {
    throw new Error('That name is taken. Pick a different one!');
  }

  const userId = generateUserId();

  await set(ref(db, `rooms/${code}/users/${userId}`), {
    name: userName.trim(),
    ready: false,
    joinedAt: Date.now(),
  });

  return { userId, room };
}

/**
 * Subscribe to real-time room updates
 * @param {string} roomCode - Room code
 * @param {function} callback - Called with room data on every change
 * @returns {function} Unsubscribe function
 */
export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
}

/**
 * Host starts the game (transitions lobby → entry)
 * @param {string} roomCode
 * @param {string} userId - Must be the host
 */
export async function startGame(roomCode, userId) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room = snapshot.val();

  if (room.host !== userId) {
    throw new Error('Only the host can start the game.');
  }

  const userCount = Object.keys(room.users || {}).length;
  if (userCount < 2) {
    throw new Error('Need at least 2 players to start.');
  }

  await update(ref(db, `rooms/${roomCode}`), { phase: 'entry' });
}

/**
 * Submit a movie to the room
 * @param {string} roomCode
 * @param {string} userId
 * @param {Object} movieData - Full movie data from OMDb
 */
export async function submitMovie(roomCode, userId, movieData) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room = snapshot.val();
  const movies = room.movies || {};

  // Check for duplicates by imdbID
  const isDuplicate = Object.values(movies).some(
    (m) => m.imdbID === movieData.imdbID
  );
  if (isDuplicate) {
    throw new Error(`"${movieData.title}" has already been added!`);
  }

  // Check if user has submitted their max
  const userMovieCount = Object.values(movies).filter(
    (m) => m.submittedBy === userId
  ).length;
  if (userMovieCount >= room.settings.moviesPerPerson) {
    throw new Error('You\'ve already submitted your max movies.');
  }

  const movieId = `movie_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  await set(ref(db, `rooms/${roomCode}/movies/${movieId}`), {
    ...movieData,
    submittedBy: userId,
    vetoed: false,
    vetoedBy: null,
  });

  return movieId;
}

/**
 * Remove a movie that the user previously submitted (during entry phase only)
 * @param {string} roomCode
 * @param {string} movieId
 * @param {string} userId - must be the user who submitted it
 */
export async function removeMovie(roomCode, movieId, userId) {
  const snapshot = await get(ref(db, `rooms/${roomCode}/movies/${movieId}`));
  const movie = snapshot.val();

  if (!movie) {
    throw new Error('Movie not found.');
  }

  if (movie.submittedBy !== userId) {
    throw new Error('You can only remove your own submissions.');
  }

  await remove(ref(db, `rooms/${roomCode}/movies/${movieId}`));
}

/**
 * Mark a user as done submitting movies
 * @param {string} roomCode
 * @param {string} userId
 */
export async function markUserReady(roomCode, userId) {
  await update(ref(db, `rooms/${roomCode}/users/${userId}`), { ready: true });
}

/**
 * Check if all users are ready and transition to veto phase
 * @param {string} roomCode
 */
export async function checkAllReady(roomCode) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room = snapshot.val();
  const users = Object.values(room.users || {});
  const allReady = users.every((u) => u.ready);

  if (allReady) {
    // Reset ready flags for veto phase usage
    const resetUpdates = {};
    Object.keys(room.users).forEach((uid) => {
      resetUpdates[`users/${uid}/ready`] = false;
    });
    resetUpdates.phase = 'veto';
    await update(ref(db, `rooms/${roomCode}`), resetUpdates);
  }

  return allReady;
}

/**
 * Veto a movie
 * @param {string} roomCode
 * @param {string} movieId
 * @param {string} userId
 */
export async function vetoMovie(roomCode, movieId, userId) {
  await update(ref(db, `rooms/${roomCode}/movies/${movieId}`), {
    vetoed: true,
    vetoedBy: userId,
  });
}

/**
 * Undo a veto (only allowed by the original vetoer)
 * @param {string} roomCode
 * @param {string} movieId
 * @param {string} userId
 */
export async function undoVeto(roomCode, movieId, userId) {
  const snapshot = await get(ref(db, `rooms/${roomCode}/movies/${movieId}`));
  const movie = snapshot.val();

  if (movie.vetoedBy !== userId) {
    throw new Error('You can only undo your own vetos.');
  }

  await update(ref(db, `rooms/${roomCode}/movies/${movieId}`), {
    vetoed: false,
    vetoedBy: null,
  });
}

/**
 * Mark user as done with vetos
 * @param {string} roomCode
 * @param {string} userId
 */
export async function markVetosDone(roomCode, userId) {
  await update(ref(db, `rooms/${roomCode}/users/${userId}`), { ready: true });
}

/**
 * Submit final vote
 * @param {string} roomCode
 * @param {string} userId
 * @param {string} movieId
 */
export async function submitVote(roomCode, userId, movieId) {
  await set(ref(db, `rooms/${roomCode}/votes/${userId}`), movieId);
}

/**
 * Transition to finals phase
 * @param {string} roomCode
 */
export async function goToFinals(roomCode) {
  // Reset ready flags
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room = snapshot.val();
  const resetUpdates = {};
  Object.keys(room.users).forEach((uid) => {
    resetUpdates[`users/${uid}/ready`] = false;
  });
  resetUpdates.phase = 'finals';
  await update(ref(db, `rooms/${roomCode}`), resetUpdates);
}

/**
 * Set the winner
 * @param {string} roomCode
 * @param {string} movieId
 */
export async function setWinner(roomCode, movieId) {
  await update(ref(db, `rooms/${roomCode}`), {
    winner: movieId,
    phase: 'winner',
  });
}

/**
 * Get the shareable room link
 * @param {string} roomCode
 * @returns {string}
 */
export function getRoomLink(roomCode) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?room=${roomCode}`;
}
