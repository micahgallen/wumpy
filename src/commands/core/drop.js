/**
 * Drop Command - Drop an object from inventory into the current room
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute the drop command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Drop what? Try "drop [item]", "drop [qty] [item]", or "drop all [item]"\n'));
    return;
  }

  if (!player.inventory || player.inventory.length === 0) {
    player.send('\n' + colors.error('You are not carrying anything to drop.\n'));
    return;
  }

  // Parse quantity if provided (e.g., "drop 5 potion", "drop all potion", or "drop potion")
  let quantity = 1; // Default to 1 item
  let dropAll = false;
  let targetArgs = args;

  // Check if first arg is "all"
  if (args[0].toLowerCase() === 'all') {
    dropAll = true;
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
    player.send('\n' + colors.error('Drop what? Specify an item name.\n'));
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

  // Check if inventory is in new format (array of BaseItem instances)
  const isNewFormat = player.inventory.length > 0 && typeof player.inventory[0] === 'object' && player.inventory[0].instanceId;

  if (isNewFormat) {
    // New item system

    // If "drop all", find ALL matching stacks, otherwise just first
    let itemsToDrop;
    if (dropAll) {
      itemsToDrop = InventoryManager.findItemsByKeyword(player, target);
      if (itemsToDrop.length === 0) {
        player.send('\n' + colors.error(`You are not carrying "${args.join(' ')}".\n`));
        return;
      }
    } else {
      const item = InventoryManager.findItemByKeyword(player, target);
      if (!item) {
        player.send('\n' + colors.error(`You are not carrying "${args.join(' ')}".\n`));
        return;
      }
      itemsToDrop = [item];
    }

    // Process each stack
    let totalDropped = 0;
    let stacksDropped = 0;

    for (const item of itemsToDrop) {
      // Check if item can be dropped
      if (!item.isDroppable) {
        if (!dropAll) {
          player.send('\n' + colors.error(`You can't drop that item.\n`));
          return;
        }
        continue; // Skip this stack when dropping all
      }

      // Check if item is a quest item
      if (item.isQuestItem) {
        if (!dropAll) {
          player.send('\n' + colors.error(`You can't drop that quest item.\n`));
          return;
        }
        continue;
      }

      // Check if item is bound
      if (item.boundTo && item.boundTo !== player.username) {
        if (!dropAll) {
          player.send('\n' + colors.error(`That item is bound and cannot be dropped.\n`));
          return;
        }
        continue;
      }

      // Check if item is equipped
      if (item.isEquipped) {
        if (!dropAll) {
          player.send('\n' + colors.error(`You must unequip that item first.\n`));
          return;
        }
        continue;
      }

      // Handle partial stack drops
      let itemToDrop = item;
      let dropQuantity = item.quantity;

      // Determine how many to drop
      if (dropAll) {
        // Drop entire stack
        dropQuantity = item.quantity;
      } else {
        // Drop specific quantity (default is 1)
        if (quantity > 1 && !item.isStackable) {
          player.send('\n' + colors.error(`You can't drop multiple ${item.getDisplayName()}. It doesn't stack.\n`));
          return;
        }

        if (quantity > item.quantity) {
          player.send('\n' + colors.error(`You only have ${item.quantity} of those.\n`));
          return;
        }

        dropQuantity = quantity;
      }

      // Determine if we need to split the stack
      if (dropQuantity === item.quantity) {
        // Dropping entire stack, no need to split
        itemToDrop = item;
      } else {
        // Split the stack - keep (item.quantity - quantity) in inventory
        const splitResult = InventoryManager.splitStack(player, item.instanceId, dropQuantity);
        if (!splitResult.success) {
          player.send('\n' + colors.error(`Failed to split stack: ${splitResult.error}\n`));
          return;
        }
        // splitResult.newInstance is the item to drop
        itemToDrop = splitResult.newInstance;
      }

      // Call onDrop hook
      if (!itemToDrop.onDrop(player, room)) {
        if (!dropAll) {
          player.send('\n' + colors.error(`You can't drop ${itemToDrop.getDisplayName()} right now.\n`));
          return;
        }
        continue;
      }

      // Remove from inventory (will be the split item if we split, or original if dropping all)
      const removedItem = InventoryManager.removeItem(player, itemToDrop.instanceId);
      if (!removedItem) {
        if (!dropAll) {
          player.send('\n' + colors.error('Failed to drop item. Please report this bug.\n'));
          return;
        }
        continue;
      }

      // Add to room (store as serialized data)
      // First check if there's a compatible stack in the room
      let stacked = false;
      if (removedItem.isStackable) {
        for (const existingItem of room.items) {
          // Check if items can stack together
          const canStack = existingItem.definitionId === removedItem.definitionId &&
                          !existingItem.boundTo && !removedItem.boundTo &&
                          (!existingItem.enchantments || existingItem.enchantments.length === 0) &&
                          (!removedItem.enchantments || removedItem.enchantments.length === 0);

          if (canStack) {
            // Merge into existing stack
            existingItem.quantity = (existingItem.quantity || 1) + removedItem.quantity;
            stacked = true;
            break;
          }
        }
      }

      // If not stacked, add as new entry
      if (!stacked) {
        const itemData = {
          definitionId: removedItem.definitionId,
          quantity: removedItem.quantity,
          durability: removedItem.durability,
          instanceId: removedItem.instanceId,
          boundTo: removedItem.boundTo,
          isIdentified: removedItem.isIdentified,
          enchantments: removedItem.enchantments,
          customName: removedItem.customName,
          customDescription: removedItem.customDescription
        };
        room.items.push(itemData);
      }

      // Track totals
      totalDropped += removedItem.quantity;
      stacksDropped++;
    }

    // Save player inventory once after all drops
    const serialized = InventorySerializer.serializeInventory(player);
    playerDB.updatePlayerInventory(player.username, serialized);

    // Success message
    const itemName = itemsToDrop[0].getDisplayName();
    let message = colors.success(`You drop ${itemName}`);
    if (totalDropped > 1) {
      message += colors.dim(` x${totalDropped}`);
    }
    if (stacksDropped > 1) {
      message += colors.dim(` (${stacksDropped} stacks)`);
    }
    message += '.';

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
        let announcement = `${player.username} drops ${itemName}`;
        if (totalDropped > 1) {
          announcement += ` x${totalDropped}`;
        }
        announcement += '.';
        otherPlayers.forEach(p => p.send('\n' + colors.dim(announcement) + '\n'));
      }
    }

    return;
  } else {
    // Legacy object system
    for (let i = 0; i < player.inventory.length; i++) {
      const objId = player.inventory[i];
      const obj = world.getObject(objId);

      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching object

          // Remove from inventory
          player.inventory.splice(i, 1);

          // Add to room
          if (!room.objects) {
            room.objects = [];
          }
          room.objects.push(objId);

          // Save player data
          playerDB.updatePlayerInventory(player.username, player.inventory);

          player.send('\n' + colors.success(`You drop ${obj.name}.\n`));
          return;
        }
      }
    }

    player.send('\n' + colors.error(`You are not carrying "${args.join(' ')}".\n`));
  }
}

module.exports = {
  name: 'drop',
  aliases: [],
  description: 'Drop an item from your inventory',
  usage: 'drop <item> (drops 1), drop <qty> <item>, or drop all <item>',
  execute
};
