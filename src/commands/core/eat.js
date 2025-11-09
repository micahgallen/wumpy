/**
 * Eat Command
 *
 * Specialized command for eating food items.
 * Validates item type and delegates to use command.
 */

const colors = require('../../colors');
const { findItemInInventory } = require('../utils');

/**
 * Execute the eat command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Eat what?\n'));
    player.send(colors.hint('Usage: eat <food>\n'));
    player.send(colors.hint('Example: eat cookie\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory using shared utility
  const item = findItemInInventory(player, keyword);

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Validate it's a consumable
  if (item.itemType !== 'consumable') {
    player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. It's not edible.\n`));
    player.send(colors.hint('Try using it instead: use ' + item.name + '\n'));
    return;
  }

  // Validate it's food type
  const consumableType = item.consumableProperties?.consumableType;
  if (consumableType !== 'food') {
    if (consumableType === 'potion' || consumableType === 'elixir') {
      player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. Try drinking it instead.\n`));
      player.send(colors.hint('Command: drink ' + item.name + '\n'));
    } else {
      player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. Try using it instead.\n`));
      player.send(colors.hint('Command: use ' + item.name + '\n'));
    }
    return;
  }

  // Delegate to use command
  const useCommand = require('./use');
  useCommand.execute(player, args, context);
}

module.exports = {
  name: 'eat',
  aliases: [],
  execute,
  help: {
    description: 'Eat food items',
    usage: 'eat <food>',
    examples: [
      'eat cookie - Eat a cookie',
      'eat bread - Eat bread'
    ]
  }
};
