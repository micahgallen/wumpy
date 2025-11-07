/**
 * Get/Take Command - Pick up an object from the current room
 */

const colors = require('../../colors');
const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute the get command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Get what? Try "get [item]", "get [qty] [item]", or "get all [item]"\n'));
    return;
  }

  // Parse quantity if provided (e.g., "get 5 potion", "get all potion", or "get potion")
  let quantity = 1; // Default to 1 item
  let takeAll = false;
  let targetArgs = args;

  // Check if first arg is "all"
  if (args[0].toLowerCase() === 'all') {
    takeAll = true;
    quantity = null; // Will be set to full stack later
    targetArgs = args.slice(1);
  }
  // Check if first arg is a number
  else {
    const firstArg = args[0];
    const parsedQty = parseInt(firstArg);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      quantity = parsedQty;
      targetArgs = args.slice(1);
    }
    // Otherwise default quantity = 1
  }

  if (targetArgs.length === 0) {
    player.send('\n' + colors.error('Get what? Specify an item name.\n'));
    return;
  }

  const target = targetArgs.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Initialize room.items if it doesn't exist
  if (!room.items) {
    room.items = [];
  }

  // Initialize player inventory if it doesn't exist
  if (!player.inventory) {
    player.inventory = [];
  }

  // Try new item system first (room.items)
  if (room.items.length > 0) {
    const itemResult = findItemInRoom(room.items, target);
    if (itemResult) {
      const { item, index } = itemResult;

      // Get item definition from registry
      const itemDef = ItemRegistry.getItem(item.definitionId);
      if (!itemDef) {
        player.send('\n' + colors.error('That item appears to be broken. Please report this bug.\n'));
        return;
      }

      // Check if takeable
      if (itemDef.isTakeable === false) {
        player.send('\n' + colors.error(`You can't take ${itemDef.name}. It's too heavy or fixed in place.\n`));
        return;
      }

      // Handle partial stack pickups
      let itemToPickup = item;
      let pickupQuantity = item.quantity || 1;
      let shouldRemoveFromRoom = true;

      // Determine how many to pick up
      if (takeAll) {
        // Take entire stack
        pickupQuantity = item.quantity || 1;
      } else {
        // Take specific quantity (default is 1)
        if (quantity > 1 && !itemDef.isStackable) {
          player.send('\n' + colors.error(`You can't pick up multiple ${itemDef.name}. It doesn't stack.\n`));
          return;
        }

        if (quantity > (item.quantity || 1)) {
          player.send('\n' + colors.error(`There are only ${item.quantity || 1} of those here.\n`));
          return;
        }

        pickupQuantity = quantity;
      }

      // Determine if we should remove from room or split the stack
      if (pickupQuantity === (item.quantity || 1)) {
        // Picking up entire stack
        shouldRemoveFromRoom = true;
      } else {
        // Picking up partial stack - leave the rest in the room
        shouldRemoveFromRoom = false;
        // Update room item quantity
        item.quantity = (item.quantity || 1) - pickupQuantity;
        // Create a modified copy for pickup with the specified quantity
        itemToPickup = { ...item, quantity: pickupQuantity };
      }

      // Restore the exact item instance from serialized data
      const itemInstance = ItemFactory.restoreItem(itemToPickup, itemDef);
      itemInstance.location = { type: 'inventory', owner: player.username };

      // Call onPickup hook
      if (!itemInstance.onPickup(player)) {
        player.send('\n' + colors.error(`You can't pick up ${itemInstance.name} right now.\n`));
        return;
      }

      // Check encumbrance
      const addResult = InventoryManager.addItem(player, itemInstance);
      if (!addResult.success) {
        const stats = InventoryManager.getInventoryStats(player);
        const remainingWeight = stats.weight.max - stats.weight.current;
        const remainingSlots = stats.slots.max - stats.slots.current;

        if (addResult.reason.includes('Weight')) {
          player.send('\n' + colors.error(`Too heavy! You can only carry ${remainingWeight.toFixed(1)} more pounds.\n`));
        } else if (addResult.reason.includes('Slots')) {
          player.send('\n' + colors.error(`No room! You can only carry ${remainingSlots} more items.\n`));
        } else {
          player.send('\n' + colors.error(`You can't pick that up: ${addResult.reason}\n`));
        }
        return;
      }

      // Remove from room or update quantity
      if (shouldRemoveFromRoom) {
        room.items.splice(index, 1);
      }
      // If not removing, the quantity was already updated above

      // Save player inventory
      const serialized = InventorySerializer.serializeInventory(player);
      playerDB.updatePlayerInventory(player.username, serialized);

      // Success message
      let message = colors.success(`You take ${itemInstance.getDisplayName()}`);
      if (itemInstance.quantity > 1) {
        message += colors.dim(` x${itemInstance.quantity}`);
      }
      message += '.';

      if (addResult.stackedWith) {
        message += colors.dim(' (stacked)');
      }

      // Show updated encumbrance
      const stats = InventoryManager.getInventoryStats(player);
      message += '\n' + colors.dim(`Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs | Slots: ${stats.slots.current}/${stats.slots.max}`);

      player.send('\n' + message + '\n');

      // Announce to other players in the room
      if (context.allPlayers) {
        const otherPlayers = Array.from(context.allPlayers).filter(p =>
          p.currentRoom === player.currentRoom &&
          p.username !== player.username
        );
        if (otherPlayers.length > 0) {
          let announcement = `${player.username} picks up ${itemInstance.getDisplayName()}`;
          if (itemInstance.quantity > 1) {
            announcement += ` x${itemInstance.quantity}`;
          }
          announcement += '.';
          otherPlayers.forEach(p => p.send('\n' + colors.dim(announcement) + '\n'));
        }
      }

      return;
    }
  }

  // Fall back to legacy object system (room.objects)
  if (room.objects && room.objects.length > 0) {
    for (let i = 0; i < room.objects.length; i++) {
      const objId = room.objects[i];
      const obj = world.getObject(objId);

      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching object

          // Check if takeable
          if (obj.is_takeable === false) {
            player.send('\n' + colors.error(`You can't take ${obj.name}. It's too heavy or fixed in place.\n`));
            return;
          }

          // Remove from room
          room.objects.splice(i, 1);

          // Add to inventory (legacy format)
          player.inventory.push(objId);

          // Save player data
          playerDB.updatePlayerInventory(player.username, player.inventory);

          player.send('\n' + colors.success(`You take ${obj.name}.\n`));
          return;
        }
      }
    }
  }

  // Nothing found
  player.send('\n' + colors.error(`You don't see "${args.join(' ')}" here.\n`));
}

/**
 * Find an item in room items array by keyword
 * @param {Array} roomItems - Array of item data in room
 * @param {string} keyword - Keyword to search for
 * @returns {Object|null} {item, index} or null if not found
 */
function findItemInRoom(roomItems, keyword) {
  const normalizedKeyword = keyword.toLowerCase();

  for (let i = 0; i < roomItems.length; i++) {
    const item = roomItems[i];

    // Get item definition to check keywords
    const itemDef = ItemRegistry.getItem(item.definitionId);
    if (!itemDef) continue;

    // Check item name
    if (itemDef.name.toLowerCase().includes(normalizedKeyword)) {
      return { item, index: i };
    }

    // Check keywords
    if (itemDef.keywords && itemDef.keywords.some(kw => kw.toLowerCase() === normalizedKeyword)) {
      return { item, index: i };
    }
  }

  return null;
}

module.exports = {
  name: 'get',
  aliases: ['take'],
  description: 'Pick up an item from the current room',
  usage: 'get <item> (picks up 1), get <qty> <item>, or get all <item>',
  execute
};
