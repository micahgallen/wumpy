const net = require('net');
const path = require('path');
const PlayerDB = require('./playerdb');
const World = require('./world');
const CombatEngine = require('./combat/combatEngine');
const { parseCommand } = require('./commands');
const colors = require('./colors');
const { getBanner } = require('./banner');
const RespawnService = require('./respawnService');
const logger = require('./logger');
const { bootstrapAdmin, createBanEnforcementHook, updatePlayerInfoOnLogin } = require('./admin/bootstrap');

/**
 * Player class - Represents a connected player
 */
class Player {
  constructor(socket) {
    this.socket = socket;
    this.username = null;
    this.description = null;
    this.currentRoom = null;
    this.inventory = []; // Array of object IDs
    this.lastActivity = Date.now();
    this.state = 'login_username'; // States: login_username, login_password, create_username, create_password, duplicate_login_choice, pending_disconnect, playing
    this.tempUsername = null; // Temporary storage during login/creation
    this.tempPlayerData = null; // Temporary storage for authenticated player data during duplicate login
    this.tempExistingPlayer = null; // Reference to existing player during duplicate login
    this.tauntIndex = 0;

    // Combat stats (D20 system) - these will be loaded from playerDB
    this.level = 1;
    this.xp = 0;
    this.strength = 10;
    this.dexterity = 10;
    this.constitution = 10;
    this.intelligence = 10;
    this.wisdom = 10;
    this.charisma = 10;

    // Calculate starting HP with CON modifier: 15 + CON_mod
    const conMod = Math.floor((this.constitution - 10) / 2);
    this.maxHp = 15 + conMod;
    this.hp = this.maxHp;

    this.resistances = {};
    this.isGhost = false;
    this.lastDamageTaken = 0;  // Timestamp of last damage taken (for rest system)
  }

  /**
   * Send a message to the player
   * @param {string} message - Message to send
   */
  send(message) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(message);
    }
  }

  /**
   * Send a message without newline
   * @param {string} message - Message to send
   */
  prompt(message) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(message);
    }
  }

  /**
   * Send the command prompt (> )
   */
  sendPrompt() {
    if (this.socket && !this.socket.destroyed && this.state === 'playing') {
      this.socket.write('\n> ');
    }
  }

  /**
   * Take damage and update HP
   * @param {number} damage - Amount of damage to take
   */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
  }

  /**
   * Check if the player is dead
   * @returns {boolean} True if currentHp <= 0
   */
  isDead() {
    return this.hp <= 0;
  }
}

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
const activeSessions = new Map(); // username (lowercase) -> Player object
const activeInteractions = new Map();

const combatEngine = new CombatEngine(world, players, playerDB);

const respawnService = new RespawnService(world);
respawnService.start();

// Initialize admin system
let adminSystem = null;
let banEnforcementHook = null;

(async () => {
  adminSystem = await bootstrapAdmin({
    playerDB,
    world,
    allPlayers: players,
    combatEngine,
    // Ensure admin data is stored within the repo's data/admin directory
    dataDir: path.join(__dirname, '../data/admin')
  });
  banEnforcementHook = createBanEnforcementHook(adminSystem.adminService);
  logger.log('Admin system ready.');
})();

/**
 * Handle player input based on their current state
 * @param {Player} player - Player object
 * @param {string} input - User input
 */
