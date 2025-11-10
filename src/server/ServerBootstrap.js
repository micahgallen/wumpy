const path = require('path');
const PlayerDB = require('../playerdb');
const World = require('../world');
const CombatEngine = require('../combat/combatEngine');
const RespawnManager = require('../systems/corpses/RespawnManager');
const TimerManager = require('../systems/corpses/TimerManager');
const CorpseManager = require('../systems/corpses/CorpseManager');
const SessionManager = require('./SessionManager');
const AuthenticationFlow = require('./AuthenticationFlow');
const ConnectionHandler = require('./ConnectionHandler');
const logger = require('../logger');
const { bootstrapAdmin, createBanEnforcementHook } = require('../admin/bootstrap');
const fs = require('fs');

/**
 * ServerBootstrap
 *
 * Handles server initialization sequence:
 * 1. Load items (core, Sesame Street)
 * 2. Load shops
 * 3. Initialize core components (PlayerDB, World, CombatEngine)
 * 4. Restore persisted state (corpses, timers)
 * 5. Set up respawn system
 * 6. Initialize admin system
 * 7. Initialize authentication flow
 * 8. Initialize connection handler
 */
class ServerBootstrap {
  /**
   * Initialize all server components
   * @param {Object} options - Configuration options
   * @param {number} options.port - Server port
   * @param {string} options.dataDir - Data directory path
   * @returns {Promise<Object>} Initialized components
   */
  static async initialize(options = {}) {
    const dataDir = options.dataDir || path.join(__dirname, '../../data');

    // Phase 1: Load items
    ServerBootstrap.loadItems();

    // Phase 2: Load shops (after items are registered)
    ServerBootstrap.loadShops();

    // Phase 3: Initialize core components
    const components = ServerBootstrap.initializeComponents();

    // Phase 4: Restore persisted state
    ServerBootstrap.restoreCorpseState(components.world, components.playerDB, dataDir);

    // Phase 5: Perform startup respawn check
    ServerBootstrap.checkRespawns();

    // Phase 6: Initialize admin system
    const adminComponents = await ServerBootstrap.initializeAdmin(components, dataDir);
    Object.assign(components, adminComponents);

    // Phase 7: Initialize authentication flow
    const authenticationFlow = new AuthenticationFlow({
      playerDB: components.playerDB,
      sessionManager: components.sessionManager,
      world: components.world,
      players: components.players,
      adminSystem: components.adminSystem,
      banEnforcementHook: components.banEnforcementHook
    });
    components.authenticationFlow = authenticationFlow;
    logger.log('Authentication flow initialized.');

    // Phase 8: Create handleInput function for connection handler
    const handleInput = ServerBootstrap.createHandleInput(authenticationFlow, components);

    // Phase 9: Initialize connection handler
    const connectionHandler = new ConnectionHandler({
      playerDB: components.playerDB,
      sessionManager: components.sessionManager,
      handleInput
    });
    components.connectionHandler = connectionHandler;
    logger.log('Connection handler initialized.');

    return components;
  }

  /**
   * Load all items (Phase 1)
   */
  static loadItems() {
    const { loadCoreItems } = require('../../world/core/items/loadItems');
    const { loadSesameStreetItems } = require('../../world/sesame_street/items/loadItems');

    logger.log('Loading core items...');
    const coreItemResult = loadCoreItems();
    logger.log(`Core items loaded: ${coreItemResult.successCount} items registered`);

    logger.log('Loading Sesame Street items...');
    const sesameItemResult = loadSesameStreetItems();
    logger.log(`Sesame Street items loaded: ${sesameItemResult.successCount} items registered`);
  }

  /**
   * Load all shops (Phase 2)
   */
  static loadShops() {
    const { loadSesameStreetShops } = require('../../world/sesame_street/shops/loadShops');

    logger.log('Loading Sesame Street shops...');
    const sesameShopResult = loadSesameStreetShops();
    logger.log(`Sesame Street shops loaded: ${sesameShopResult.successCount} shops registered`);
  }

