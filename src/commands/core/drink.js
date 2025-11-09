/**
 * Drink Command
 *
 * Specialized command for drinking potions and beverages.
 * Validates item type and delegates to use command.
 */

const colors = require('../../colors');

/**
 * Execute the drink command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Drink what?\n'));
    player.send(colors.hint('Usage: drink <potion>\n'));
    player.send(colors.hint('Example: drink potion\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory
  let item = null;
  let exactMatchItem = null;
  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        // Check for exact matches first (highest priority)
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        if (exactMatch) {
          exactMatchItem = invItem;
          break; // Exact match found, stop searching
        }

        // Check for partial matches (only if keyword is 3+ chars to avoid false positives)
        if (!item && keyword.length >= 3) {
          const partialMatch = invItem.keywords.some(kw => {
            const kwLower = kw.toLowerCase();
            // Avoid matching single-letter keywords in partial searches
            if (kwLower.length < 2) return false;
            return kwLower.includes(keyword) || keyword.includes(kwLower);
          });

          if (partialMatch) {
            item = invItem; // Keep searching for exact match
          }
        }
      }
    }
  }

  // Use exact match if found, otherwise use partial match
  item = exactMatchItem || item;

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Validate it's a consumable
  if (item.itemType !== 'consumable') {
    player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. It's not drinkable.\n`));
    player.send(colors.hint('Try using it instead: use ' + item.name + '\n'));
    return;
  }

  // Validate it's a drinkable type (potion, elixir, or food that's a beverage)
  const consumableType = item.consumableProperties?.consumableType;
  const drinkableTypes = ['potion', 'elixir'];

  // Allow drinking food items with 'drink' related keywords (milk, water, etc.)
  const hasDrinkKeyword = item.keywords.some(kw =>
    ['milk', 'water', 'juice', 'ale', 'beer', 'wine', 'beverage', 'drink'].includes(kw.toLowerCase())
  );

  if (!drinkableTypes.includes(consumableType) && !hasDrinkKeyword) {
    if (consumableType === 'food') {
      player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. Try eating it instead.\n`));
      player.send(colors.hint('Command: eat ' + item.name + '\n'));
    } else {
      player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. Try using it instead.\n`));
      player.send(colors.hint('Command: use ' + item.name + '\n'));
    }
    return;
  }

  // Delegate to use command
  const useCommand = require('./use');
  useCommand.execute(player, args, context);
}

module.exports = {
  name: 'drink',
  aliases: ['quaff'],
  execute,
  help: {
    description: 'Drink potions and beverages',
    usage: 'drink <potion>',
    examples: [
      'drink potion - Drink a health potion',
      'drink milk - Drink milk',
      'quaff elixir - Quaff an elixir (alternative)'
    ]
  }
};
