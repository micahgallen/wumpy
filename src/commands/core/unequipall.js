/**
 * Unequipall command - Unequip all equipped items
 */

const colors = require('../../colors');
const EquipmentManager = require('../../systems/equipment/EquipmentManager');

/**
 * Execute unequipall command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (!player.inventory || player.inventory.length === 0) {
    player.send(colors.error('You have no items in your inventory.'));
    return;
  }

  // Filter for equipped items
  const equippedItems = player.inventory.filter(item => item.isEquipped);

  if (equippedItems.length === 0) {
    player.send(colors.hint('You have no equipped items to unequip.'));
    return;
  }

  player.send(colors.info(`\nUnequipping ${equippedItems.length} item(s)...\n`));

  let unequippedCount = 0;
  let failedCount = 0;
  const results = [];

  // Attempt to unequip each item
  for (const item of equippedItems) {
    const slot = item.equippedSlot;
    const result = EquipmentManager.unequipItem(player, item);

    if (result.success) {
      results.push(colors.success(`✓ ${item.name} (${slot})`));
      unequippedCount++;
    } else {
      results.push(colors.error(`✗ ${item.name}: ${result.message}`));
      failedCount++;
    }
  }

  // Display all results
  for (const line of results) {
    player.send(line + '\n');
  }

  // Summary
  player.send('\n' + colors.line(50, '-') + '\n');
  player.send(colors.info(`Unequipped: ${unequippedCount}/${equippedItems.length}`));
  if (failedCount > 0) {
    player.send(colors.error(` (${failedCount} failed)`));
  }
  player.send('\n');
}

module.exports = {
  name: 'unequipall',
  aliases: ['removeall', 'unwieldall'],
  description: 'Unequip all equipped items',
  usage: 'unequipall',
  examples: ['unequipall'],
  category: 'items',
  execute
};
