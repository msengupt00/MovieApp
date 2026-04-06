/**
 * Calculate the number of vetos each user gets
 * @param {number} moviesPerPerson - Movies each user submits (3, 4, or 5)
 * @returns {number} Vetos per user
 */
export function getVetosPerUser(moviesPerPerson) {
  return moviesPerPerson - 1;
}

/**
 * Calculate total surviving movies
 * @param {number} numUsers - Number of users in the room
 * @returns {number} Number of movies that survive (always equals numUsers)
 */
export function getSurvivorCount(numUsers) {
  return numUsers;
}

/**
 * Check if a user has used all their vetos
 * @param {Object} movies - All movies object from Firebase
 * @param {string} userId - The user's ID
 * @param {number} vetoBudget - Total vetos allowed
 * @returns {{ used: number, remaining: number, isDone: boolean }}
 */
export function getVetoStatus(movies, userId, vetoBudget) {
  const used = Object.values(movies || {}).filter((m) => m.vetoedBy === userId).length;
  const remaining = vetoBudget - used;
  return { used, remaining, isDone: remaining <= 0 };
}

/**
 * Check if a user should auto-complete (no un-vetoed movies left to veto)
 * @param {Object} movies - All movies object from Firebase
 * @param {string} userId - The user's ID
 * @returns {boolean}
 */
export function shouldAutoComplete(movies, userId) {
  return !Object.values(movies || {}).some(
    (m) => !m.vetoed || m.vetoedBy === userId
  );
}
