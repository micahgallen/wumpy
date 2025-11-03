/**
 * Admin Service
 * Core admin operations: roles, bans, promotions, demotions
 */

const { Role, canPromote, canDemote, getNextLowerRank, isValidRole } = require('./permissions');
const { writeAuditLog } = require('./audit');

class AdminService {
  constructor(storage) {
    this.storage = storage;
    this.roles = {}; // Map of playerID -> { role, lastKnownName, ips: [], grantedBy, grantedAt }
    this.bans = []; // Array of ban objects
    this.initialized = false;
  }

  /**
   * Initialize the service by loading data from storage
   */
  async initialize() {
    if (this.initialized) return;

    this.roles = await this.storage.loadRoles();
    this.bans = await this.storage.loadBans();
    this.initialized = true;
  }

  /**
   * Get player ID from username (normalized to lowercase)
   * @param {string} username - Player username
   * @returns {string} Player ID (lowercase username)
   */
  _getPlayerID(username) {
    if (!username) {
      throw new Error('Username cannot be null or undefined');
    }
    return username.toLowerCase();
  }

  /**
   * Grant a role to a player
   * @param {string} playerID - Player ID
   * @param {string} role - Role to grant
   * @param {Object} issuer - Issuer object { id, role, name }
   * @param {string} playerName - Player's display name
   * @param {string} playerIP - Player's IP address
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async grantRole(playerID, role, issuer, playerName = null, playerIP = null) {
    if (!isValidRole(role)) {
      return { success: false, message: `Invalid role: ${role}` };
    }

    const normalizedID = this._getPlayerID(playerID);
    const existingData = this.roles[normalizedID] || {};

    // Update role data
    this.roles[normalizedID] = {
      role: role,
      lastKnownName: playerName || existingData.lastKnownName || playerID,
      ips: existingData.ips || [],
      grantedBy: issuer.id,
      grantedAt: new Date().toISOString()
    };

    // Add IP if provided and not already tracked
    if (playerIP && !this.roles[normalizedID].ips.includes(playerIP)) {
      this.roles[normalizedID].ips.push(playerIP);
    }

    await this.storage.saveRoles(this.roles);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'grantRole',
      args: [playerID, role],
      result: 'success',
      reason: `Granted ${role} to ${playerName || playerID}`
    });

    return { success: true, message: `Granted ${role} to ${playerName || playerID}` };
  }

  /**
   * Revoke a role from a player (set back to Player)
   * @param {string} playerID - Player ID
   * @param {Object} issuer - Issuer object { id, role, name }
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async revokeRole(playerID, issuer) {
    const normalizedID = this._getPlayerID(playerID);

    if (!this.roles[normalizedID]) {
      return { success: false, message: `Player ${playerID} has no assigned role` };
    }

    const oldRole = this.roles[normalizedID].role;
    delete this.roles[normalizedID];

    await this.storage.saveRoles(this.roles);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'revokeRole',
      args: [playerID],
      result: 'success',
      reason: `Revoked ${oldRole} from ${playerID}`
    });

    return { success: true, message: `Revoked ${oldRole} from ${playerID}` };
  }

  /**
   * Get player's role
   * @param {string} playerID - Player ID
   * @returns {string} Role (defaults to Player if not set)
   */
  getRole(playerID) {
    const normalizedID = this._getPlayerID(playerID);
    return this.roles[normalizedID]?.role || Role.PLAYER;
  }

  /**
   * Get player's role data
   * @param {string} playerID - Player ID
   * @returns {Object|null} Role data or null
   */
  getRoleData(playerID) {
    const normalizedID = this._getPlayerID(playerID);
    return this.roles[normalizedID] || null;
  }

  /**
   * Update player's last known name and IP
   * @param {string} playerID - Player ID
   * @param {string} playerName - Player's display name
   * @param {string} playerIP - Player's IP address
   */
  async updatePlayerInfo(playerID, playerName, playerIP) {
    const normalizedID = this._getPlayerID(playerID);

    if (this.roles[normalizedID]) {
      this.roles[normalizedID].lastKnownName = playerName;

      if (playerIP && !this.roles[normalizedID].ips.includes(playerIP)) {
        this.roles[normalizedID].ips.push(playerIP);
        await this.storage.saveRoles(this.roles);
      }
    }
  }

  /**
   * Check if a player or IP is banned
   * @param {string} playerID - Player ID
   * @param {string} ip - Player's IP address
   * @returns {Object|null} Ban object if banned, null otherwise
   */
  isBanned(playerID, ip) {
    const normalizedID = playerID ? this._getPlayerID(playerID) : null;
    const now = Date.now();

    // Check for active bans
    for (const ban of this.bans) {
      // Check if ban has expired
      if (ban.expiresAt && new Date(ban.expiresAt).getTime() < now) {
        continue;
      }

      // Check player ID match
      if (ban.playerID && normalizedID && ban.playerID === normalizedID) {
        return ban;
      }

      // Check IP match
      if (ban.ip && ban.ip === ip) {
        return ban;
      }
    }

    return null;
  }

