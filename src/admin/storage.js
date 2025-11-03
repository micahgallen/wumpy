/**
 * Admin Storage System
 * Provides storage adapters for persistent admin data
 */

const fs = require('fs');
const path = require('path');

/**
 * StorageAdapter interface
 * All storage implementations must implement these methods
 */
class StorageAdapter {
  async loadRoles() {
    throw new Error('loadRoles() must be implemented');
  }

  async saveRoles(roles) {
    throw new Error('saveRoles() must be implemented');
  }

  async loadBans() {
    throw new Error('loadBans() must be implemented');
  }

  async saveBans(bans) {
    throw new Error('saveBans() must be implemented');
  }
}

/**
 * FileStorageAdapter
 * Stores admin data in JSON files
 */
class FileStorageAdapter extends StorageAdapter {
  constructor(dataDir = '/Users/au288926/Documents/mudmud/data/admin') {
    super();
    this.dataDir = dataDir;
    this.rolesFile = path.join(dataDir, 'roles.json');
    this.bansFile = path.join(dataDir, 'bans.json');
    this._ensureDataDir();
  }

  /**
   * Ensure data directory exists
   * @private
   */
  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Load roles from file
   * @returns {Promise<Object>} Map of player ID to role data
   */
  async loadRoles() {
    try {
      if (fs.existsSync(this.rolesFile)) {
        const data = await fs.promises.readFile(this.rolesFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    }
    return {};
  }

  /**
   * Save roles to file
   * @param {Object} roles - Map of player ID to role data
   */
  async saveRoles(roles) {
    try {
      const data = JSON.stringify(roles, null, 2);
      await fs.promises.writeFile(this.rolesFile, data, 'utf8');
    } catch (err) {
      console.error('Error saving roles:', err);
      throw err;
    }
  }

  /**
   * Load bans from file
   * @returns {Promise<Array>} Array of ban objects
   */
  async loadBans() {
    try {
      if (fs.existsSync(this.bansFile)) {
        const data = await fs.promises.readFile(this.bansFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Error loading bans:', err);
    }
    return [];
  }

  /**
   * Save bans to file
   * @param {Array} bans - Array of ban objects
   */
  async saveBans(bans) {
    try {
      const data = JSON.stringify(bans, null, 2);
      await fs.promises.writeFile(this.bansFile, data, 'utf8');
    } catch (err) {
      console.error('Error saving bans:', err);
      throw err;
    }
  }
}

/**
 * MemoryStorageAdapter
 * Stores admin data in memory (for testing)
 */
class MemoryStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.roles = {};
    this.bans = [];
  }

  /**
   * Load roles from memory
   * @returns {Promise<Object>} Map of player ID to role data
   */
  async loadRoles() {
    return { ...this.roles };
  }

  /**
   * Save roles to memory
   * @param {Object} roles - Map of player ID to role data
   */
  async saveRoles(roles) {
    this.roles = { ...roles };
  }

  /**
   * Load bans from memory
   * @returns {Promise<Array>} Array of ban objects
   */
  async loadBans() {
    return [...this.bans];
  }

  /**
   * Save bans to memory
   * @param {Array} bans - Array of ban objects
   */
  async saveBans(bans) {
    this.bans = [...bans];
  }

  /**
   * Clear all data (useful for testing)
   */
  clear() {
    this.roles = {};
    this.bans = [];
  }
}

module.exports = {
  StorageAdapter,
  FileStorageAdapter,
  MemoryStorageAdapter
};
