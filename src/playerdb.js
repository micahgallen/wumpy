const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const InventorySerializer = require('./systems/inventory/InventorySerializer');

/**
 * PlayerDB - Manages player account persistence
 * Stores player accounts in a JSON file with hashed passwords
 */
class PlayerDB {
  constructor(filepath = './players.json') {
    this.filepath = filepath;
    this.players = {};
    this.load();
  }

  /**
   * Load player data from disk
   */
  load() {
    try {
      if (fs.existsSync(this.filepath)) {
        const data = fs.readFileSync(this.filepath, 'utf8');
        this.players = JSON.parse(data);

        console.log(`Loaded ${Object.keys(this.players).length} player accounts.`);
      } else {
        console.log('No existing player database found. Starting fresh.');
        this.players = {};
      }
    } catch (err) {
      console.error('Error loading player database:', err);
      this.players = {};
    }
  }

  /**
   * Save player data to disk
   */
  save() {
    try {
      const data = JSON.stringify(this.players, null, 2);
      fs.writeFileSync(this.filepath, data, 'utf8');
    } catch (err) {
      console.error('Error saving player database:', err);
    }
  }

  /**
   * Save a single player's current state to database
   * CRITICAL: This method ensures stat persistence across server restarts
   *
   * @param {Object} player - Player object from active session
   *
   * How stat persistence works:
   * - baseStats: Stored in DB (long names: strength, dexterity, etc.)
   * - Runtime stats: Calculated from baseStats + equipment bonuses
   * - Short names (str, dex, con): Runtime only, NOT saved to DB
   *
   * When saving:
   * 1. Update stats (long names) from baseStats for persistence
   * 2. Update baseStats separately for new system compatibility
   * 3. Save to disk
   *
   * When loading (see authenticate()):
   * 1. Load stats (long names) from DB
   * 2. Initialize baseStats from stats if missing
   * 3. Initialize short names (str, dex, con) from stats
   * 4. Recalculate with equipment bonuses
   */
  savePlayer(player) {
    if (!player || !player.username) {
      console.error('savePlayer: Invalid player object');
      return;
    }

    const lowerUsername = player.username.toLowerCase();

    if (!this.players[lowerUsername]) {
      console.error(`savePlayer: Player ${player.username} not found in database`);
      return;
    }

    // Update the stored player data with current session values
    const stored = this.players[lowerUsername];

    // Save core progression data
    stored.level = player.level;
    stored.xp = player.xp || player.currentXp || 0; // Support both property names
    stored.hp = player.currentHp || player.hp;
    stored.maxHp = player.maxHp;

    // Save location and state
    stored.currentRoom = player.currentRoom;
    stored.description = player.description;
    stored.descriptionModifiers = player.descriptionModifiers || [];
    stored.capname = player.capname || null;
    stored.customEnter = player.customEnter || null;
    stored.customExit = player.customExit || null;
    stored.isGhost = player.isGhost || false;

    // Save inventory (already handled by separate method, but ensure it's set)
    if (player.inventory) {
      stored.inventory = player.inventory;
    }

    // Save currency wallet
    if (player.currency) {
      stored.currency = { ...player.currency };
    }

    // CRITICAL: Save base stats (not equipment-modified stats)
    // Save to BOTH formats for backwards compatibility and new system

    // 1. Save to long-name format (for persistence)
    stored.stats = {
      strength: player.baseStats?.strength || player.str || 10,
      dexterity: player.baseStats?.dexterity || player.dex || 10,
      constitution: player.baseStats?.constitution || player.con || 10,
      intelligence: player.baseStats?.intelligence || player.int || 10,
      wisdom: player.baseStats?.wisdom || player.wis || 10,
      charisma: player.baseStats?.charisma || player.cha || 10
    };

    // 2. Save baseStats explicitly (new system)
    if (player.baseStats) {
      stored.baseStats = { ...player.baseStats };
    } else {
      // Migration: If baseStats doesn't exist, create it from stats
      stored.baseStats = { ...stored.stats };
    }

    // Save resistances (already aggregated from equipment by EquipmentManager)
    if (player.resistances) {
      stored.resistances = { ...player.resistances };
    }

    // Save to disk
    this.save();

    console.log(`Saved player state: ${player.username} (Level ${player.level}, HP ${stored.hp}/${stored.maxHp}, STR ${stored.stats.strength})`);
  }

