/**
 * TimerManager - Event-Driven Timer Management
 *
 * Manages all game timers with persistence support across server restarts.
 * Uses individual setTimeout() per timer (NO interval polling) for maximum efficiency.
 *
 * Design Principles:
 * - O(1) timer creation and cancellation
 * - Zero CPU overhead when no timers exist
 * - Automatic cleanup on expiration
 * - Persistence across server restarts
 *
 * Performance Characteristics:
 * - schedule(): O(1) - hash map insertion
 * - cancel(): O(1) - hash map deletion
 * - getRemainingTime(): O(1) - hash map lookup
 * - Memory: ~200 bytes per active timer
 */

const logger = require('../../logger');
const fs = require('fs');
const path = require('path');

class TimerManager {
  constructor() {
    this.timers = new Map(); // timerId -> { timeoutId, expiresAt, callback, data }
  }

  /**
   * Schedule a one-time event
   * @param {string} id - Unique timer ID
   * @param {number} delay - Milliseconds until execution
   * @param {function} callback - Function to execute
   * @param {object} data - Data to persist (must be JSON-serializable)
   * @returns {string} Timer ID
   */
  schedule(id, delay, callback, data = {}) {
    // Cancel existing timer with same ID
    this.cancel(id);

    // Create timeout
    const timeoutId = setTimeout(() => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Timer ${id} callback failed:`, error);
      } finally {
        // Always cleanup even if callback fails
        this.timers.delete(id);
      }
    }, delay);

    // Store timer reference
    this.timers.set(id, {
      timeoutId,
      expiresAt: Date.now() + delay,
      callback,
      data
    });

    logger.log(`Scheduled timer ${id} to fire in ${Math.floor(delay / 1000)}s`);

    return id;
  }

  /**
   * Cancel a scheduled timer
   * @param {string} id - Timer ID
   * @returns {boolean} True if timer was found and canceled
   */
  cancel(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.timers.delete(id);
      logger.log(`Canceled timer ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get remaining time for a timer
   * @param {string} id - Timer ID
   * @returns {number} Milliseconds remaining (0 if expired/not found)
   */
  getRemainingTime(id) {
    const timer = this.timers.get(id);
    if (!timer) return 0;
    return Math.max(0, timer.expiresAt - Date.now());
  }

  /**
   * Check if a timer exists
   * @param {string} id - Timer ID
   * @returns {boolean} True if timer exists
   */
  has(id) {
    return this.timers.has(id);
  }

  /**
   * Get timer data
   * @param {string} id - Timer ID
   * @returns {object|null} Timer data or null if not found
   */
  getTimerData(id) {
    const timer = this.timers.get(id);
    return timer ? timer.data : null;
  }

  /**
   * Get all active timer IDs
   * @returns {Array<string>} Array of timer IDs
   */
  getActiveTimers() {
    return Array.from(this.timers.keys());
  }

  /**
   * Get count of active timers
   * @returns {number} Number of active timers
   */
  getActiveTimerCount() {
    return this.timers.size;
  }

  /**
   * Export timer state for persistence
   * @returns {Array<object>} Serializable timer data
   */
  exportState() {
    const state = [];
    for (const [id, timer] of this.timers) {
      state.push({
        id,
        expiresAt: timer.expiresAt,
        data: timer.data
      });
    }
    return state;
  }

  /**
   * Restore timers from persisted state
   * @param {Array<object>} state - Previously exported state
   * @param {object} callbacks - Map of timer type to callback function
   *                             Format: { 'corpse_decay': callbackFn, ... }
   */
  restoreState(state, callbacks) {
    const now = Date.now();
    let restoredCount = 0;
    let expiredCount = 0;

    for (const entry of state) {
      const remaining = entry.expiresAt - now;
      const callback = callbacks[entry.data.type];

      if (!callback) {
        logger.warn(`No callback registered for timer type: ${entry.data.type}`);
        continue;
      }

      if (remaining <= 0) {
        // Timer expired while server was down - execute immediately
        logger.log(`Timer ${entry.id} expired during downtime, executing now`);
        try {
          callback(entry.data);
          expiredCount++;
        } catch (error) {
          logger.error(`Failed to execute expired timer ${entry.id}:`, error);
        }
      } else {
        // Timer still active - reschedule
        this.schedule(entry.id, remaining, callback, entry.data);
        restoredCount++;
      }
    }

    logger.log(`Restored ${restoredCount} timers, executed ${expiredCount} expired timers`);
  }

  /**
   * Save timer state to disk
   * @param {string} filePath - Path to save file
   * @returns {boolean} True if saved successfully
   */
  saveState(filePath) {
    try {
      const state = {
        timers: this.exportState(),
        savedAt: Date.now(),
        version: '1.0'
      };

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      logger.log(`Saved ${state.timers.length} timers to ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save timer state:`, error);
      return false;
    }
  }

  /**
   * Load timer state from disk
   * @param {string} filePath - Path to load file
   * @param {object} callbacks - Map of timer type to callback function
   * @returns {boolean} True if loaded successfully
   */
  loadState(filePath, callbacks) {
    try {
      if (!fs.existsSync(filePath)) {
        logger.log('No timer state file found, starting fresh');
        return false;
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const state = JSON.parse(rawData);
      const downtime = Date.now() - state.savedAt;

      logger.log(`Loading timer state (server was down for ${Math.floor(downtime / 1000)}s)`);

      this.restoreState(state.timers, callbacks);
      return true;
    } catch (error) {
      logger.error(`Failed to load timer state:`, error);
      return false;
    }
  }

  /**
   * Clear all timers
   * @returns {number} Number of timers cleared
   */
  clearAll() {
    const count = this.timers.size;
    for (const [id, timer] of this.timers) {
      clearTimeout(timer.timeoutId);
    }
    this.timers.clear();
    logger.log(`Cleared ${count} timers`);
    return count;
  }

  /**
   * Get debug info about timers
   * @returns {object} Timer statistics
   */
  getDebugInfo() {
    const info = {
      activeTimers: this.timers.size,
      timers: []
    };

    for (const [id, timer] of this.timers) {
      info.timers.push({
        id,
        expiresAt: timer.expiresAt,
        remainingMs: this.getRemainingTime(id),
        remainingSec: Math.floor(this.getRemainingTime(id) / 1000),
        type: timer.data.type,
        data: timer.data
      });
    }

    // Sort by expiration time
    info.timers.sort((a, b) => a.expiresAt - b.expiresAt);

    return info;
  }
}

// Export singleton instance
module.exports = new TimerManager();
