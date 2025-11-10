/**
 * Player class - Represents a connected player
 */
const colors = require('../colors');

class Player {
  constructor(socket) {
    this.socket = socket;
    this.username = null;
    this.capname = null; // Optional colorized display name
    this.description = null;
    this.descriptionModifiers = []; // Array of description modifiers {text, source, priority, addedAt}
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
   * @returns {boolean} True if hp <= 0
   */
  isDead() {
    return this.hp <= 0;
  }

  /**
   * Get the player's display name (capname if set, otherwise username)
   * This centralizes the display name logic for future migration.
   * Automatically appends ANSI reset to prevent color bleed.
   * @returns {string} Display name with color codes if capname is set
   */
  getDisplayName() {
    // If capname is set, ensure it ends with ANSI reset to prevent color bleed
    if (this.capname) {
      return this.capname + colors.ANSI.RESET;
    }
    return this.username;
  }
}

module.exports = Player;