  /**
   * Hash a password using SHA-256
   * @param {string} password - Plain text password
   * @returns {string} Hexadecimal hash
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new player account
   * @param {string} username - Player username (case-insensitive)
   * @param {string} password - Player password
   * @returns {Object} Player data or null if username exists
   */
  createPlayer(username, password) {
    const lowerUsername = username.toLowerCase();

    if (this.players[lowerUsername]) {
      return null; // Username already exists
    }

    // Calculate starting HP with CON modifier: 15 + CON_mod
    const constitution = 10; // Default starting CON
    const conMod = Math.floor((constitution - 10) / 2);
    const startingHp = 15 + conMod;

    const playerData = {
      username: username,
      passwordHash: this.hashPassword(password),
      description: 'A normal-looking person.',
      descriptionModifiers: [], // Array of description modifiers from game systems
      capname: null, // Optional colorized display name
      customEnter: null, // Custom teleport entrance message
      customExit: null, // Custom teleport exit message
      currentRoom: 'sesame_street_01', // Starting room
      inventory: [], // Empty inventory for new players
      currency: { // Phase 5: Currency wallet (separate from inventory)
        platinum: 0,
        gold: 0,
        silver: 0,
        copper: 100 // Start with 100 copper
      },
      level: 1,
      xp: 0,
      hp: startingHp,
      maxHp: startingHp,
      isGhost: false,
      lastDamageTaken: 0,
      lastLogin: Date.now(), // Track last login for abandoned corpse cleanup
      stats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      resistances: {
        physical: 0, fire: 0, ice: 0, lightning: 0,
        poison: 0, necrotic: 0, radiant: 0, psychic: 0
      },
      createdAt: new Date().toISOString()
    };

    this.players[lowerUsername] = playerData;
    this.save();

    return playerData;
  }

  /**
   * Authenticate a player
   * @param {string} username - Player username
   * @param {string} password - Player password
   * @returns {Object} Player data or null if authentication fails
   */
  authenticate(username, password) {
    const lowerUsername = username.toLowerCase();
    const playerData = this.players[lowerUsername];

    if (!playerData) {
      return null; // Username not found
    }

    const passwordHash = this.hashPassword(password);
    if (passwordHash !== playerData.passwordHash) {
      return null; // Incorrect password
    }

    // Add default combat stats if they don't exist for backwards compatibility
    if (!playerData.stats) {
        playerData.level = 1;
        playerData.xp = 0;
        playerData.hp = 20;
        playerData.maxHp = 20;
        playerData.stats = {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
        };
        playerData.resistances = {
            physical: 0, fire: 0, ice: 0, lightning: 0,
            poison: 0, necrotic: 0, radiant: 0, psychic: 0
        };
    }

    // Add default currency if it doesn't exist (Phase 5)
    if (!playerData.currency) {
        playerData.currency = {
            platinum: 0,
            gold: 0,
            silver: 0,
            copper: 100 // Backwards compat: give existing players starting money
        };
    }

    // Add description modifiers array if it doesn't exist (Player Description System)
    if (!playerData.descriptionModifiers) {
        playerData.descriptionModifiers = [];
    }

    // Initialize custom teleport messages if they don't exist
    if (playerData.customEnter === undefined) {
      playerData.customEnter = null;
    }
    if (playerData.customExit === undefined) {
      playerData.customExit = null;
    }

    // CRITICAL FIX: Initialize baseStats if not present (new system for equipment bonuses)
    // This ensures base stats are tracked separately from equipment-modified stats
    if (!playerData.baseStats) {
        playerData.baseStats = {
            strength: playerData.stats?.strength || 10,
            dexterity: playerData.stats?.dexterity || 10,
            constitution: playerData.stats?.constitution || 10,
            intelligence: playerData.stats?.intelligence || 10,
            wisdom: playerData.stats?.wisdom || 10,
            charisma: playerData.stats?.charisma || 10
        };
    }

    // CRITICAL FIX: Initialize short-name properties for combat system compatibility
    // Combat system uses: str, dex, con, int, wis, cha (see CombatStats.js and EquipmentManager.js)
    // These will be recalculated with equipment bonuses during session initialization
    playerData.str = playerData.stats?.strength || 10;
    playerData.dex = playerData.stats?.dexterity || 10;
    playerData.con = playerData.stats?.constitution || 10;
    playerData.int = playerData.stats?.intelligence || 10;
    playerData.wis = playerData.stats?.wisdom || 10;
    playerData.cha = playerData.stats?.charisma || 10;

    return playerData;
  }