function handleInput(player, input) {
  player.lastActivity = Date.now();
  const trimmed = input.trim();

  switch (player.state) {
    case 'login_username':
      handleLoginUsername(player, trimmed);
      break;

    case 'login_password':
      handleLoginPassword(player, trimmed);
      break;

    case 'create_username':
      handleCreateUsername(player, trimmed);
      break;

    case 'create_password':
      handleCreatePassword(player, trimmed);
      break;

    case 'duplicate_login_choice':
      handleDuplicateLoginChoice(player, trimmed);
      break;

    case 'pending_disconnect':
      // Player is in the 5-second disconnect cooldown, ignore all commands
      player.send(colors.error('Your session is being disconnected. Please wait...\n'));
      break;

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
 * Handle username entry during login
 */
function handleLoginUsername(player, username) {
  if (!username) {
    player.prompt('Username: ');
    return;
  }

  player.tempUsername = username;

  // Check if account exists
  if (playerDB.exists(username)) {
    player.state = 'login_password';
    player.prompt('Password: ');
  } else {
    player.send(`Account '${username}' does not exist. Create it? (yes/no): `);
    player.state = 'create_username';
  }
}

/**
 * Handle password entry during login
 */
function handleLoginPassword(player, password) {
  if (!password) {
    player.prompt('Password: ');
    return;
  }

  const playerData = playerDB.authenticate(player.tempUsername, password);

  if (playerData) {
    // Check ban before allowing login
    if (banEnforcementHook && banEnforcementHook(player)) {
      return; // Player is banned, connection will be closed
    }

    player.username = playerData.username;
    player.description = playerData.description || 'A normal-looking person.';
    player.currentRoom = playerData.currentRoom;

    // Load currency from playerData
    const CurrencyManager = require('./systems/economy/CurrencyManager');
    player.currency = playerData.currency || CurrencyManager.createWallet();

    // Deserialize inventory from JSON to BaseItem instances
    const InventorySerializer = require('./systems/inventory/InventorySerializer');
    player.inventory = InventorySerializer.deserializeInventory(player, playerData.inventory || []);

    player.level = playerData.level ?? 1;
    player.xp = playerData.xp ?? 0;

    // Set player stats object (needed by InventoryManager and other systems)
    player.stats = {
      strength: playerData.stats?.strength ?? 10,
      dexterity: playerData.stats?.dexterity ?? 10,
      constitution: playerData.stats?.constitution ?? 10,
      intelligence: playerData.stats?.intelligence ?? 10,
      wisdom: playerData.stats?.wisdom ?? 10,
      charisma: playerData.stats?.charisma ?? 10
    };

    // Also set individual properties for backward compatibility
    player.strength = player.stats.strength;
    player.dexterity = player.stats.dexterity;
    player.constitution = player.stats.constitution;
    player.intelligence = player.stats.intelligence;
    player.wisdom = player.stats.wisdom;
    player.charisma = player.stats.charisma;

    // Recalculate maxHp based on level and CON modifier
    // Formula: 15 base + CON_mod + (level-1) * (4 + CON_mod)
    const conMod = Math.floor((player.constitution - 10) / 2);
    const calculatedMaxHp = 15 + conMod + (player.level - 1) * Math.max(1, 4 + conMod);

    // Use stored maxHp if it exists and matches expected, otherwise recalculate (migration)
    if (playerData.maxHp && playerData.maxHp === calculatedMaxHp) {
      player.maxHp = playerData.maxHp;
    } else {
      // Migration: recalculate HP and preserve HP percentage
      const oldMaxHp = playerData.maxHp ?? 20;
      const hpPercentage = (playerData.hp ?? oldMaxHp) / oldMaxHp;
      player.maxHp = calculatedMaxHp;
      player.hp = Math.max(1, Math.floor(player.maxHp * hpPercentage));
      logger.log(`Migrated ${player.username} HP: ${oldMaxHp} -> ${player.maxHp}`);
    }

    // Set current HP
    player.hp = playerData.hp ?? player.maxHp;
    player.hp = Math.min(player.hp, player.maxHp); // Cap at maxHp

    // Recalculate stats based on equipped items
    // This must happen AFTER inventory deserialization
    const EquipmentManager = require('./systems/equipment/EquipmentManager');
    player.baseStats = { ...player.stats }; // Store base stats before equipment bonuses
    EquipmentManager.recalculatePlayerStats(player);

    player.resistances = playerData.resistances ?? {};
    player.isGhost = playerData.isGhost ?? false;
    player.lastDamageTaken = playerData.lastDamageTaken || 0;

    // CHECK FOR DUPLICATE LOGIN
    const existingPlayer = activeSessions.get(player.username.toLowerCase());
    if (existingPlayer) {
      // Duplicate login detected - store temp data and prompt user
      logger.log(`Duplicate login detected for ${player.username}.`);

      player.tempPlayerData = playerData;
      player.tempExistingPlayer = existingPlayer;
      player.state = 'duplicate_login_choice';

      player.send('\n' + colors.warning('========================================\n'));
      player.send(colors.warning('  DUPLICATE LOGIN DETECTED\n'));
      player.send(colors.warning('========================================\n\n'));
      player.send('Your character is already logged in.\n\n');
      player.send('Choose an option:\n\n');
      player.send(colors.success('  [1] Continue Existing Session (Reconnect)\n'));
      player.send('      Take over your character at their current location.\n');
      player.send('      All your progress and state are preserved.\n\n');
      player.send(colors.error('  [2] Respawn at Entry Point\n'));
      player.send('      Your character will respawn at the main entry.\n');
      player.send(colors.error('      WARNING: 5-second delay to prevent combat exploits!\n'));
      player.send(colors.error('      Your old session remains in combat during this time.\n\n'));
      player.prompt('Choose [1] or [2]: ');
      return;
    }

    // No duplicate - proceed with normal login
    player.state = 'playing';

    // Register this player as the active session
    activeSessions.set(player.username.toLowerCase(), player);

    // Update admin info
    if (adminSystem) {
      updatePlayerInfoOnLogin(adminSystem.adminService, player);
    }

    logger.log(`Player ${player.username} logged in.`);

    player.send('\n' + colors.success(`Welcome back, ${player.username}!\n\n`));
    parseCommand('look', player, world, playerDB, players, null, null, adminSystem);
    player.sendPrompt();
  } else {
    // Failed login
    logger.log(`Failed login attempt for ${player.tempUsername}`);
    player.send('\n' + colors.error('Incorrect password.\n'));
    player.tempUsername = null;
    player.state = 'login_username';
    player.prompt('Username: ');
  }
}

/**
 * Handle username creation confirmation
 */
function handleCreateUsername(player, response) {
  const answer = response.toLowerCase();

  if (answer === 'yes' || answer === 'y') {
    player.send('Choose a password: ');
    player.state = 'create_password';
  } else if (answer === 'no' || answer === 'n') {
    player.send('\nOkay, let\'s try again.\n');
    player.tempUsername = null;
    player.state = 'login_username';
    player.prompt('Username: ');
  } else {
    player.send(`Create account '${player.tempUsername}'? (yes/no): `);
  }
}

/**
 * Handle password creation for new account
 */
function handleCreatePassword(player, password) {
  if (!password || password.length < 3) {
    player.send('Password must be at least 3 characters. Choose a password: ');
    return;
  }

  const playerData = playerDB.createPlayer(player.tempUsername, password);

  if (playerData) {
    player.username = playerData.username;
    player.description = playerData.description;
    player.currentRoom = playerData.currentRoom;

    // Deserialize inventory from JSON to BaseItem instances
    const InventorySerializer = require('./systems/inventory/InventorySerializer');
    player.inventory = InventorySerializer.deserializeInventory(player, playerData.inventory || []);

    player.level = playerData.level ?? 1;
    player.xp = playerData.xp ?? 0;

    // Set player stats object (needed by InventoryManager and other systems)
    player.stats = {
      strength: playerData.stats?.strength ?? 10,
      dexterity: playerData.stats?.dexterity ?? 10,
      constitution: playerData.stats?.constitution ?? 10,
      intelligence: playerData.stats?.intelligence ?? 10,
      wisdom: playerData.stats?.wisdom ?? 10,
      charisma: playerData.stats?.charisma ?? 10
    };

    // Also set individual properties for backward compatibility
    player.strength = player.stats.strength;
    player.dexterity = player.stats.dexterity;
    player.constitution = player.stats.constitution;
    player.intelligence = player.stats.intelligence;
    player.wisdom = player.stats.wisdom;
    player.charisma = player.stats.charisma;

    // Calculate maxHp with CON modifier: 15 + CON_mod
    const conMod = Math.floor((player.constitution - 10) / 2);
    player.maxHp = 15 + conMod;
    player.hp = player.maxHp;

    player.resistances = playerData.resistances ?? {};
    player.isGhost = playerData.isGhost ?? false;
    player.lastDamageTaken = playerData.lastDamageTaken || 0;

    player.state = 'playing';

    // Register new player in active sessions
    activeSessions.set(player.username.toLowerCase(), player);

    // Update admin info
    if (adminSystem) {
      updatePlayerInfoOnLogin(adminSystem.adminService, player);
    }

    logger.log(`New player created: ${player.username}`);

    player.send('\n' + colors.success(`Account created! Welcome to The Wumpy and Grift, ${player.username}!\n`));
    player.send(colors.hint('Type \'help\' for a list of commands.\n\n'));
    parseCommand('look', player, world, playerDB, players, null, null, adminSystem);
    player.sendPrompt();
  } else {
    // This shouldn't happen, but handle it anyway
    player.send('\n' + colors.error('Error creating account. Please try again.\n'));
    player.tempUsername = null;
    player.state = 'login_username';
    player.prompt('Username: ');
  }
}

/**
 * Handle user choice when duplicate login is detected
 */
function handleDuplicateLoginChoice(player, choice) {
  const trimmedChoice = choice.trim();

  if (trimmedChoice === '1') {
    // Option 1: Continue existing session (reconnect)
    handleReconnect(player);
  } else if (trimmedChoice === '2') {
    // Option 2: Respawn with 5-second cooldown
    handleRespawnWithCooldown(player);
  } else {
    // Invalid choice
    player.send('\n' + colors.error('Invalid choice. Please enter 1 or 2.\n'));
    player.prompt('Choose [1] or [2]: ');
  }
}

/**
 * Handle reconnect - transfer the socket to the existing player object
 */
function handleReconnect(newPlayer) {
  const existingPlayer = newPlayer.tempExistingPlayer;

  logger.log(`${newPlayer.username} chose to reconnect (continue existing session).`);

  // Notify the old socket that it's being taken over
  if (existingPlayer.socket && !existingPlayer.socket.destroyed) {
    existingPlayer.send('\n\n' + colors.warning('========================================\n'));
    existingPlayer.send(colors.warning('  CONNECTION TRANSFERRED\n'));
    existingPlayer.send(colors.warning('========================================\n'));
    existingPlayer.send('Your session has been taken over from another location.\n');
    existingPlayer.send('Reconnecting...\n\n');
  }

  // Transfer the new socket to the existing player object
  const oldSocket = existingPlayer.socket;
  existingPlayer.socket = newPlayer.socket;

  // Clean up the old socket
  if (oldSocket && !oldSocket.destroyed) {
    // Remove listeners from old socket to prevent conflicts
    oldSocket.removeAllListeners('data');
    oldSocket.removeAllListeners('end');
    oldSocket.removeAllListeners('error');
    oldSocket.end();
  }

  // Update the socket event handlers for the new socket to point to existingPlayer
  // First remove the handlers that were attached to newPlayer
  newPlayer.socket.removeAllListeners('data');
  newPlayer.socket.removeAllListeners('end');
  newPlayer.socket.removeAllListeners('error');

  // Attach handlers for existingPlayer
  existingPlayer.socket.on('data', data => {
    const input = data.toString().trim();
    handleInput(existingPlayer, input);
  });

  existingPlayer.socket.on('end', () => {
    if (existingPlayer.username) {
      logger.log(`Player ${existingPlayer.username} disconnected.`);

      // CRITICAL FIX: Save player state on disconnect
      playerDB.savePlayer(existingPlayer);

      // Remove from active sessions map
      if (activeSessions.get(existingPlayer.username.toLowerCase()) === existingPlayer) {
        activeSessions.delete(existingPlayer.username.toLowerCase());
      }
    } else {
      logger.log('A connection disconnected before logging in.');
    }
    players.delete(existingPlayer);
  });

  existingPlayer.socket.on('error', err => {
    logger.error('Socket error:', err);

    // Remove from active sessions if this is the active player
    if (existingPlayer.username && activeSessions.get(existingPlayer.username.toLowerCase()) === existingPlayer) {
      activeSessions.delete(existingPlayer.username.toLowerCase());
    }

    players.delete(existingPlayer);
  });

  // Remove the new player object from the players set (we're using existingPlayer instead)
  players.delete(newPlayer);

  // Notify the reconnected player
  existingPlayer.send(colors.success('Reconnected successfully!\n\n'));
  parseCommand('look', existingPlayer, world, playerDB, players, null, null, adminSystem);
  existingPlayer.sendPrompt();

  logger.log(`${existingPlayer.username} reconnected successfully.`);
}

/**
 * Handle respawn with 5-second anti-exploit cooldown
 */
function handleRespawnWithCooldown(newPlayer) {
  const existingPlayer = newPlayer.tempExistingPlayer;

  logger.log(`${newPlayer.username} chose to respawn at entry point (5-second cooldown).`);

  // Notify the new connection about the cooldown
  newPlayer.send('\n' + colors.warning('Initiating respawn sequence...\n'));
  newPlayer.send(colors.error('Your old session will remain active for 5 seconds to prevent combat exploits.\n'));
  newPlayer.send('Please wait...\n\n');

  // Notify the old session
  if (existingPlayer.socket && !existingPlayer.socket.destroyed) {
    existingPlayer.send('\n\n' + colors.warning('========================================\n'));
    existingPlayer.send(colors.warning('  DUPLICATE LOGIN DETECTED\n'));
    existingPlayer.send(colors.warning('========================================\n'));
    existingPlayer.send('Someone is logging in with your account from another location.\n');
    existingPlayer.send('They chose to respawn your character.\n');
    existingPlayer.send(colors.error('You will be disconnected in 5 seconds...\n'));
    existingPlayer.send(colors.error('Combat continues during this time!\n\n'));
  }

  // Set a flag to prevent the old player from executing commands (except combat continues)
  existingPlayer.state = 'pending_disconnect';

  // Schedule the respawn after 5 seconds
  setTimeout(() => {
    // Check if the old socket is still active
    if (existingPlayer.socket && !existingPlayer.socket.destroyed) {
      existingPlayer.send('\n' + colors.warning('Disconnecting now...\n'));
      existingPlayer.socket.end();
    }

    // Remove old player from players set
    players.delete(existingPlayer);

    // Now finalize the new login
    finalizeNewLogin(newPlayer);

    logger.log(`${newPlayer.username} respawned at entry point after cooldown.`);
  }, 5000);
}

/**
 * Finalize a new login after respawn cooldown
 */
function finalizeNewLogin(player) {
  // Apply player data from tempPlayerData (set during duplicate login flow)
  if (player.tempPlayerData) {
    const playerData = player.tempPlayerData;

    player.username = playerData.username;
    player.description = playerData.description || 'A normal-looking person.';
    player.currentRoom = playerData.currentRoom;

    // Load currency from playerData
    const CurrencyManager = require('./systems/economy/CurrencyManager');
    player.currency = playerData.currency || CurrencyManager.createWallet();

    // Deserialize inventory from JSON to BaseItem instances
    const InventorySerializer = require('./systems/inventory/InventorySerializer');
    player.inventory = InventorySerializer.deserializeInventory(player, playerData.inventory || []);

    player.level = playerData.level ?? 1;
    player.xp = playerData.xp ?? 0;

    // Set player stats object (needed by InventoryManager and other systems)
    player.stats = {
      strength: playerData.stats?.strength ?? 10,
      dexterity: playerData.stats?.dexterity ?? 10,
      constitution: playerData.stats?.constitution ?? 10,
      intelligence: playerData.stats?.intelligence ?? 10,
      wisdom: playerData.stats?.wisdom ?? 10,
      charisma: playerData.stats?.charisma ?? 10
    };

    // Also set individual properties for backward compatibility
    player.strength = player.stats.strength;
    player.dexterity = player.stats.dexterity;
    player.constitution = player.stats.constitution;
    player.intelligence = player.stats.intelligence;
    player.wisdom = player.stats.wisdom;
    player.charisma = player.stats.charisma;

    // Recalculate maxHp based on level and CON modifier
    const conMod = Math.floor((player.constitution - 10) / 2);
    const calculatedMaxHp = 15 + conMod + (player.level - 1) * Math.max(1, 4 + conMod);

    if (playerData.maxHp && playerData.maxHp === calculatedMaxHp) {
      player.maxHp = playerData.maxHp;
    } else {
      const oldMaxHp = playerData.maxHp ?? 20;
      const hpPercentage = (playerData.hp ?? oldMaxHp) / oldMaxHp;
      player.maxHp = calculatedMaxHp;
      player.hp = Math.max(1, Math.floor(player.maxHp * hpPercentage));
      logger.log(`Migrated ${player.username} HP: ${oldMaxHp} -> ${player.maxHp}`);
    }

    if (!playerData.maxHp || playerData.maxHp !== calculatedMaxHp) {
      player.hp = playerData.hp ?? player.maxHp;
    } else {
      player.hp = Math.min(playerData.hp ?? player.maxHp, player.maxHp);
    }

    player.resistances = playerData.resistances ?? {};
    player.isGhost = playerData.isGhost ?? false;
    player.lastDamageTaken = playerData.lastDamageTaken || 0;

    // Clean up temp data
    player.tempPlayerData = null;
    player.tempExistingPlayer = null;
  }

  player.state = 'playing';

  // Register this player as the active session
  activeSessions.set(player.username.toLowerCase(), player);

  // Update admin info
  if (adminSystem) {
    updatePlayerInfoOnLogin(adminSystem.adminService, player);
  }

  logger.log(`Player ${player.username} logged in (respawned).`);

  player.send('\n' + colors.success(`Cooldown complete! Welcome back, ${player.username}!\n\n`));
  parseCommand('look', player, world, playerDB, players, null, null, adminSystem);
  player.sendPrompt();
}

/**
 * Create the TCP server
 */
const server = net.createServer(socket => {
  const player = new Player(socket);
  players.add(player);

  logger.log('A new connection has been established.');

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
      logger.log(`Player ${player.username} disconnected.`);

      // CRITICAL FIX: Save player state to database on logout
      // This ensures all stats, equipment, inventory, and progression persist
      playerDB.savePlayer(player);

      // Remove from active sessions map (only if THIS player object is the current active session)
      if (activeSessions.get(player.username.toLowerCase()) === player) {
        activeSessions.delete(player.username.toLowerCase());
      }
    } else {
      logger.log('A connection disconnected before logging in.');
    }
    players.delete(player);
  });

  // Handle errors
  socket.on('error', err => {
    logger.error('Socket error:', err);

    // Remove from active sessions if this is the active player
    if (player.username && activeSessions.get(player.username.toLowerCase()) === player) {
      activeSessions.delete(player.username.toLowerCase());
    }

    players.delete(player);
  });
});

// Handle server errors
server.on('error', err => {
  logger.error('Server error:', err);
});

// Start the server
const PORT = parseInt(process.env.PORT, 10) || 4000;
server.listen(PORT, () => {
  logger.log('='.repeat(50));
  logger.log(`The Wumpy and Grift MUD Server`);
  logger.log(`Listening on port ${PORT}`);
  logger.log('='.repeat(50));
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.log(`${signal} received, saving shop state...`);

  try {
    const ShopManager = require('./systems/economy/ShopManager');
    // Use async save but don't wait - just log when complete
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