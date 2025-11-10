const net = require('net');
const path = require('path');
const PlayerDB = require('./playerdb');
const World = require('./world');
const CombatEngine = require('./combat/combatEngine');
const { parseCommand } = require('./commands');
const colors = require('./colors');
const { getBanner } = require('./banner');
const RespawnService = require('./respawnService');
const RespawnManager = require('./systems/corpses/RespawnManager');
const logger = require('./logger');
const { bootstrapAdmin, createBanEnforcementHook, updatePlayerInfoOnLogin } = require('./admin/bootstrap');
const { calculateMaxHP } = require('./utils/modifiers');
const Player = require('./server/Player');
const SessionManager = require('./server/SessionManager');
const AuthenticationFlow = require('./server/AuthenticationFlow');

// Load items FIRST (before World is created)
const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');

logger.log('Loading core items...');
const coreItemResult = loadCoreItems();
logger.log(`Core items loaded: ${coreItemResult.successCount} items registered`);

logger.log('Loading Sesame Street items...');
const sesameItemResult = loadSesameStreetItems();
logger.log(`Sesame Street items loaded: ${sesameItemResult.successCount} items registered`);

// Load shops (after items are registered)
const { loadSesameStreetShops } = require('../world/sesame_street/shops/loadShops');

logger.log('Loading Sesame Street shops...');
const sesameShopResult = loadSesameStreetShops();
logger.log(`Sesame Street shops loaded: ${sesameShopResult.successCount} shops registered`);

// Initialize server components
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

// PHASE 4: Restore corpse and timer state from previous session
const TimerManager = require('./systems/corpses/TimerManager');
const CorpseManager = require('./systems/corpses/CorpseManager');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
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

// Perform one-time manual respawn check on startup
// This catches any NPCs that should exist but don't (e.g., after server restart)
// This runs AFTER corpse restoration to respect active corpses
const respawnedCount = RespawnManager.checkAndRespawnMissing();
logger.log(`Startup respawn check: ${respawnedCount} NPCs respawned`);

// OLD POLLING-BASED RESPAWN SERVICE (DEPRECATED)
// The new RespawnManager handles all NPC respawning via events from CorpseManager
// Keeping this commented out for now in case we need to rollback
// const respawnService = new RespawnService(world);
// respawnService.start();

// Initialize admin system
let adminSystem = null;
let banEnforcementHook = null;
let authenticationFlow = null;

/**
 * Handle player input based on their current state
 * @param {Player} player - Player object
 * @param {string} input - User input
 */
function handleInput(player, input) {
  // Try to handle auth states first
  if (authenticationFlow && authenticationFlow.handleInput(player, input)) {
    return; // Auth flow handled it
  }

  // Handle non-auth states
  player.lastActivity = Date.now();
  const trimmed = input.trim();

  switch (player.state) {
    case 'playing':
      parseCommand(trimmed, player, world, playerDB, players, activeInteractions, combatEngine, adminSystem);
      player.sendPrompt();
      break;

    default:
      player.send('Error: Invalid state.\n');
      player.socket.end();
  }
}

/**
 * Create the TCP server
 */
const server = net.createServer(socket => {
  const player = new Player(socket);
  players.add(player);

  const clientIP = socket.remoteAddress;
  const clientPort = socket.remotePort;
  logger.log(`New connection from ${clientIP}:${clientPort}`);

  // Welcome banner
  player.send('\n' + getBanner() + '\n');
  player.prompt('Username: ');

  // Handle incoming data
  socket.on('data', data => {
    const input = data.toString().trim();
    handleInput(player, input);
  });

  // Handle disconnection
  socket.on('end', () => {
    if (player.username) {
      logger.log(`Player ${player.username} (${clientIP}:${clientPort}) disconnected.`);

      // CRITICAL FIX: Save player state to database on logout
      // This ensures all stats, equipment, inventory, and progression persist
      playerDB.savePlayer(player);

      // Remove from active sessions map (only if THIS player object is the current active session)
      sessionManager.removeSession(player);
    } else {
      logger.log(`Connection from ${clientIP}:${clientPort} disconnected before logging in.`);
    }
    players.delete(player);
  });

  // Handle errors
  socket.on('error', err => {
    const identifier = player.username || `${clientIP}:${clientPort}`;
    logger.error(`Socket error for ${identifier}:`, err);

    // Remove from active sessions if this is the active player
    sessionManager.removeSession(player);

    players.delete(player);
  });
});

// Handle server errors
server.on('error', err => {
  logger.error('Server error:', err);
});

async function main() {
  logger.log('Initializing admin system...');
  adminSystem = await bootstrapAdmin({
    playerDB,
    world,
    allPlayers: players,
    combatEngine,
    dataDir: path.join(__dirname, '../data/admin')
  });
  banEnforcementHook = createBanEnforcementHook(adminSystem.adminService);
  logger.log('Admin system ready.');

  // Initialize authentication flow with all dependencies
  authenticationFlow = new AuthenticationFlow({
    playerDB,
    sessionManager,
    world,
    players,
    adminSystem,
    banEnforcementHook
  });
  logger.log('Authentication flow initialized.');

  const PORT = parseInt(process.env.PORT, 10) || 4000;
  server.listen(PORT, () => {
    logger.log('='.repeat(50));
    logger.log(`The Wumpy and Grift MUD Server`);
    logger.log(`Listening on port ${PORT}`);
    logger.log('='.repeat(50));
  });
}

main().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.log(`${signal} received, saving state...`);

  try {
    const ShopManager = require('./systems/economy/ShopManager');
    const TimerManager = require('./systems/corpses/TimerManager');
    const CorpseManager = require('./systems/corpses/CorpseManager');
    const path = require('path');

    // Save corpse and timer state synchronously (critical for shutdown)
    const dataDir = path.join(__dirname, '../data');
    const timersPath = path.join(dataDir, 'timers.json');
    const corpsesPath = path.join(dataDir, 'corpses.json');

    // Save timers
    const timersSaved = TimerManager.saveState(timersPath);
    if (timersSaved) {
      logger.log('Saved timer state');
    }

    // Save corpses
    try {
      const fs = require('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const corpseState = {
        corpses: CorpseManager.exportState(),
        savedAt: Date.now(),
        version: '1.0'
      };

      fs.writeFileSync(corpsesPath, JSON.stringify(corpseState, null, 2));
      const npcCount = corpseState.corpses.npcCorpses?.length || 0;
      const playerCount = corpseState.corpses.playerCorpses?.length || 0;
      const totalCorpses = npcCount + playerCount;
      logger.log(`Saved ${totalCorpses} corpses (${npcCount} NPC, ${playerCount} player) to ${corpsesPath}`);
    } catch (err) {
      logger.error(`Failed to save corpse state: ${err.message}`);
    }

    // Use async save for shops but don't wait - just log when complete
    ShopManager.saveAllShops().then(result => {
      logger.log(`Saved ${result.successCount} shops on shutdown`);
      logger.log('Graceful shutdown complete');
      process.exit(0);
    }).catch(err => {
      logger.error(`Error saving shops on shutdown: ${err.message}`);
      process.exit(1);
    });
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export Player class for testing
module.exports = { Player };
