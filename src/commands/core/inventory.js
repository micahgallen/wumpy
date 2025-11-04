/**
 * Inventory command - Show what player is carrying
 */

const colors = require('../../colors');

/**
 * Execute inventory command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world } = context;

  if (!player.inventory || player.inventory.length === 0) {
    player.send('\n' + colors.info('You are not carrying anything.\n'));
    return;
  }

  let output = [];
  output.push(colors.info('You are carrying:'));
  output.push(colors.line(18, '-'));

  for (const objId of player.inventory) {
    const obj = world.getObject(objId);
    if (obj) {
      output.push('  ' + colors.objectName(obj.name));
    }
  }

  player.send('\n' + output.join('\n') + '\n');
}

module.exports = {
  name: 'inventory',
  aliases: ['i'],
  execute,
  help: {
    description: 'Show what you are carrying',
    usage: 'inventory',
    examples: ['inventory', 'i']
  }
};