  /**
   * Ban a player or IP
   * @param {Object} target - Target object { playerID, ip, name }
   * @param {Object} issuer - Issuer object { id, role, name }
   * @param {number} hours - Duration in hours (0 = permanent)
   * @param {string} reason - Ban reason
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async ban(target, issuer, hours = 0, reason = 'No reason provided') {
    const ban = {
      playerID: target.playerID ? this._getPlayerID(target.playerID) : null,
      ip: target.ip || null,
      playerName: target.name || null,
      reason: reason,
      issuer: issuer.id,
      issuerName: issuer.name,
      timestamp: new Date().toISOString(),
      expiresAt: hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null
    };

    this.bans.push(ban);
    await this.storage.saveBans(this.bans);

    const duration = hours > 0 ? `${hours} hours` : 'permanently';
    const targetDesc = target.name || target.playerID || target.ip;

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'ban',
      args: [targetDesc, hours],
      result: 'success',
      reason: reason
    });

    return {
      success: true,
      message: `Banned ${targetDesc} ${duration}. Reason: ${reason}`
    };
  }

  /**
   * Unban a player or IP
   * @param {string} target - Player ID or IP address
   * @param {Object} issuer - Issuer object { id, role, name }
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async unban(target, issuer) {
    const normalizedID = this._getPlayerID(target);
    const initialLength = this.bans.length;

    // Remove all bans matching the target (by player ID or IP)
    this.bans = this.bans.filter(ban => {
      return ban.playerID !== normalizedID && ban.ip !== target;
    });

    const removed = initialLength - this.bans.length;

    if (removed === 0) {
      return { success: false, message: `No active bans found for ${target}` };
    }

    await this.storage.saveBans(this.bans);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'unban',
      args: [target],
      result: 'success',
      reason: `Removed ${removed} ban(s)`
    });

    return {
      success: true,
      message: `Unbanned ${target} (removed ${removed} ban(s))`
    };
  }

  /**
   * List all active bans
   * @returns {Array} Array of active ban objects
   */
  listBans() {
    const now = Date.now();

    return this.bans.filter(ban => {
      // Filter out expired bans
      if (ban.expiresAt && new Date(ban.expiresAt).getTime() < now) {
        return false;
      }
      return true;
    });
  }

  /**
   * Promote a player to a higher role
   * @param {string} targetID - Target player ID
   * @param {string} newRole - New role to assign
   * @param {Object} issuer - Issuer object { id, role, name }
   * @param {Object} target - Target object { id, role, name }
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async promote(targetID, newRole, issuer, target) {
    if (!isValidRole(newRole)) {
      return { success: false, message: `Invalid role: ${newRole}` };
    }

    // Check ceiling rules
    const canPromoteResult = canPromote(issuer, target, newRole);
    if (!canPromoteResult.allowed) {
      writeAuditLog({
        issuerID: issuer.id,
        issuerRank: issuer.role,
        command: 'promote',
        args: [targetID, newRole],
        result: 'denied',
        reason: canPromoteResult.reason
      });

      return { success: false, message: canPromoteResult.reason };
    }

    // Grant the new role
    const result = await this.grantRole(targetID, newRole, issuer, target.name);

    return result;
  }

  /**
   * Demote a player to a lower role
   * @param {string} targetID - Target player ID
   * @param {string|null} newRole - New role to assign (null = demote one step)
   * @param {Object} issuer - Issuer object { id, role, name }
   * @param {Object} target - Target object { id, role, name }
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async demote(targetID, newRole, issuer, target) {
    // Check ceiling rules
    const canDemoteResult = canDemote(issuer, target);
    if (!canDemoteResult.allowed) {
      writeAuditLog({
        issuerID: issuer.id,
        issuerRank: issuer.role,
        command: 'demote',
        args: [targetID, newRole || 'one step'],
        result: 'denied',
        reason: canDemoteResult.reason
      });

      return { success: false, message: canDemoteResult.reason };
    }

    // Determine target role
    let targetRole = newRole;
    if (!targetRole) {
      targetRole = getNextLowerRank(target.role);
      if (!targetRole) {
        return { success: false, message: 'Target is already at minimum rank' };
      }
    }

    if (!isValidRole(targetRole)) {
      return { success: false, message: `Invalid role: ${targetRole}` };
    }

    // Grant the new (lower) role
    const result = await this.grantRole(targetID, targetRole, issuer, target.name);

    return result;
  }

  /**
   * Enforce ban check on player connection
   * Called when a player connects
   * @param {Object} player - Player object with username and IP
   * @returns {Object|null} Ban object if player is banned, null otherwise
   */
  enforceBanOnConnect(player) {
    // During login, username might be in tempUsername instead of username
    const username = player.username || player.tempUsername;

    if (!username) {
      // No username yet, can't check ban
      return null;
    }

    const playerID = this._getPlayerID(username);
    const playerIP = player.socket?.remoteAddress || null;

    return this.isBanned(playerID, playerIP);
  }
}

module.exports = AdminService;
