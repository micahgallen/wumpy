/**
 * Quit command - Disconnect gracefully from the game
 */

const colors = require('../../colors');

/**
 * Execute quit command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  // Save player state before disconnecting
  context.playerDB.savePlayer(player);

  player.send(colors.system('Farewell! Come back soon.\n'));
  player.socket.end();
}

module.exports = {
  name: 'quit',
  aliases: [],
  execute,
  help: {
    description: 'Disconnect from the game',
    usage: 'quit',
    examples: ['quit']
  }
};
