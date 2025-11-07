/**
 * Equipall command - Equip all equippable items from inventory
 */

const colors = require('../../colors');
const EquipmentManager = require('../../systems/equipment/EquipmentManager');

/**
 * Execute equipall command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (!player.inventory || player.inventory.length === 0) {
    player.send(colors.error('You have no items in your inventory.'));
    return;
  }

  // Filter for equippable items that aren't already equipped
  const equippableItems = player.inventory.filter(item =>
    item.isEquippable && !item.isEquipped
  );

  if (equippableItems.length === 0) {
    player.send(colors.hint('You have no unequipped items to equip.'));
    return;
  }

  player.send(colors.info(`\nAttempting to equip ${equippableItems.length} item(s)...\n`));

  let equippedCount = 0;
  let failedCount = 0;
  const results = [];

  // Attempt to equip each item
  for (const item of equippableItems) {
    const result = EquipmentManager.equipItem(player, item);

    if (result.success) {
      results.push(colors.success(`✓ ${item.name} → ${item.equippedSlot}`));
      equippedCount++;

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          results.push(colors.warning(`  ⚠ ${warning}`));
        }
      }
    } else {
      results.push(colors.dim(`✗ ${item.name}: ${result.message}`));
      failedCount++;
    }
  }

  // Display all results
  for (const line of results) {
    player.send(line + '\n');
  }

  // Summary
  player.send('\n' + colors.line(50, '-') + '\n');
  player.send(colors.info(`Equipped: ${equippedCount}/${equippableItems.length}`));
  if (failedCount > 0) {
    player.send(colors.dim(` (${failedCount} failed)`));
  }
  player.send('\n');
}

module.exports = {
  name: 'equipall',
  aliases: ['wearall'],
  description: 'Equip all equippable items from your inventory',
  usage: 'equipall',
  examples: ['equipall'],
  category: 'items',
  execute
};
