/**
 * Close command - Close a container
 */

const colors = require('../../colors');
const ContainerManager = require('../../systems/containers/ContainerManager');

/**
 * Execute close command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('\nClose what? Usage: close <container>\n'));
    return;
  }

  const containerKeyword = args.join(' ');

  // Placeholder
  player.send(colors.info('\nContainer system ready. Connect containers to rooms to use.\n'));
}

module.exports = {
  name: 'close',
  aliases: [],
  description: 'Close a container',
  usage: 'close <container>',
  execute
};
