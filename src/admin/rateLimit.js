/**
 * Rate Limiter for Admin Commands
 * Prevents command spam and abuse
 */

class RateLimiter {
  constructor(maxCommands = 5, windowSeconds = 10) {
    this.maxCommands = maxCommands;
    this.windowMs = windowSeconds * 1000;
    this.commandLog = new Map(); // Map of playerID -> array of timestamps
  }

  /**
   * Check if player is rate limited
   * @param {string} playerID - Player ID
   * @returns {Object} { allowed: boolean, resetIn: number }
   */
  checkLimit(playerID) {
    const now = Date.now();
    const playerLog = this.commandLog.get(playerID) || [];

    // Remove timestamps outside the window
    const recentCommands = playerLog.filter(timestamp => now - timestamp < this.windowMs);

    // Update the log
    this.commandLog.set(playerID, recentCommands);

    // Check if limit exceeded
    if (recentCommands.length >= this.maxCommands) {
      const oldestCommand = Math.min(...recentCommands);
      const resetIn = Math.ceil((oldestCommand + this.windowMs - now) / 1000);

      return {
        allowed: false,
        resetIn: resetIn
      };
    }

    return {
      allowed: true,
      resetIn: 0
    };
  }

  /**
   * Record a command execution
   * @param {string} playerID - Player ID
   */
  recordCommand(playerID) {
    const now = Date.now();
    const playerLog = this.commandLog.get(playerID) || [];
    playerLog.push(now);
    this.commandLog.set(playerID, playerLog);
  }

  /**
   * Clear rate limit for a player (useful for admins)
   * @param {string} playerID - Player ID
   */
  clearLimit(playerID) {
    this.commandLog.delete(playerID);
  }

  /**
   * Clean up old entries (should be called periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [playerID, timestamps] of this.commandLog.entries()) {
      const recent = timestamps.filter(ts => now - ts < this.windowMs);
      if (recent.length === 0) {
        this.commandLog.delete(playerID);
      } else {
        this.commandLog.set(playerID, recent);
      }
    }
  }
}

module.exports = RateLimiter;
