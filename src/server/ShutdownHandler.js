const path = require('path');
const fs = require('fs');
const logger = require('../logger');

/**
 * ShutdownHandler
 *
 * Coordinates graceful shutdown and state persistence on SIGTERM/SIGINT.
 * Ensures all critical state (timers, corpses, shops) is saved before exit.
 */
class ShutdownHandler {
  /**
   * Create a new shutdown handler
   * @param {Object} components - Server components
   * @param {string} components.dataDir - Path to data directory
   */
  constructor(components) {
    this.components = components;
    this.isShuttingDown = false;
  }

  /**
   * Register signal handlers for graceful shutdown
   */
  setup() {
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
  }

  /**
   * Handle shutdown signal
   * @param {string} signal - Signal name (SIGTERM, SIGINT)
   */
  handleShutdown(signal) {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      logger.log('Shutdown already in progress...');
      return;
    }
    this.isShuttingDown = true;

    logger.log(`${signal} received, saving state...`);

    try {
      // Stop ambient dialogue timers
      this.stopAmbientDialogue();

      // Stop periodic state saving
      this.stopStateSaving();

      // Save critical state synchronously
      this.saveTimers();
      this.saveCorpses();
      this.saveContainers();

      // Save shops asynchronously but wait for completion
      this.saveShops()
        .then(() => {
          logger.log('Graceful shutdown complete');
          process.exit(0);
        })
        .catch(err => {
          logger.error(`Error saving shops on shutdown: ${err.message}`);
          process.exit(1);
        });
    } catch (err) {
      logger.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  }

  /**
   * Stop ambient dialogue system
   */
  stopAmbientDialogue() {
    try {
      const AmbientDialogueManager = require('../systems/ambient/AmbientDialogueManager');
      AmbientDialogueManager.stop();
      logger.log('Stopped ambient dialogue system');
    } catch (err) {
      logger.error(`Failed to stop ambient dialogue: ${err.message}`);
    }
  }

  /**
   * Stop periodic state saving
   */
  stopStateSaving() {
    try {
      const StateManager = require('./StateManager');
      StateManager.stop();
      logger.log('Stopped periodic state saving');
    } catch (err) {
      logger.error(`Failed to stop state saving: ${err.message}`);
    }
  }

  /**
   * Save timer state synchronously
   */
  saveTimers() {
    const TimerManager = require('../systems/corpses/TimerManager');
    const dataDir = this.components?.dataDir || path.join(__dirname, '../../data');
    const timersPath = path.join(dataDir, 'timers.json');

    const timersSaved = TimerManager.saveState(timersPath);
    if (timersSaved) {
      logger.log('Saved timer state');
    }
  }

  /**
   * Save corpse state synchronously
   */
  saveCorpses() {
    const CorpseManager = require('../systems/corpses/CorpseManager');
    const dataDir = this.components?.dataDir || path.join(__dirname, '../../data');
    const corpsesPath = path.join(dataDir, 'corpses.json');

    try {
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Export corpse state
      const corpseState = {
        corpses: CorpseManager.exportState(),
        savedAt: Date.now(),
        version: '1.0'
      };

      // Write synchronously (critical for shutdown)
      fs.writeFileSync(corpsesPath, JSON.stringify(corpseState, null, 2));

      // Log summary
      const npcCount = corpseState.corpses.npcCorpses?.length || 0;
      const playerCount = corpseState.corpses.playerCorpses?.length || 0;
      const totalCorpses = npcCount + playerCount;
      logger.log(`Saved ${totalCorpses} corpses (${npcCount} NPC, ${playerCount} player) to ${corpsesPath}`);
    } catch (err) {
      logger.error(`Failed to save corpse state: ${err.message}`);
    }
  }

  /**
   * Save container state synchronously
   */
  saveContainers() {
    const RoomContainerManager = require('../systems/containers/RoomContainerManager');
    const dataDir = this.components?.dataDir || path.join(__dirname, '../../data');
    const containersPath = path.join(dataDir, 'containers.json');

    const containersSaved = RoomContainerManager.saveState(containersPath);
    if (containersSaved) {
      logger.log('Saved container state');
    }
  }

  /**
   * Save shop state asynchronously
   * @returns {Promise<Object>} Save result with success count
   */
  async saveShops() {
    const ShopManager = require('../systems/economy/ShopManager');
    const result = await ShopManager.saveAllShops();
    logger.log(`Saved ${result.successCount} shops on shutdown`);
    return result;
  }
}

module.exports = ShutdownHandler;
