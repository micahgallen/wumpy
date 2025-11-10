const logger = require('../logger');

/**
 * SessionManager - Manages active player sessions and handles duplicate login detection
 *
 * Responsibilities:
 * - Track active sessions (username -> Player mapping)
 * - Check for duplicate logins
 * - Register and remove sessions
 * - Ensure only one active session per username
 */
class SessionManager {
  constructor() {
    // Map of username (lowercase) -> Player object
    this.activeSessions = new Map();
  }

  /**
   * Check if a username has an active session
   * @param {string} username - Username to check
   * @returns {boolean} True if user has an active session
   */
  hasActiveSession(username) {
    return this.activeSessions.has(username.toLowerCase());
  }

  /**
   * Get the active session for a username
   * @param {string} username - Username to look up
   * @returns {Player|undefined} Active player session or undefined if not found
   */
  getSession(username) {
    return this.activeSessions.get(username.toLowerCase());
  }

  /**
   * Register a new active session
   * @param {Player} player - Player object to register
   */
  registerSession(player) {
    if (!player.username) {
      logger.error('Attempted to register session without username');
      return;
    }

    const key = player.username.toLowerCase();
    this.activeSessions.set(key, player);
    logger.log(`Session registered for ${player.username}`);
  }

  /**
   * Remove a session from the active sessions map
   * Only removes if the provided player object is the current active session
   * @param {Player} player - Player object to remove
   * @returns {boolean} True if session was removed
   */
  removeSession(player) {
    if (!player.username) {
      return false;
    }

    const key = player.username.toLowerCase();
    const activePlayer = this.activeSessions.get(key);

    // Only remove if this player object is the current active session
    if (activePlayer === player) {
      this.activeSessions.delete(key);
      logger.log(`Session removed for ${player.username}`);
      return true;
    }

    return false;
  }

  /**
   * Get the count of active sessions
   * @returns {number} Number of active sessions
   */
  getSessionCount() {
    return this.activeSessions.size;
  }

  /**
   * Get all active usernames
   * @returns {string[]} Array of active usernames
   */
  getActiveUsernames() {
    return Array.from(this.activeSessions.values()).map(p => p.username);
  }
}

module.exports = SessionManager;
