/**
 * Describe command - Set player's description
 */

const colors = require('../../colors');

/**
 * Execute describe command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Describe yourself as what?'));
    return;
  }

  const description = args.join(' ');
  player.description = description;
  playerDB.updatePlayerDescription(player.username, description);
  player.send('\n' + colors.success('You have set your description.'));
}

module.exports = {
  name: 'describe',
  aliases: [],
  execute,
  help: {
    description: 'Set your character description',
    usage: 'describe <description>',
    examples: ['describe A tall warrior with piercing eyes']
  }
};
