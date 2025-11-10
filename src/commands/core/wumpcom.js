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

  // Show both display name and username for global chat
  // This provides immersion (colorized capnames) while maintaining clarity (real usernames for moderation)
  const displayName = player.getDisplayName();

  // Strip colors from display name to check if it visually matches username
  // If they match, no need to show (@username)
  const visibleName = colors.stripColors(displayName);
  const attribution = visibleName !== player.username
    ? `${displayName} (@${player.username})`
    : player.username;

  const formattedMessage = colors.wumpcom(`[WumpCom] ${attribution}: ${message}`);

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
