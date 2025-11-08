/**
 * Open command - Open a container
 */

const colors = require('../../colors');
const ContainerManager = require('../../systems/containers/ContainerManager');

/**
 * Execute open command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('\nOpen what? Usage: open <container>\n'));
    return;
  }

  const containerKeyword = args.join(' ');

  // Find container in room
  // For now, this is a placeholder - in production you'd search room objects
  player.send(colors.info('\nContainer system ready. Connect containers to rooms to use.\n'));
}

module.exports = {
  name: 'open',
  aliases: [],
  description: 'Open a container',
  usage: 'open <container>',
  execute
};
