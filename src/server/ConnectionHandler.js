const logger = require('../logger');
const { getBanner, getTexanBirthdayBanner } = require('../banner');
const Player = require('./Player');

/**
 * ConnectionHandler
 * Handles TCP socket events and lifecycle
 *
 * Responsibilities:
 * - Create Player instances for new connections
 * - Attach socket event handlers (data, end, error)
 * - Coordinate with AuthenticationFlow for input handling
 * - Handle disconnect cleanup (save player, remove from sessions)
 * - Manage player Set operations
 */
class ConnectionHandler {
  /**
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.playerDB - PlayerDB instance for saving player state
   * @param {Object} dependencies.sessionManager - SessionManager for session cleanup
   * @param {Function} dependencies.handleInput - Input handler function
   */
  constructor({ playerDB, sessionManager, handleInput }) {
    this.playerDB = playerDB;
    this.sessionManager = sessionManager;
    this.handleInput = handleInput;
  }

  /**
   * Handle a new TCP connection
   * This method is passed to net.createServer()
   *
   * @param {net.Socket} socket - TCP socket
   * @param {Set<Player>} players - Set of all active players
   */
  handleConnection(socket, players) {
    const player = new Player(socket);
    players.add(player);

    const clientIP = socket.remoteAddress || 'unknown';
    const clientPort = socket.remotePort || 'unknown';
    logger.log(`New connection from ${clientIP}:${clientPort}`);

    // Send welcome banner - BIRTHDAY EDITION FOR TEXAN!
    player.send('\n' + getTexanBirthdayBanner() + '\n');
    player.prompt('Username: ');

    // Handle incoming data
    socket.on('data', data => {
      // Ignore input from sockets that are no longer writable
      if (!socket.writable || socket.destroyed) {
        return;
      }
      const input = data.toString().trim();
      this.handleInput(player, input);
    });

    // Handle disconnection
    socket.on('end', () => {
      if (player.username) {
        logger.log(`Player ${player.username} (${clientIP}:${clientPort}) disconnected.`);

        // CRITICAL: Save player state to database on logout
        // This ensures all stats, equipment, inventory, and progression persist
        this.playerDB.savePlayer(player);

        // Remove from active sessions map (only if THIS player object is the current active session)
        this.sessionManager.removeSession(player);
      } else {
        logger.log(`Connection from ${clientIP}:${clientPort} disconnected before logging in.`);
      }
      players.delete(player);
    });

    // Handle socket errors
    socket.on('error', err => {
      const identifier = player.username || `${clientIP}:${clientPort}`;
      logger.error(`Socket error for ${identifier}:`, err);

      // CRITICAL: Save player state before removing to prevent data loss
      if (player.username) {
        this.playerDB.savePlayer(player);
      }

      // Remove from active sessions if this is the active player
      this.sessionManager.removeSession(player);

      players.delete(player);
    });
  }
}

module.exports = ConnectionHandler;
