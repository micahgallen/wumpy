/**
 * Admin System Bootstrap
 * Initialize admin system and integrate with server lifecycle
 */

const AdminService = require('./service');
const { FileStorageAdapter } = require('./storage');
const RateLimiter = require('./rateLimit');
const { Role } = require('./permissions');
const logger = require('../logger');

/**
 * Bootstrap the admin system
 * @param {Object} options - Bootstrap options
 * @param {Object} options.playerDB - PlayerDB instance
 * @param {Object} options.world - World instance
 * @param {Set} options.allPlayers - Set of connected players
 * @param {Object} options.combatEngine - CombatEngine instance
 * @param {string} options.dataDir - Data directory (optional)
 * @returns {Object} Admin system components
 */
async function bootstrapAdmin(options) {
  const {
    playerDB,
    world,
    allPlayers,
    combatEngine,
    dataDir = '/Users/au288926/Documents/mudmud/data/admin'
  } = options;

  logger.log('Bootstrapping admin system...');

  // Initialize storage
  const storage = new FileStorageAdapter(dataDir);

  // Initialize admin service
  const adminService = new AdminService(storage);
  await adminService.initialize();

  // Initialize rate limiter
  const rateLimiter = new RateLimiter(5, 10); // 5 commands per 10 seconds

  // Start rate limiter cleanup (every 60 seconds)
  const cleanupInterval = setInterval(() => {
    rateLimiter.cleanup();
  }, 60000);

  // One-time migration: Grant Admin role to cyberslayer if not already set
  const cyberslayerID = 'cyberslayer';
  const cyberslayerRole = adminService.getRole(cyberslayerID);

  if (cyberslayerRole === Role.PLAYER && playerDB.exists(cyberslayerID)) {
    logger.log('First-time setup: Granting Admin role to cyberslayer...');
    await adminService.grantRole(
      cyberslayerID,
      Role.ADMIN,
      { id: 'SYSTEM', role: Role.CREATOR, name: 'SYSTEM' },
      'cyberslayer',
      null
    );
    logger.log('Admin role granted to cyberslayer.');
  }

  logger.log('Admin system initialized successfully.');
  logger.log(`  - Loaded ${Object.keys(adminService.roles).length} role assignments`);
  logger.log(`  - Loaded ${adminService.bans.length} bans`);

  return {
    adminService,
    rateLimiter,
    storage,
    cleanupInterval
  };
}

/**
 * Create ban enforcement hook for player connection
 * @param {Object} adminService - AdminService instance
 * @returns {Function} Hook function
 */
function createBanEnforcementHook(adminService) {
  return function enforceBanOnConnect(player) {
    const ban = adminService.enforceBanOnConnect(player);

    if (ban) {
      const colors = require('../colors');
      const targetDesc = ban.playerName || ban.playerID || ban.ip;
      const expires = ban.expiresAt
        ? `until ${new Date(ban.expiresAt).toLocaleString()}`
        : 'permanently';

      player.send('\n' + colors.error('='.repeat(50) + '\n'));
      player.send(colors.error('You are banned from this server.\n'));
      player.send(colors.error('='.repeat(50) + '\n\n'));
      player.send(colors.error(`Reason: ${ban.reason}\n`));
      player.send(colors.error(`Duration: ${expires}\n`));
      player.send(colors.error(`Banned by: ${ban.issuerName || ban.issuer}\n\n`));

      logger.log(`Rejected connection from banned user: ${targetDesc}`);

      // Disconnect
      setTimeout(() => {
        player.socket.end();
      }, 1000);

      return true; // Player is banned
    }

    return false; // Player is not banned
  };
}

/**
 * Update player info in admin service on login
 * @param {Object} adminService - AdminService instance
 * @param {Object} player - Player object
 */
async function updatePlayerInfoOnLogin(adminService, player) {
  const playerID = player.username.toLowerCase();
  const playerIP = player.socket?.remoteAddress || null;

  await adminService.updatePlayerInfo(playerID, player.username, playerIP);

  // Update player object with current role
  player.role = adminService.getRole(playerID);
}

module.exports = {
  bootstrapAdmin,
  createBanEnforcementHook,
  updatePlayerInfoOnLogin
};
