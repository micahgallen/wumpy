/**
 * Inventory command - Show what player is carrying
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const { ItemType } = require('../../items/schemas/ItemTypes');

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

  // Separate legacy and new items (handle mixed inventories)
  const legacyItems = [];
  const newItems = [];

  for (const item of player.inventory) {
    if (typeof item === 'string') {
      legacyItems.push(item);
    } else if (item && typeof item === 'object' && item.definitionId) {
      newItems.push(item);
    }
  }

  let output = [];
  output.push('\n' + colors.highlight('━'.repeat(42)));
  output.push(colors.highlight('       INVENTORY'));
  output.push(colors.highlight('━'.repeat(42)));
  output.push('');

  // Display legacy items if any
  if (legacyItems.length > 0) {
    output.push(colors.warning('Legacy Items (please drop and re-pick to convert):'));
    for (const objId of legacyItems) {
      const obj = world.getObject(objId);
      if (obj) {
        output.push('  ' + colors.objectName(obj.name) + colors.error(' [legacy - may cause issues]'));
      }
    }
    output.push('');
  }

  // Display new items
  if (newItems.length > 0) {
    // New item system - group by type
    const itemsByType = groupItemsByType(newItems);

    // Display each category
    const categories = [
      { type: ItemType.WEAPON, label: 'Weapons' },
      { type: ItemType.ARMOR, label: 'Armor' },
      { type: ItemType.JEWELRY, label: 'Jewelry' },
      { type: ItemType.CONSUMABLE, label: 'Consumables' },
      { type: ItemType.QUEST, label: 'Quest Items' },
      { type: ItemType.MATERIAL, label: 'Materials' },
      { type: ItemType.CURRENCY, label: 'Currency' },
      { type: ItemType.MISC, label: 'Miscellaneous' }
    ];

    let hasItems = false;
    for (const category of categories) {
      const items = itemsByType[category.type];
      if (items && items.length > 0) {
        hasItems = true;
        output.push(colors.highlight(category.label + ':'));
        for (const item of items) {
          let itemLine = '  ' + colors.objectName(item.getDisplayName());

          // Show quantity for stackable items
          if (item.quantity > 1) {
            itemLine += colors.dim(` x${item.quantity}`);
          }

          // Show equipped status
          if (item.isEquipped) {
            itemLine += colors.dim(' [equipped]');
          }

          // Show durability warnings
          if (item.maxDurability && item.durability !== null) {
            const durabilityPercent = (item.durability / item.maxDurability) * 100;
            if (durabilityPercent < 25) {
              itemLine += colors.error(' [broken!]');
            } else if (durabilityPercent < 50) {
              itemLine += colors.warning(' [worn]');
            }
          }

          output.push(itemLine);
        }
        output.push('');
      }
    }

    if (!hasItems) {
      output.push(colors.info('You are not carrying anything.'));
      output.push('');
    }

    // Display encumbrance stats (only if we have new items)
    const stats = InventoryManager.getInventoryStats(player);

    // Calculate weight percentage for color coding
    const weightPercent = stats.weight.percent;
    const slotsPercent = stats.slots.percent;

    let weightColor = colors.success;
    if (weightPercent > 80) weightColor = colors.error;
    else if (weightPercent > 60) weightColor = colors.warning;

    let slotsColor = colors.success;
    if (slotsPercent > 80) slotsColor = colors.error;
    else if (slotsPercent > 60) slotsColor = colors.warning;

    output.push(weightColor(`Weight: ${stats.weight.current.toFixed(1)} / ${stats.weight.max} lbs (${Math.round(weightPercent)}%)`));
    output.push(slotsColor(`Slots: ${stats.slots.current} / ${stats.slots.max} (${Math.round(slotsPercent)}%)`));

    // Warning messages
    if (weightPercent > 80) {
      output.push('');
      output.push(colors.error('You are heavily encumbered!'));
    } else if (slotsPercent > 80) {
      output.push('');
      output.push(colors.error('Your inventory is nearly full!'));
    }
  }

  // Show warning if there are legacy items
  if (legacyItems.length > 0 && newItems.length === 0) {
    output.push('');
    output.push(colors.error('All your items are in legacy format!'));
    output.push(colors.warning('Please drop them and pick them up again to convert to the new system.'));
  }

  output.push(colors.highlight('━'.repeat(42)));
  player.send(output.join('\n') + '\n');
}

/**
 * Group items by type for display
 * @param {Array} items - Array of item instances
 * @returns {Object} Items grouped by type
 */
function groupItemsByType(items) {
  const grouped = {};

  for (const item of items) {
    const type = item.itemType || ItemType.MISC;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(item);
  }

  // Sort items within each group by name
  for (const type in grouped) {
    grouped[type].sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()));
  }

  return grouped;
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