  /**
   * Check if a username exists
   * @param {string} username - Player username
   * @returns {boolean}
   */
  exists(username) {
    return this.players[username.toLowerCase()] !== undefined;
  }

  /**
   * Update player's current room
   * @param {string} username - Player username
   * @param {string} roomId - New room ID
   */
  updatePlayerRoom(username, roomId) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].currentRoom = roomId;
      this.save();
    }
  }

  /**
   * Update player's inventory
   * @param {string} username - Player username
   * @param {Array} inventory - Array of item instances
   */
  updatePlayerInventory(username, inventory) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      // Serialize inventory before saving
      this.players[lowerUsername].inventory = InventorySerializer.serializeInventory({
        username,
        inventory
      });
      this.save();
    }
  }

  /**
   * Save a player's inventory (live player object)
   * @param {Object} player - Player object with inventory
   */
  savePlayerInventory(player) {
    if (!player || !player.username) {
      return;
    }

    const lowerUsername = player.username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].inventory = InventorySerializer.serializeInventory(player);
      this.save();
    }
  }

  /**
   * Update player's description
   * @param {string} username - Player username
   * @param {string} description - New description
   */
  updatePlayerDescription(username, description) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].description = description;
      this.save();
    }
  }

  updatePlayerXP(username, xp) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.xp = xp;
      this.save();
    }
  }

  updatePlayerLevel(username, level, maxHp, hp) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.level = level;
      player.maxHp = maxHp;
      player.hp = hp;
      this.save();
    }
  }

  /**
   * Update player's ghost status
   * @param {string} username - Player username
   * @param {boolean} isGhost - Ghost status
   */
  updatePlayerGhostStatus(username, isGhost) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].isGhost = isGhost;
      this.save();
    }
  }

  /**
   * Update player's HP
   * @param {string} username - Player username
   * @param {number} hp - Current HP
   */
  updatePlayerHP(username, hp) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].hp = hp;
      this.save();
    }
  }

  /**
   * Update player's base stats
   * @param {string} username - Player username
   * @param {Object} stats - Stats object {strength, dexterity, constitution, intelligence, wisdom, charisma}
   */
  updatePlayerStats(username, stats) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].stats = {
        strength: stats.strength ?? 10,
        dexterity: stats.dexterity ?? 10,
        constitution: stats.constitution ?? 10,
        intelligence: stats.intelligence ?? 10,
        wisdom: stats.wisdom ?? 10,
        charisma: stats.charisma ?? 10
      };
      this.save();
    }
  }

  /**
   * Update player's currency wallet
   * @param {string} username - Player username
   * @param {Object} currency - Currency object {platinum, gold, silver, copper}
   */
  updatePlayerCurrency(username, currency) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].currency = {
        platinum: currency.platinum ?? 0,
        gold: currency.gold ?? 0,
        silver: currency.silver ?? 0,
        copper: currency.copper ?? 0
      };
      this.save();
    }
  }

  /**
   * Update player's last login timestamp
   * @param {string} username - Player username
   * @param {number} timestamp - Login timestamp (milliseconds since epoch)
   */
  updatePlayerLastLogin(username, timestamp) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].lastLogin = timestamp;
      this.save();
    }
  }

  /**
   * Get player data
   * @param {string} username - Player username
   * @returns {Object} Player data or null
   */
  getPlayer(username) {
    return this.players[username.toLowerCase()] || null;
  }
}

module.exports = PlayerDB;
