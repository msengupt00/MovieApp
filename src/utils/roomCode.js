/**
 * Generate a random 4-character alphanumeric room code (uppercase)
 * Excludes ambiguous characters: 0, O, I, 1, L
 */
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a simple unique user ID
 */
export function generateUserId() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
