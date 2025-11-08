/**
 * Inventory command - Show what player is carrying
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const CurrencyManager = require('../../systems/economy/CurrencyManager');
const { ItemType } = require('../../items/schemas/ItemTypes');

/**
 * Execute inventory command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world } = context;

  // Separate legacy and new items (handle mixed inventories)
  const legacyItems = [];
  const newItems = [];

  if (player.inventory && player.inventory.length > 0) {
    for (const item of player.inventory) {
      if (typeof item === 'string') {
        legacyItems.push(item);
      } else if (item && typeof item === 'object' && item.definitionId) {
        newItems.push(item);
      }
    }
  }

  let output = [];
  output.push('\n' + colors.highlight('='.repeat(60)));
  output.push(colors.highlight('  INVENTORY'));
  output.push(colors.highlight('='.repeat(60)));
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
      { type: ItemType.MISC, label: 'Miscellaneous' }
    ];

    let hasItems = false;
    for (const category of categories) {
      const items = itemsByType[category.type];
      if (items && items.length > 0) {
        hasItems = true;
        output.push(colors.cyan(category.label));
        for (const item of items) {
          let itemLine = '  - ' + colors.objectName(item.getDisplayName());

          // Show quantity for stackable items
          if (item.quantity > 1) {
            itemLine += colors.warning(` x${item.quantity}`);
          }

          // Show equipped status
          if (item.isEquipped) {
            itemLine += colors.green(' [equipped]');
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
  }

  // Show message if no items
  if (newItems.length === 0 && legacyItems.length === 0) {
    output.push(colors.subtle('  No items'));
    output.push('');
  }

  // Show warning if there are legacy items
  if (legacyItems.length > 0 && newItems.length === 0) {
    output.push('');
    output.push(colors.error('All your items are in legacy format!'));
    output.push(colors.warning('Please drop them and pick them up again to convert to the new system.'));
    output.push('');
  }

  // Display encumbrance stats (always show)
  const stats = InventoryManager.getInventoryStats(player);

  // Calculate weight percentage for color coding
  const weightPercent = stats.weight.percent;
  const slotsPercent = stats.slots.percent;

  let weightColor = colors.subtle;
  if (weightPercent > 80) weightColor = colors.error;
  else if (weightPercent > 60) weightColor = colors.warning;
  else if (weightPercent > 0) weightColor = colors.info;

  let slotsColor = colors.subtle;
  if (slotsPercent > 80) slotsColor = colors.error;
  else if (slotsPercent > 60) slotsColor = colors.warning;
  else if (slotsPercent > 0) slotsColor = colors.info;

  output.push(colors.cyan('Capacity'));
  output.push(weightColor(`  Weight: ${stats.weight.current.toFixed(1)} / ${stats.weight.max} lbs (${Math.round(weightPercent)}%)`));
  output.push(slotsColor(`  Slots:  ${stats.slots.current} / ${stats.slots.max} (${Math.round(slotsPercent)}%)`));

  // Warning messages
  if (weightPercent > 80) {
    output.push('');
    output.push(colors.error('  WARNING: You are heavily encumbered!'));
  } else if (slotsPercent > 80) {
    output.push('');
    output.push(colors.error('  WARNING: Your inventory is nearly full!'));
  }

  // Display currency (ALWAYS, even if inventory is empty)
  const wallet = CurrencyManager.getWallet(player);

  output.push('');
  output.push(colors.cyan('Currency'));

  // Build currency line with color coding
  const currencyParts = [];

  if (wallet.platinum > 0) {
    currencyParts.push(colors.magenta('Platinum: ') + colors.magenta(wallet.platinum.toString()));
  }
  if (wallet.gold > 0) {
    currencyParts.push(colors.warning('Gold: ') + colors.warning(wallet.gold.toString()));
  }
  if (wallet.silver > 0) {
    currencyParts.push(colors.info('Silver: ') + colors.info(wallet.silver.toString()));
  }
  if (wallet.copper > 0) {
    currencyParts.push(colors.subtle('Copper: ') + colors.subtle(wallet.copper.toString()));
  }

  if (currencyParts.length > 0) {
    output.push('  ' + currencyParts.join(colors.dim(', ')));
  } else {
    output.push(colors.subtle('  No money'));
  }

  output.push(colors.highlight('='.repeat(60)));
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
