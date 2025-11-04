/**
 * Emote Command - Perform a custom action/emote
 *
 * This is the freeform emote command where players can type any action.
 * For pre-defined emotes (applaud, bow, etc.), see src/commands/emotes/
 */

const colors = require('../../colors');
const { broadcastEmote } = require('../utils');

/**
 * Execute the emote command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Emote what? Try "emote [action]"\n'));
    return;
  }

  const action = args.join(' ');
  const message = `${player.username} ${action}`;
  broadcastEmote(player, null, allPlayers, `You ${action}`, null, message);
}

module.exports = {
  name: 'emote',
  aliases: [':'],
  description: 'Perform a custom action or expression',
  usage: 'emote <action> or :<action>',
  execute
};
