/**
 * Wumpcom command - Global chat channel
 */

const colors = require('../../colors');

/**
 * Execute wumpcom command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Wumpcom what? Try "wumpcom [message]"\n'));
    return;
  }

  const message = args.join(' ');
  const formattedMessage = colors.wumpcom(`[WumpCom] ${player.username}: ${message}`);

  for (const p of allPlayers) {
    if (p.state === 'playing') {
      p.send('\n' + formattedMessage + '\n');
      p.sendPrompt();
    }
  }
}

module.exports = {
  name: 'wumpcom',
  aliases: [],
  execute,
  help: {
    description: 'Send a message to all players via global chat',
    usage: 'wumpcom <message>',
    examples: ['wumpcom Hello everyone!', 'wumpcom Anyone up for a quest?']
  }
};
