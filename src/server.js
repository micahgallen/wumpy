const net = require('net');
const PlayerDB = require('../playerdb');
const World = require('../world');
const CombatEngine = require('./combat/combatEngine');
const { parseCommand } = require('./commands');
const colors = require('./colors');
const { getBanner } = require('./banner');
const RespawnService = require('./respawnService');

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
    this.level = 1;
    this.lastActivity = Date.now();
    this.state = 'login_username'; // States: login_username, login_password, create_username, create_password, playing
    this.tempUsername = null; // Temporary storage during login/creation
    this.tauntIndex = 0;

    // Combat stats (D20 system)
    this.maxHp = 20; // Starting HP at level 1
    this.currentHp = 20;
    this.strength = 10; // Base ability scores
    this.dexterity = 10;
    this.constitution = 10;
    this.intelligence = 10;
    this.wisdom = 10;
    this.charisma = 10;
    this.resistances = {}; // Damage type resistances (e.g., { fire: 25 } = 25% fire resistance)
    this.isGhost = false; // Ghost status after death
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
    this.currentHp = Math.max(0, this.currentHp - damage);
  }

  /**
   * Check if the player is dead
   * @returns {boolean} True if currentHp <= 0
   */
  isDead() {
    return this.currentHp <= 0;
  }
}

// Initialize server components
const playerDB = new PlayerDB();
const world = new World();
const players = new Set();
const activeInteractions = new Map();

const combatEngine = new CombatEngine(world, players);

const respawnService = new RespawnService(world);
respawnService.start();

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
      parseCommand(trimmed, player, world, playerDB, players, activeInteractions, combatEngine);
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
    player.username = playerData.username;
    player.description = playerData.description || 'A normal-looking person.';
    player.currentRoom = playerData.currentRoom;
    player.inventory = playerData.inventory || [];
    player.level = playerData.level || 1;
    player.state = 'playing';

    console.log(`Player ${player.username} logged in.`);

    player.send('\n' + colors.success(`Welcome back, ${player.username}!\n\n`));
    parseCommand('look', player, world, playerDB, players);
    player.sendPrompt();
  } else {
    // Failed login
    console.log(`Failed login attempt for ${player.tempUsername}`);
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
    player.state = 'playing';

    console.log(`New player created: ${player.username}`);

    player.send('\n' + colors.success(`Account created! Welcome to The Wumpy and Grift, ${player.username}!\n`));
    player.send(colors.hint('Type \'help\' for a list of commands.\n\n'));
    parseCommand('look', player, world, playerDB, players);
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

  console.log('A new connection has been established.');

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
      console.log(`Player ${player.username} disconnected.`);
    } else {
      console.log('A connection disconnected before logging in.');
    }
    players.delete(player);
  });

  // Handle errors
  socket.on('error', err => {
    console.error('Socket error:', err);
    players.delete(player);
  });
});

// Handle server errors
server.on('error', err => {
  console.error('Server error:', err);
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`The Wumpy and Grift MUD Server`);
  console.log(`Listening on port ${PORT}`);
  console.log('='.repeat(50));
});