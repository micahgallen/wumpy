/**
 * Attune Command
 *
 * Allows players to attune to magical items requiring attunement.
 * Attunement is required to access magical properties of certain items.
 * Players have a limited number of attunement slots (default: 3).
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const AttunementManager = require('../../systems/equipment/AttunementManager');

/**
 * Execute the attune command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  // Show attunement status if no args
  if (args.length === 0) {
    showAttunementStatus(player);
    return;
  }

  // Parse arguments
  const keyword = args.join(' ').toLowerCase();

  // Special case: "attune list" or "attune status"
  if (keyword === 'list' || keyword === 'status') {
    showAttunementStatus(player);
    return;
  }

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

  // Check if item requires attunement
  if (!item.requiresAttunement) {
    player.send('\n' + colors.error(`${item.getDisplayName()} does not require attunement.\n`));
    return;
  }

  // Attempt to attune
  const result = AttunementManager.attuneToItem(player, item);

  if (result.success) {
    player.send('\n' + colors.success(result.message + '\n'));

    // Show attunement slots used
    const maxSlots = AttunementManager.getMaxAttunementSlots(player);
    const usedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
    player.send(colors.hint(`Attunement slots: ${usedSlots}/${maxSlots}\n`));
  } else {
    player.send('\n' + colors.error(result.message + '\n'));
  }
}

/**
 * Show player's attunement status
 * @param {Object} player - Player object
 */
function showAttunementStatus(player) {
  const maxSlots = AttunementManager.getMaxAttunementSlots(player);
  const usedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
  const availableSlots = maxSlots - usedSlots;

  player.send('\n' + colors.cyan('=== Attunement Status ===\n'));
  player.send(`Slots Used: ${usedSlots}/${maxSlots}\n`);
  player.send(`Available: ${availableSlots}\n\n`);

  // List attuned items
  const attunedItemIds = AttunementManager.getAttunedItems(player.name);

  if (attunedItemIds.size === 0) {
    player.send(colors.gray('You are not attuned to any items.\n'));
  } else {
    player.send(colors.cyan('Attuned Items:\n'));

    const inventory = InventoryManager.getInventory(player.name);
    for (const itemId of attunedItemIds) {
      // Find the item in inventory
      const item = inventory.find(i => i.instanceId === itemId);
      if (item) {
        player.send(`  • ${item.getDisplayName()}`);
        if (item.equipped) {
          player.send(colors.gray(' (equipped)'));
        }
        player.send('\n');
      }
    }
  }

  player.send('\n' + colors.hint('Usage: attune <item> - Attune to a magical item\n'));
}

module.exports = {
  name: 'attune',
  aliases: ['attunement'],
  execute,
  help: {
    description: 'Attune to magical items',
    usage: 'attune [item]',
    examples: [
      'attune - Show attunement status',
      'attune sword - Attune to a magical sword',
      'attune list - Show attuned items'
    ]
  }
};
