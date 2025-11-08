/**
 * Equip command - Equip an item from inventory
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const EquipmentManager = require('../../systems/equipment/EquipmentManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute equip command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('Equip what? Usage: equip <item> [slot]'));
    return;
  }

  // Check if last arg is a slot specifier
  let targetSlot = null;
  let itemArgs = args;
  const lastArg = args[args.length - 1].toLowerCase().replace(/-/g, '_');

  // Slot aliases for convenience
  const slotAliases = {
    'mainhand': 'main_hand',
    'offhand': 'off_hand',
    'main': 'main_hand',
    'off': 'off_hand',
    'primary': 'main_hand',
    'secondary': 'off_hand'
  };

  // Check if last arg is a slot name
  if (slotAliases[lastArg] || lastArg === 'main_hand' || lastArg === 'off_hand') {
    targetSlot = slotAliases[lastArg] || lastArg;
    itemArgs = args.slice(0, -1);
  }

  if (itemArgs.length === 0) {
    player.send(colors.error('Equip what? Usage: equip <item> [slot]'));
    return;
  }

  // Join args to handle multi-word item names
  const keyword = itemArgs.join(' ');

  // Find item in inventory
  const item = InventoryManager.findItemByKeyword(player, keyword);

  if (!item) {
    player.send(colors.error(`You don't have '${keyword}' in your inventory.`));
    return;
  }

  // Attempt to equip the item
  const result = EquipmentManager.equipItem(player, item, targetSlot);

  if (!result.success) {
    player.send(colors.error(result.message));
    return;
  }

  // Save inventory after equipping
  if (context.playerDB) {
    const serialized = InventorySerializer.serializeInventory(player);
    context.playerDB.updatePlayerInventory(player.username, serialized);
  }

  // Success message
  player.send(colors.success(result.message));

  // Show warnings if any
  if (result.warnings && result.warnings.length > 0) {
    for (const warning of result.warnings) {
      player.send(colors.warning(warning));
    }
  }
}

module.exports = {
  name: 'equip',
  aliases: ['wear', 'wield'],
  description: 'Equip an item from your inventory',
  usage: 'equip <item> [slot]',
  examples: [
    'equip dagger',
    'equip dagger offhand',
    'equip sword main',
    'equip chainmail'
  ],
  category: 'items',
  execute
};
