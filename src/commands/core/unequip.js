/**
 * Unequip command - Remove an equipped item to inventory
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const EquipmentManager = require('../../systems/equipment/EquipmentManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute unequip command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('Unequip what? Usage: unequip <item>'));
    return;
  }

  // Join args to handle multi-word item names
  const keyword = args.join(' ');

  // Find item in inventory (must be equipped)
  const item = InventoryManager.findItemByKeyword(player, keyword);

  if (!item) {
    player.send(colors.error(`You don't have '${keyword}' in your inventory.`));
    return;
  }

  if (!item.isEquipped) {
    player.send(colors.error(`${item.name} is not equipped.`));
    return;
  }

  // Attempt to unequip the item
  const result = EquipmentManager.unequipItem(player, item);

  if (!result.success) {
    player.send(colors.error(result.message));
    return;
  }

  // Save inventory after unequipping
  if (context.playerDB) {
    const serialized = InventorySerializer.serializeInventory(player);
    context.playerDB.updatePlayerInventory(player.username, serialized);
  }

  // Success message
  player.send(colors.success(result.message));
}

module.exports = {
  name: 'unequip',
  aliases: ['remove', 'unwield'],
  description: 'Unequip an equipped item',
  usage: 'unequip <item>',
  category: 'items',
  execute
};
