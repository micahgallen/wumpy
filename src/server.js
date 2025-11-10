const net = require('net');
const path = require('path');
const logger = require('./logger');
const Player = require('./server/Player');
const ServerBootstrap = require('./server/ServerBootstrap');
const ShutdownHandler = require('./server/ShutdownHandler');

/**
 * Create the TCP server
 */
let components = null;
const server = net.createServer(socket => {
  if (!components) {
    logger.error('Connection rejected - server still initializing');
    socket.end('Server is starting up, please try again in a moment.\n');
    return;
  }
  components.connectionHandler.handleConnection(socket, components.players);
});

// Handle server errors
server.on('error', err => {
  logger.error('Server error:', err);
});

async function main() {
  // Bootstrap all server components
  const dataDir = path.join(__dirname, '../data');
  components = await ServerBootstrap.initialize({ dataDir });

  // Register graceful shutdown handlers
  const shutdownHandler = new ShutdownHandler(components);
  shutdownHandler.setup();

  const PORT = parseInt(process.env.PORT, 10) || 4000;
  server.listen(PORT, () => {
    logger.log('='.repeat(50));
    logger.log(`The Wumpy and Grift MUD Server`);
    logger.log(`Listening on port ${PORT}`);
    logger.log('='.repeat(50));
  });
}

main().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// Export Player class for testing
module.exports = { Player };