  /**
   * Initialize core server components (Phase 3)
   * @returns {Object} Initialized components
   */
  static initializeComponents() {
    const playerDB = new PlayerDB();
    const world = new World(); // Now items are available for room initialization
    const players = new Set();
    const sessionManager = new SessionManager();
    const activeInteractions = new Map();

    const combatEngine = new CombatEngine(world, players, playerDB);

    // Initialize event-driven respawn system
    // This replaces the old polling-based RespawnService for NPCs
    RespawnManager.initialize(world);

    // Listen for room messages from RespawnManager and broadcast to players
    RespawnManager.on('roomMessage', ({ roomId, message }) => {
      // Broadcast message to all players in the specified room
      for (const player of players) {
        if (player.currentRoom === roomId && player.state === 'playing') {
          player.send('\n' + message + '\n');
          player.sendPrompt();
        }
      }
    });

    return {
      playerDB,
      world,
      players,
      sessionManager,
      activeInteractions,
      combatEngine
    };
  }

  /**
   * Restore corpse and timer state from previous session (Phase 4)
   * @param {World} world - World instance
   * @param {PlayerDB} playerDB - PlayerDB instance
   * @param {string} dataDir - Data directory path
   */
  static restoreCorpseState(world, playerDB, dataDir) {
    const corpsesPath = path.join(dataDir, 'corpses.json');

    logger.log('Restoring corpse and timer state...');

    // Load corpse state first
    try {
      if (fs.existsSync(corpsesPath)) {
        const rawData = fs.readFileSync(corpsesPath, 'utf8');
        const corpseState = JSON.parse(rawData);
        const downtime = Date.now() - corpseState.savedAt;

        logger.log(`Loading corpse state (server was down for ${Math.floor(downtime / 1000)}s)`);

        // Restore corpses (this will also emit decay events for expired corpses)
        CorpseManager.restoreState(corpseState.corpses, world);

        // Clean up abandoned player corpses (corpses from inactive players)
        logger.log('Running abandoned corpse cleanup...');
        CorpseManager.cleanupAbandonedCorpses(world, playerDB);
      } else {
        logger.log('No corpse state file found, starting fresh');
      }
    } catch (err) {
      logger.error(`Failed to restore corpse state: ${err.message}`);
      logger.log('Starting with fresh corpse state');
    }
  }

  /**
   * Perform startup respawn check (Phase 5)
   * This catches any NPCs that should exist but don't (e.g., after server restart)
   * This runs AFTER corpse restoration to respect active corpses
   */
  static checkRespawns() {
    const respawnedCount = RespawnManager.checkAndRespawnMissing();
    logger.log(`Startup respawn check: ${respawnedCount} NPCs respawned`);
  }

  /**
   * Initialize admin system (Phase 6)
   * @param {Object} components - Initialized components
   * @param {string} dataDir - Data directory path
   * @returns {Promise<Object>} Admin components
   */
  static async initializeAdmin(components, dataDir) {
    logger.log('Initializing admin system...');
    const adminSystem = await bootstrapAdmin({
      playerDB: components.playerDB,
      world: components.world,
      allPlayers: components.players,
      combatEngine: components.combatEngine,
      dataDir: path.join(dataDir, 'admin')
    });
    const banEnforcementHook = createBanEnforcementHook(adminSystem.adminService);
    logger.log('Admin system ready.');

    return {
      adminSystem,
      banEnforcementHook
    };
  }

  /**
   * Create handleInput function for connection handler
   * @param {AuthenticationFlow} authenticationFlow - Authentication flow instance
   * @param {Object} components - Initialized components
   * @returns {Function} handleInput function
   */
  static createHandleInput(authenticationFlow, components) {
    const { parseCommand } = require('../commands');

    return function handleInput(player, input) {
      // Try to handle auth states first
      if (authenticationFlow && authenticationFlow.handleInput(player, input)) {
        return; // Auth flow handled it
      }

      // Handle non-auth states
      player.lastActivity = Date.now();
      const trimmed = input.trim();

      switch (player.state) {
        case 'playing':
          parseCommand(
            trimmed,
            player,
            components.world,
            components.playerDB,
            components.players,
            components.activeInteractions,
            components.combatEngine,
            components.adminSystem
          );
          player.sendPrompt();
          break;

        default:
          player.send('Error: Invalid state.\n');
          player.socket.end();
      }
    };
  }
}

module.exports = ServerBootstrap;
