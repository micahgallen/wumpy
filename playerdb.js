const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

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

    const playerData = {
      username: username,
      passwordHash: this.hashPassword(password),
      description: 'A normal-looking person.',
      currentRoom: 'sesame_street_01', // Starting room
      inventory: [], // Empty inventory for new players
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
   * @param {Array} inventory - Array of object IDs
   */
  updatePlayerInventory(username, inventory) {
    const lowerUsername = username.toLowerCase();
    if (this.players[lowerUsername]) {
      this.players[lowerUsername].inventory = inventory;
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
