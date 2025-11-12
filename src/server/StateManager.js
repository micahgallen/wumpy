const path = require('path');
const fs = require('fs');
const logger = require('../logger');
const TimerManager = require('../systems/corpses/TimerManager');
const CorpseManager = require('../systems/corpses/CorpseManager');
const RoomContainerManager = require('../systems/containers/RoomContainerManager');

/**
 * StateManager
 *
 * Handles periodic auto-save of all game state (timers, corpses, containers).
 * Runs every 60 seconds to ensure minimal data loss on unexpected shutdown.
 *
 * Design Principles:
 * - Centralized state saving logic
 * - Periodic auto-save every 60 seconds
 * - Individual system managers handle export logic
 * - Graceful error handling per system
 * - Can be stopped on graceful shutdown
 */
class StateManager {
  constructor() {
    this.saveInterval = null;
    this.saveIntervalMs = 60000; // 60 seconds
    this.isRunning = false;
    this.dataDir = null;
  }

  /**
   * Start periodic auto-save
   * @param {string} dataDir - Data directory path
   */
  start(dataDir) {
    if (this.isRunning) {
      logger.warn('StateManager already running');
      return;
    }

    this.dataDir = dataDir;
    this.isRunning = true;

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Start periodic save
    this.saveInterval = setInterval(() => {
      this.saveAllState();
    }, this.saveIntervalMs);

    logger.log(`StateManager started (auto-save every ${this.saveIntervalMs / 1000}s)`);
  }

  /**
   * Stop periodic auto-save
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    this.isRunning = false;
    logger.log('StateManager stopped');
  }

  /**
   * Save all game state synchronously
   * Called by the periodic timer and can be called manually
   */
  saveAllState() {
    if (!this.dataDir) {
      logger.error('StateManager: dataDir not set');
      return;
    }

    const startTime = Date.now();
    let savedCount = 0;
    let errorCount = 0;

    // Save timers
    try {
      const timersPath = path.join(this.dataDir, 'timers.json');
      if (TimerManager.saveState(timersPath)) {
        savedCount++;
      }
    } catch (err) {
      logger.error(`StateManager: Failed to save timers: ${err.message}`);
      errorCount++;
    }

    // Save corpses
    try {
      const corpsesPath = path.join(this.dataDir, 'corpses.json');

      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Export corpse state
      const corpseState = {
        corpses: CorpseManager.exportState(),
        savedAt: Date.now(),
        version: '1.0'
      };

      // Write synchronously
      fs.writeFileSync(corpsesPath, JSON.stringify(corpseState, null, 2));
      savedCount++;
    } catch (err) {
      logger.error(`StateManager: Failed to save corpses: ${err.message}`);
      errorCount++;
    }

    // Save containers
    try {
      const containersPath = path.join(this.dataDir, 'containers.json');
      if (RoomContainerManager.saveState(containersPath)) {
        savedCount++;
      }
    } catch (err) {
      logger.error(`StateManager: Failed to save containers: ${err.message}`);
      errorCount++;
    }

    const duration = Date.now() - startTime;
    logger.log(`StateManager: Saved ${savedCount} systems in ${duration}ms (${errorCount} errors)`);
  }

  /**
   * Check if StateManager is running
   * @returns {boolean} True if running
   */
  isActive() {
    return this.isRunning;
  }

  /**
   * Get current configuration
   * @returns {Object} Configuration info
   */
  getInfo() {
    return {
      isRunning: this.isRunning,
      saveIntervalMs: this.saveIntervalMs,
      saveIntervalSeconds: this.saveIntervalMs / 1000,
      dataDir: this.dataDir
    };
  }
}

// Export singleton instance
module.exports = new StateManager();
