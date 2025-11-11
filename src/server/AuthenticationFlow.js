const colors = require('../colors');
const logger = require('../logger');
const { parseCommand } = require('../commands');
const { calculateMaxHP } = require('../utils/modifiers');

/**
 * AuthenticationFlow
 * Handles login/creation state machine and flow control
 */
class AuthenticationFlow {
  /**
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.playerDB - PlayerDB instance
   * @param {Object} dependencies.sessionManager - SessionManager instance
   * @param {Object} dependencies.world - World instance
   * @param {Set} dependencies.players - Set of active Player objects
   * @param {Object} dependencies.adminSystem - Admin system instance
   * @param {Function} dependencies.banEnforcementHook - Ban enforcement function
   */
  constructor({ playerDB, sessionManager, world, players, adminSystem, banEnforcementHook }) {
    this.playerDB = playerDB;
    this.sessionManager = sessionManager;
    this.world = world;
    this.players = players;
    this.adminSystem = adminSystem;
    this.banEnforcementHook = banEnforcementHook;
  }

  /**
   * Handle username entry during login
   */
  handleLoginUsername(player, username) {
    if (!username) {
      player.prompt('Username: ');
      return;
    }

    player.tempUsername = username;

    // Check if account exists
    if (this.playerDB.exists(username)) {
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
  handleLoginPassword(player, password) {
    if (!password) {
      player.prompt('Password: ');
      return;
    }

    const playerData = this.playerDB.authenticate(player.tempUsername, password);

    if (playerData) {
      // Check ban before allowing login
      if (this.banEnforcementHook && this.banEnforcementHook(player)) {
        return; // Player is banned, connection will be closed
      }

      player.username = playerData.username;
      player.description = playerData.description || 'A normal-looking person.';
      player.currentRoom = playerData.currentRoom;
      player.capname = playerData.capname || null;
      player.customEnter = playerData.customEnter || null;
      player.customExit = playerData.customExit || null;

      // Load currency from playerData
      const CurrencyManager = require('../systems/economy/CurrencyManager');
      player.currency = playerData.currency || CurrencyManager.createWallet();

      // Deserialize inventory from JSON to BaseItem instances
      const InventorySerializer = require('../systems/inventory/InventorySerializer');
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

      // Calculate maxHp using centralized formula from utils/modifiers.js
      const calculatedMaxHp = calculateMaxHP(player.level, player.constitution);

      // Use stored maxHp if it exists and matches expected, otherwise recalculate (migration)
      if (playerData.maxHp && playerData.maxHp === calculatedMaxHp) {
        // No migration needed - use stored values
        player.maxHp = playerData.maxHp;
        player.hp = Math.min(playerData.hp ?? player.maxHp, player.maxHp);
      } else {
        // Migration: recalculate HP and preserve HP percentage
        const oldMaxHp = playerData.maxHp ?? 20;
        const hpPercentage = (playerData.hp ?? oldMaxHp) / oldMaxHp;
        player.maxHp = calculatedMaxHp;
        player.hp = Math.max(1, Math.floor(player.maxHp * hpPercentage));
        logger.log(`Migrated ${player.username} HP: ${oldMaxHp} -> ${player.maxHp}`);
      }

      // Recalculate stats based on equipped items
      // This must happen AFTER inventory deserialization
      const EquipmentManager = require('../systems/equipment/EquipmentManager');
      player.baseStats = { ...player.stats }; // Store base stats before equipment bonuses
      EquipmentManager.recalculatePlayerStats(player);

      player.resistances = playerData.resistances ?? {};
      player.isGhost = playerData.isGhost ?? false;
      player.lastDamageTaken = playerData.lastDamageTaken || 0;

      // CHECK FOR DUPLICATE LOGIN
      const existingPlayer = this.sessionManager.getSession(player.username);
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
      this.sessionManager.registerSession(player);

      // Update admin info
      if (this.adminSystem) {
        const { updatePlayerInfoOnLogin } = require('../admin/bootstrap');
        updatePlayerInfoOnLogin(this.adminSystem.adminService, player);
      }

      // Update last login timestamp for abandoned corpse cleanup
      this.playerDB.updatePlayerLastLogin(player.username, Date.now());

      logger.log(`Player ${player.username} logged in.`);

      player.send('\n' + colors.success(`Welcome back, ${player.username}!\n\n`));
      parseCommand('look', player, this.world, this.playerDB, this.players, null, null, this.adminSystem);
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
  handleCreateUsername(player, response) {
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
  handleCreatePassword(player, password) {
    if (!password || password.length < 3) {
      player.send('Password must be at least 3 characters. Choose a password: ');
      return;
    }

    const playerData = this.playerDB.createPlayer(player.tempUsername, password);

    if (playerData) {
      player.username = playerData.username;
      player.description = playerData.description;
      player.currentRoom = playerData.currentRoom;

      // Deserialize inventory from JSON to BaseItem instances
      const InventorySerializer = require('../systems/inventory/InventorySerializer');
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
      this.sessionManager.registerSession(player);

      // Update admin info
      if (this.adminSystem) {
        const { updatePlayerInfoOnLogin } = require('../admin/bootstrap');
        updatePlayerInfoOnLogin(this.adminSystem.adminService, player);
      }

      logger.log(`New player created: ${player.username}`);

      player.send('\n' + colors.success(`Account created! Welcome to The Wumpy and Grift, ${player.username}!\n`));
      player.send(colors.hint('Type \'help\' for a list of commands.\n\n'));
      parseCommand('look', player, this.world, this.playerDB, this.players, null, null, this.adminSystem);
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
  handleDuplicateLoginChoice(player, choice) {
    const trimmedChoice = choice.trim();

    if (trimmedChoice === '1') {
      // Option 1: Continue existing session (reconnect)
      this.handleReconnect(player);
    } else if (trimmedChoice === '2') {
      // Option 2: Respawn with 5-second cooldown
      this.handleRespawnWithCooldown(player);
    } else {
      // Invalid choice
      player.send('\n' + colors.error('Invalid choice. Please enter 1 or 2.\n'));
      player.prompt('Choose [1] or [2]: ');
    }
  }

  /**
   * Handle reconnect - transfer the socket to the existing player object
   */
  handleReconnect(newPlayer) {
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
    // NOTE: These handlers need to call back into handleInput
    // We'll need to pass a handler function reference
    existingPlayer.socket.on('data', data => {
      const input = data.toString().trim();
      this.handleInput(existingPlayer, input);
    });

    existingPlayer.socket.on('end', () => {
      const reconnectIP = existingPlayer.socket.remoteAddress || 'unknown';
      const reconnectPort = existingPlayer.socket.remotePort || 'unknown';

      if (existingPlayer.username) {
        logger.log(`Player ${existingPlayer.username} (${reconnectIP}:${reconnectPort}) disconnected.`);

        // CRITICAL FIX: Save player state on disconnect
        this.playerDB.savePlayer(existingPlayer);

        // Remove from active sessions map
        this.sessionManager.removeSession(existingPlayer);
      } else {
        logger.log(`Connection from ${reconnectIP}:${reconnectPort} disconnected before logging in.`);
      }
      this.players.delete(existingPlayer);
    });

    existingPlayer.socket.on('error', err => {
      const reconnectIP = existingPlayer.socket.remoteAddress || 'unknown';
      const reconnectPort = existingPlayer.socket.remotePort || 'unknown';
      const identifier = existingPlayer.username || `${reconnectIP}:${reconnectPort}`;
      logger.error(`Socket error for ${identifier}:`, err);

      // CRITICAL: Save player state before removing to prevent data loss
      if (existingPlayer.username) {
        this.playerDB.savePlayer(existingPlayer);
      }

      // Remove from active sessions if this is the active player
      this.sessionManager.removeSession(existingPlayer);

      this.players.delete(existingPlayer);
    });

    // Remove the new player object from the players set (we're using existingPlayer instead)
    this.players.delete(newPlayer);

    // Notify the reconnected player
    existingPlayer.send(colors.success('Reconnected successfully!\n\n'));
    parseCommand('look', existingPlayer, this.world, this.playerDB, this.players, null, null, this.adminSystem);
    existingPlayer.sendPrompt();

    logger.log(`${existingPlayer.username} reconnected successfully.`);
  }

  /**
   * Handle respawn with 5-second anti-exploit cooldown
   */
  handleRespawnWithCooldown(newPlayer) {
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
      // Check if new player disconnected during cooldown
      if (!newPlayer.socket || newPlayer.socket.destroyed) {
        logger.log(`${newPlayer.username} disconnected during respawn cooldown`);
        return;
      }

      // Check if the old socket is still active
      if (existingPlayer.socket && !existingPlayer.socket.destroyed) {
        existingPlayer.send('\n' + colors.warning('Disconnecting now...\n'));
        existingPlayer.socket.end();
      }

      // Remove old player from players set
      this.players.delete(existingPlayer);

      // Now finalize the new login
      this.finalizeNewLogin(newPlayer);

      logger.log(`${newPlayer.username} respawned at entry point after cooldown.`);
    }, 5000);
  }

  /**
   * Finalize a new login after respawn cooldown
   */
  finalizeNewLogin(player) {
    // Apply player data from tempPlayerData (set during duplicate login flow)
    if (player.tempPlayerData) {
      const playerData = player.tempPlayerData;

      player.username = playerData.username;
      player.description = playerData.description || 'A normal-looking person.';
      player.currentRoom = playerData.currentRoom;
      player.capname = playerData.capname || null;

      // Load currency from playerData
      const CurrencyManager = require('../systems/economy/CurrencyManager');
      player.currency = playerData.currency || CurrencyManager.createWallet();

      // Deserialize inventory from JSON to BaseItem instances
      const InventorySerializer = require('../systems/inventory/InventorySerializer');
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

      // Calculate maxHp using centralized formula from utils/modifiers.js
      const calculatedMaxHp = calculateMaxHP(player.level, player.constitution);

      if (playerData.maxHp && playerData.maxHp === calculatedMaxHp) {
        // No migration needed - use stored values
        player.maxHp = playerData.maxHp;
        player.hp = Math.min(playerData.hp ?? player.maxHp, player.maxHp);
      } else {
        // Migration: recalculate HP and preserve HP percentage
        const oldMaxHp = playerData.maxHp ?? 20;
        const hpPercentage = (playerData.hp ?? oldMaxHp) / oldMaxHp;
        player.maxHp = calculatedMaxHp;
        player.hp = Math.max(1, Math.floor(player.maxHp * hpPercentage));
        logger.log(`Migrated ${player.username} HP: ${oldMaxHp} -> ${player.maxHp}`);
      }

      // Recalculate stats based on equipped items
      // This must happen AFTER inventory deserialization
      const EquipmentManager = require('../systems/equipment/EquipmentManager');
      player.baseStats = { ...player.stats }; // Store base stats before equipment bonuses
      EquipmentManager.recalculatePlayerStats(player);

      player.resistances = playerData.resistances ?? {};
      player.isGhost = playerData.isGhost ?? false;
      player.lastDamageTaken = playerData.lastDamageTaken || 0;

      // Clean up temp data
      player.tempPlayerData = null;
      player.tempExistingPlayer = null;
    }

    player.state = 'playing';

    // Register this player as the active session
    this.sessionManager.registerSession(player);

    // Update admin info
    if (this.adminSystem) {
      const { updatePlayerInfoOnLogin } = require('../admin/bootstrap');
      updatePlayerInfoOnLogin(this.adminSystem.adminService, player);
    }

    logger.log(`Player ${player.username} logged in (respawned).`);

    player.send('\n' + colors.success(`Cooldown complete! Welcome back, ${player.username}!\n\n`));
    parseCommand('look', player, this.world, this.playerDB, this.players, null, null, this.adminSystem);
    player.sendPrompt();
  }

  /**
   * Main entry point for handling authentication input
   * This delegates to the appropriate state handler
   *
   * @param {Player} player - Player object
   * @param {string} input - User input
   */
  handleInput(player, input) {
    player.lastActivity = Date.now();
    const trimmed = input.trim();

    switch (player.state) {
      case 'login_username':
        this.handleLoginUsername(player, trimmed);
        break;

      case 'login_password':
        this.handleLoginPassword(player, trimmed);
        break;

      case 'create_username':
        this.handleCreateUsername(player, trimmed);
        break;

      case 'create_password':
        this.handleCreatePassword(player, trimmed);
        break;

      case 'duplicate_login_choice':
        this.handleDuplicateLoginChoice(player, trimmed);
        break;

      case 'pending_disconnect':
        // Player is in the 5-second disconnect cooldown, ignore all commands
        player.send(colors.error('Your session is being disconnected. Please wait...\n'));
        break;

      default:
        // Not an auth state - this shouldn't be called
        // Return false to indicate this wasn't handled
        return false;
    }

    return true;
  }
}

module.exports = AuthenticationFlow;
