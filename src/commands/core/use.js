/**
 * Use Command
 *
 * Allows players to use consumable items like potions, food, and other usable items.
 * Consumables are typically removed from inventory after use (unless specified otherwise).
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');
const logger = require('../../logger');

/**
 * Execute the use command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Use what?\n'));
    player.send(colors.hint('Usage: use <item>\n'));
    player.send(colors.hint('Examples: use potion, use cookie, drink milk\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory (search by keywords like examine command does)
  let item = null;

  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      // Check if it's a new item system item
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        // Check if any keyword matches (exact or partial match)
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        const partialMatch = invItem.keywords.some(kw => kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase()));

        if (exactMatch || partialMatch) {
          item = invItem;
          break;
        }
      }
    }
  }

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Check if item is usable
  if (item.itemType !== 'consumable') {
    player.send('\n' + colors.error(`You can't use ${item.getDisplayName()}. It's not a consumable item.\n`));
    player.send(colors.hint('Try equipping it instead with: equip ' + item.name + '\n'));
    return;
  }

  // Check if item is equipped (can't use equipped items)
  if (item.equipped) {
    player.send('\n' + colors.error(`${item.getDisplayName()} is equipped. You must unequip it first.\n`));
    return;
  }

  // Build context for the use action
  const useContext = {
    world: context.world,
    playerDB: context.playerDB,
    allPlayers: context.allPlayers,
    location: player.currentRoom
  };

  // Attempt to use the item
  const success = item.onUse(player, useContext);

  if (!success) {
    player.send('\n' + colors.error(`You can't use ${item.getDisplayName()} right now.\n`));
    return;
  }

  // Log the use
  logger.log(`Player ${player.name} used item ${item.name} (${item.instanceId})`);

  // Check if item should be consumed (removed from inventory)
  // Most consumables are single-use, but some might have multiple uses
  const shouldConsume = item.consumeOnUse !== false; // Default true

  if (shouldConsume) {
    // Remove one instance of the item from inventory
    const removeResult = InventoryManager.removeItem(player.name, item.instanceId, 1);

    if (removeResult.success) {
      // Success message is typically handled by the item's onUse hook
      // But we can add a subtle hint
      if (item.quantity > 1) {
        player.send(colors.gray(`(${item.quantity - 1} remaining)\n`));
      }

      // Save inventory after consuming item
      if (context.playerDB) {
        const serialized = InventorySerializer.serializeInventory(player);
        context.playerDB.updatePlayerInventory(player.username, serialized);
      }
    } else {
      // This shouldn't happen since we just found the item, but handle it anyway
      logger.error(`Failed to remove consumed item ${item.name} from ${player.name}'s inventory`);
    }
  }

  // Update player stats if they changed (HP, etc.)
  if (context.playerDB && context.playerDB.updatePlayer) {
    context.playerDB.updatePlayer(player.name, {
      hp: player.hp,
      maxHp: player.maxHp,
      // Add other stats that might have changed
      strength: player.strength,
      dexterity: player.dexterity,
      constitution: player.constitution,
      intelligence: player.intelligence,
      wisdom: player.wisdom,
      charisma: player.charisma
    });
  }
}

module.exports = {
  name: 'use',
  aliases: ['consume', 'eat', 'drink', 'quaff'],
  execute,
  help: {
    description: 'Use or consume an item',
    usage: 'use <item>',
    examples: [
      'use potion - Use a health potion',
      'eat cookie - Eat a cookie',
      'drink milk - Drink a bottle of milk',
      'quaff potion - Quaff a potion (alternative)'
    ]
  }
};
