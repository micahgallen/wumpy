const net = require('net');
const path = require('path');
const logger = require('./logger');
const Player = require('./server/Player');
const ServerBootstrap = require('./server/ServerBootstrap');

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

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.log(`${signal} received, saving state...`);

  try {
    const ShopManager = require('./systems/economy/ShopManager');
    const TimerManager = require('./systems/corpses/TimerManager');
    const CorpseManager = require('./systems/corpses/CorpseManager');
    const fs = require('fs');

    // Save corpse and timer state synchronously (critical for shutdown)
    const dataDir = components?.dataDir || path.join(__dirname, '../data');
    const timersPath = path.join(dataDir, 'timers.json');
    const corpsesPath = path.join(dataDir, 'corpses.json');

    // Save timers
    const timersSaved = TimerManager.saveState(timersPath);
    if (timersSaved) {
      logger.log('Saved timer state');
    }

    // Save corpses
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const corpseState = {
        corpses: CorpseManager.exportState(),
        savedAt: Date.now(),
        version: '1.0'
      };

      fs.writeFileSync(corpsesPath, JSON.stringify(corpseState, null, 2));
      const npcCount = corpseState.corpses.npcCorpses?.length || 0;
      const playerCount = corpseState.corpses.playerCorpses?.length || 0;
      const totalCorpses = npcCount + playerCount;
      logger.log(`Saved ${totalCorpses} corpses (${npcCount} NPC, ${playerCount} player) to ${corpsesPath}`);
    } catch (err) {
      logger.error(`Failed to save corpse state: ${err.message}`);
    }

    // Use async save for shops but don't wait - just log when complete
    ShopManager.saveAllShops().then(result => {
      logger.log(`Saved ${result.successCount} shops on shutdown`);
      logger.log('Graceful shutdown complete');
      process.exit(0);
    }).catch(err => {
      logger.error(`Error saving shops on shutdown: ${err.message}`);
      process.exit(1);
    });
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export Player class for testing
module.exports = { Player };
