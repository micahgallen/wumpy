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
  let exactMatchItem = null;

  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      // Check if it's a new item system item
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

  // Additional validation for consumables
  if (item.itemType === 'consumable') {
    // Can't consume while dead
    if (player.hp <= 0 || player.isGhost) {
      player.send('\n' + colors.error('You cannot consume items while dead.\n'));
      return;
    }

    // Optional: Warn if healing at full health
    if (item.consumableProperties?.healAmount && player.hp >= player.maxHp) {
      player.send('\n' + colors.warning('You are already at full health, but you consume it anyway.\n'));
      // Don't return - allow consumption, just warn
    }
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

  // Notify others in the room about the consumption
  if (success && context.allPlayers && player.currentRoom && item.itemType === 'consumable') {
    const consumableType = item.consumableProperties?.consumableType;
    let action = 'uses';

    switch (consumableType) {
      case 'food':
        action = 'eats';
        break;
      case 'potion':
      case 'elixir':
        action = 'drinks';
        break;
      case 'scroll':
        action = 'reads';
        break;
    }

    // Broadcast to others in the room
    for (const p of context.allPlayers) {
      if (p.currentRoom === player.currentRoom && p.username !== player.username) {
        p.send(`\n${player.username} ${action} ${item.name}.\n`);
        p.sendPrompt();
      }
    }
  }

  // Log the use
  logger.log(`Player ${player.username} used item ${item.name} (${item.instanceId})`);

  // Check if item was fully consumed (quantity reached 0)
  // Note: ConsumableMixin.consume() already reduced the quantity
  if (item.itemType === 'consumable' && item.quantity <= 0) {
    // Remove the item from inventory since it's fully consumed
    const removedItem = InventoryManager.removeItem(player, item.instanceId);

    if (!removedItem) {
      // This shouldn't happen since we just found the item, but handle it anyway
      logger.error(`Failed to remove consumed item ${item.name} from ${player.username}'s inventory`);
    }
  }

  // Save inventory after consuming item (quantity changed or item removed)
  if (item.itemType === 'consumable' && context.playerDB) {
    const serialized = InventorySerializer.serializeInventory(player);
    context.playerDB.updatePlayerInventory(player.username, serialized);
  }

  // Update player stats if they changed (HP, etc.)
  if (context.playerDB && context.playerDB.updatePlayer) {
    context.playerDB.updatePlayer(player.username, {
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
  aliases: ['consume'],
  execute,
  help: {
    description: 'Use or consume an item',
    usage: 'use <item>',
    examples: [
      'use potion - Use a health potion',
      'use cookie - Use a cookie',
      'consume potion - Consume a potion (alternative)'
    ]
  }
};
