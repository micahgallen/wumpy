const net = require('net');
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
    this.state = 'login_username'; // States: login_username, login_password, create_username, create_password, playing
    this.tempUsername = null; // Temporary storage during login/creation
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

// Initialize server components
const playerDB = new PlayerDB();
const world = new World();
const players = new Set();
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
    combatEngine
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
    player.inventory = playerData.inventory || [];
    player.level = playerData.level ?? 1;
    player.xp = playerData.xp ?? 0;

    // Ensure player.stats is an object before accessing its properties
    player.strength = playerData.stats?.strength ?? 10;
    player.dexterity = playerData.stats?.dexterity ?? 10;
    player.constitution = playerData.stats?.constitution ?? 10;
    player.intelligence = playerData.stats?.intelligence ?? 10;
    player.wisdom = playerData.stats?.wisdom ?? 10;
    player.charisma = playerData.stats?.charisma ?? 10;

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

    player.resistances = playerData.resistances ?? {};
    player.isGhost = playerData.isGhost ?? false;
    player.lastDamageTaken = playerData.lastDamageTaken || 0;

    player.state = 'playing';

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
    player.inventory = playerData.inventory || [];
    player.level = playerData.level ?? 1;
    player.xp = playerData.xp ?? 0;

    // Ensure player.stats is an object before accessing its properties
    player.strength = playerData.stats?.strength ?? 10;
    player.dexterity = playerData.stats?.dexterity ?? 10;
    player.constitution = playerData.stats?.constitution ?? 10;
    player.intelligence = playerData.stats?.intelligence ?? 10;
    player.wisdom = playerData.stats?.wisdom ?? 10;
    player.charisma = playerData.stats?.charisma ?? 10;

    // Calculate maxHp with CON modifier: 15 + CON_mod
    const conMod = Math.floor((player.constitution - 10) / 2);
    player.maxHp = 15 + conMod;
    player.hp = player.maxHp;

    player.resistances = playerData.resistances ?? {};
    player.isGhost = playerData.isGhost ?? false;
    player.lastDamageTaken = playerData.lastDamageTaken || 0;

    player.state = 'playing';

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
    } else {
      logger.log('A connection disconnected before logging in.');
    }
    players.delete(player);
  });

  // Handle errors
  socket.on('error', err => {
    logger.error('Socket error:', err);
    players.delete(player);
  });
});

// Handle server errors
server.on('error', err => {
  logger.error('Server error:', err);
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  logger.log('='.repeat(50));
  logger.log(`The Wumpy and Grift MUD Server`);
  logger.log(`Listening on port ${PORT}`);
  logger.log('='.repeat(50));
});

// Export Player class for testing
module.exports = { Player };