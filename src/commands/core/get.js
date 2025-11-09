/**
 * Get/Take Command - Pick up an object from the current room
 */

const colors = require('../../colors');
const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute "get item from container" command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 * @param {number} fromIndex - Index of "from" keyword in args
 */
function executeGetFromContainer(player, args, context, fromIndex) {
  const { world, playerDB } = context;

  // Parse "get X from Y" or "get all X from Y" or "get 5 X from Y"
  const itemArgs = args.slice(0, fromIndex);
  const containerArgs = args.slice(fromIndex + 1);

  if (itemArgs.length === 0) {
    player.send('\n' + colors.error('Get what from the container?\n'));
    return;
  }

  if (containerArgs.length === 0) {
    player.send('\n' + colors.error('Get from what?\n'));
    return;
  }

  const room = world.getRoom(player.currentRoom);
  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Initialize player inventory if it doesn't exist
  if (!player.inventory) {
    player.inventory = [];
  }

  // Parse quantity/all from item args
  let quantity = 1;
  let takeAll = false;
  let itemKeywords = itemArgs;

  if (itemArgs[0].toLowerCase() === 'all') {
    takeAll = true;
    quantity = null;
    itemKeywords = itemArgs.slice(1);
  } else {
    const parsedQty = parseInt(itemArgs[0]);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      quantity = parsedQty;
      itemKeywords = itemArgs.slice(1);
    }
  }

  // Special case: "get all from corpse" - take all items
  if (itemKeywords.length === 0 && takeAll) {
    return getAllFromContainer(player, containerArgs, context);
  }

  if (itemKeywords.length === 0) {
    player.send('\n' + colors.error('Get what from the container?\n'));
    return;
  }

  const itemTarget = itemKeywords.join(' ').toLowerCase();
  const containerTarget = containerArgs.join(' ').toLowerCase();

  // Find container in room.items
  const container = findContainerInRoom(room, containerTarget);
  if (!container) {
    player.send('\n' + colors.error(`You don't see "${containerArgs.join(' ')}" here.\n`));
    return;
  }

  // Check if container has inventory
  if (!container.inventory || container.inventory.length === 0) {
    player.send('\n' + colors.info(`The ${container.name} is empty.\n`));
    return;
  }

  // Find item in container
  const itemResult = findItemInContainer(container, itemTarget);
  if (!itemResult) {
    player.send('\n' + colors.error(`There's no "${itemKeywords.join(' ')}" in the ${container.name}.\n`));
    return;
  }

  const { item, index } = itemResult;

  // Get item definition
  const itemDef = ItemRegistry.getItem(item.definitionId);
  if (!itemDef) {
    player.send('\n' + colors.error('That item appears to be broken. Please report this bug.\n'));
    return;
  }

  // Handle partial stack pickups
  let itemToTake = item;
  let takeQuantity = item.quantity || 1;
  let shouldRemoveFromContainer = true;

  // Determine how many to take
  if (takeAll) {
    takeQuantity = item.quantity || 1;
  } else {
    if (quantity > 1 && !itemDef.isStackable) {
      player.send('\n' + colors.error(`You can't take multiple ${itemDef.name}. It doesn't stack.\n`));
      return;
    }

    if (quantity > (item.quantity || 1)) {
      player.send('\n' + colors.error(`There are only ${item.quantity || 1} of those in the ${container.name}.\n`));
      return;
    }

    takeQuantity = quantity;
  }

  // Determine if we should remove from container or split the stack
  if (takeQuantity === (item.quantity || 1)) {
    shouldRemoveFromContainer = true;
    itemToTake = item;
  } else {
    shouldRemoveFromContainer = false;
    item.quantity = (item.quantity || 1) - takeQuantity;
    itemToTake = { ...item, quantity: takeQuantity };
  }

  // Restore the item instance
  const itemInstance = ItemFactory.restoreItem(itemToTake, itemDef);
  itemInstance.location = { type: 'inventory', owner: player.username };

  // Call onPickup hook (handles currency conversion, etc.)
  const room = world.getRoom(player.currentRoom);
  const pickupResult = itemInstance.onPickup(player, room);

  // Handle both old boolean return and new object return
  if (pickupResult === false || (typeof pickupResult === 'object' && !pickupResult.success)) {
    const errorMsg = (typeof pickupResult === 'object' && pickupResult.message)
      ? pickupResult.message
      : `You can't take ${itemInstance.name} right now.`;
    player.send('\n' + colors.error(errorMsg + '\n'));
    return;
  }

  // Check if item has custom pickup behavior (like currency auto-conversion)
  const preventAddToInventory = (typeof pickupResult === 'object' && pickupResult.preventAddToInventory) || false;
  const customMessage = (typeof pickupResult === 'object' && pickupResult.message) || null;

  if (preventAddToInventory) {
    // Item handled its own pickup logic (e.g., currency converted to wallet)
    // Remove from container
    if (shouldRemoveFromContainer) {
      container.inventory.splice(index, 1);
    }

    // Display custom message
    if (customMessage) {
      player.send('\n' + colors.success(customMessage));
      player.send(colors.dim(` from the ${container.name}.`) + '\n');
    }

    // Show wallet for currency
    const { ItemType } = require('../../items/schemas/ItemTypes');
    if (itemInstance.itemType === ItemType.CURRENCY) {
      const CurrencyManager = require('../../systems/economy/CurrencyManager');
      const wallet = CurrencyManager.getWallet(player);
      player.send(colors.info(`Wallet: ${CurrencyManager.format(wallet)}\n`));
    }

    // Check if container is empty
    if (container.inventory.length === 0) {
      player.send(colors.hint(`The ${container.name} is now empty.\n`));
    }

    // Announce to room
    if (context.allPlayers) {
      const roomMessage = colors.info(`${player.username} takes ${itemInstance.getDisplayName()} from the ${container.name}.\n`);
      for (const p of context.allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom && p.send) {
          p.send(roomMessage);
        }
      }
    }

    return;
  }

  // Normal item pickup - check encumbrance
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
      player.send('\n' + colors.error(`You can't take that: ${addResult.reason}\n`));
    }
    return;
  }

  // Remove from container or update quantity
  if (shouldRemoveFromContainer) {
    container.inventory.splice(index, 1);
  }

  // Save player inventory
  const serialized = InventorySerializer.serializeInventory(player);
  playerDB.updatePlayerInventory(player.username, serialized);

  // Success message
  let message = colors.success(`You take ${itemInstance.getDisplayName()}`);
  if (itemInstance.quantity > 1) {
    message += colors.dim(` x${itemInstance.quantity}`);
  }
  message += ` from the ${container.name}.`;

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
      let announcement = `${player.username} takes ${itemInstance.getDisplayName()}`;
      if (itemInstance.quantity > 1) {
        announcement += ` x${itemInstance.quantity}`;
      }
      announcement += ` from the ${container.name}.`;
      otherPlayers.forEach(p => p.send('\n' + colors.dim(announcement) + '\n'));
    }
  }

  // Check if container is now empty
  if (container.inventory.length === 0 && container.containerType === 'npc_corpse') {
    player.send(colors.dim(`The ${container.name} is now empty.\n`));
  }
}

/**
 * Get all items from a container
 * @param {Object} player - Player executing the command
 * @param {Array} containerArgs - Container keywords
 * @param {Object} context - Shared command context
 */
function getAllFromContainer(player, containerArgs, context) {
  const { world, playerDB } = context;
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  const containerTarget = containerArgs.join(' ').toLowerCase();
  const container = findContainerInRoom(room, containerTarget);

  if (!container) {
    player.send('\n' + colors.error(`You don't see "${containerArgs.join(' ')}" here.\n`));
    return;
  }

  if (!container.inventory || container.inventory.length === 0) {
    player.send('\n' + colors.info(`The ${container.name} is empty.\n`));
    return;
  }

  // Track what we took
  let itemsTaken = [];
  let totalItems = 0;
  let failures = [];

  // Take each item from the container (iterate backwards to avoid index issues)
  for (let i = container.inventory.length - 1; i >= 0; i--) {
    const item = container.inventory[i];
    const itemDef = ItemRegistry.getItem(item.definitionId);

    if (!itemDef) {
      failures.push(`broken item (report this bug)`);
      continue;
    }

    // Restore item instance
    const itemInstance = ItemFactory.restoreItem(item, itemDef);
    itemInstance.location = { type: 'inventory', owner: player.username };

    // Call onPickup hook (handles currency conversion, etc.)
    const pickupResult = itemInstance.onPickup(player, room);

    // Handle pickup result
    if (pickupResult === false || (typeof pickupResult === 'object' && !pickupResult.success)) {
      failures.push(itemInstance.getDisplayName());
      continue;
    }

    // Check if item prevented inventory add (currency auto-conversion)
    const preventAddToInventory = (typeof pickupResult === 'object' && pickupResult.preventAddToInventory) || false;

    if (preventAddToInventory) {
      // Item handled its own pickup (e.g., currency to wallet)
      container.inventory.splice(i, 1);
      itemsTaken.push(itemInstance.getDisplayName());
      totalItems += itemInstance.quantity || 1;
    } else {
      // Normal item pickup - try to add to inventory
      const addResult = InventoryManager.addItem(player, itemInstance);
      if (addResult.success) {
        // Remove from container
        container.inventory.splice(i, 1);
        itemsTaken.push(itemInstance.getDisplayName());
        totalItems += itemInstance.quantity || 1;
      } else {
        failures.push(itemInstance.getDisplayName());
      }
    }
  }

  // Save player inventory if we took anything
  if (itemsTaken.length > 0) {
    const serialized = InventorySerializer.serializeInventory(player);
    playerDB.updatePlayerInventory(player.username, serialized);
  }

  // Build result message
  if (itemsTaken.length === 0) {
    player.send('\n' + colors.error(`You couldn't take anything from the ${container.name}.\n`));
    return;
  }

  let message = colors.success(`You take everything from the ${container.name}:\n`);
  for (const itemName of itemsTaken) {
    message += colors.dim(`  - ${itemName}\n`);
  }

  if (failures.length > 0) {
    message += colors.warning(`\nCouldn't take:\n`);
    for (const itemName of failures) {
      message += colors.dim(`  - ${itemName}\n`);
    }
  }

  // Show updated encumbrance
  const stats = InventoryManager.getInventoryStats(player);
  message += '\n' + colors.dim(`Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs | Slots: ${stats.slots.current}/${stats.slots.max}`);

  player.send('\n' + message + '\n');

  // Announce to other players
  if (context.allPlayers) {
    const otherPlayers = Array.from(context.allPlayers).filter(p =>
      p.currentRoom === player.currentRoom &&
      p.username !== player.username
    );
    if (otherPlayers.length > 0) {
      const announcement = `${player.username} loots the ${container.name}.`;
      otherPlayers.forEach(p => p.send('\n' + colors.dim(announcement) + '\n'));
    }
  }

  // Check if container is now empty
  if (container.inventory.length === 0 && container.containerType === 'npc_corpse') {
    player.send(colors.dim(`The ${container.name} is now empty.\n`));
  }
}

/**
 * Find a container (like corpse) in room by keywords
 * @param {Object} room - Room object
 * @param {string} keyword - Keyword to search for
 * @returns {Object|null} Container object or null
 */
function findContainerInRoom(room, keyword) {
  if (!room.items || room.items.length === 0) {
    return null;
  }

  const normalizedKeyword = keyword.toLowerCase();

  for (const item of room.items) {
    // Check if item is a container (has inventory property)
    if (!item.inventory) {
      continue;
    }

    // Check item name
    if (item.name && item.name.toLowerCase().includes(normalizedKeyword)) {
      return item;
    }

    // Check keywords
    if (item.keywords && item.keywords.some(kw => kw.toLowerCase() === normalizedKeyword || kw.toLowerCase().includes(normalizedKeyword))) {
      return item;
    }
  }

  return null;
}

/**
 * Find an item in container by keyword
 * @param {Object} container - Container object with inventory
 * @param {string} keyword - Keyword to search for
 * @returns {Object|null} {item, index} or null
 */
function findItemInContainer(container, keyword) {
  if (!container.inventory || container.inventory.length === 0) {
    return null;
  }

  const normalizedKeyword = keyword.toLowerCase();

  for (let i = 0; i < container.inventory.length; i++) {
    const item = container.inventory[i];
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

/**
 * Execute the get command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Get what? Try "get [item]", "get [qty] [item]", "get all [item]", or "get [item] from [container]"\n'));
    return;
  }

  // Check for "get X from Y" pattern first
  const fromIndex = args.findIndex(arg => arg.toLowerCase() === 'from');
  if (fromIndex !== -1 && fromIndex > 0) {
    // Handle "get item from container" syntax
    return executeGetFromContainer(player, args, context, fromIndex);
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
        itemToPickup = item; // Keep reference to room item
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
      const pickupResult = itemInstance.onPickup(player, room);

      // Handle both old boolean return and new object return
      if (pickupResult === false || (typeof pickupResult === 'object' && !pickupResult.success)) {
        const errorMsg = (typeof pickupResult === 'object' && pickupResult.message)
          ? pickupResult.message
          : `You can't pick up ${itemInstance.name} right now.`;
        player.send('\n' + colors.error(errorMsg + '\n'));
        return;
      }

      // Check if item has custom pickup behavior (like currency auto-conversion)
      const preventAddToInventory = (typeof pickupResult === 'object' && pickupResult.preventAddToInventory) || false;
      const customMessage = (typeof pickupResult === 'object' && pickupResult.message) || null;

      if (preventAddToInventory) {
        // Item handled its own pickup logic (e.g., currency converted to wallet)
        // Remove from room
        if (shouldRemoveFromRoom) {
          room.items.splice(index, 1);
        }

        // Display custom message
        if (customMessage) {
          player.send('\n' + colors.success(customMessage + '\n'));
        }

        // Show wallet for currency
        const { ItemType } = require('../../items/schemas/ItemTypes');
        if (itemInstance.itemType === ItemType.CURRENCY) {
          const CurrencyManager = require('../../systems/economy/CurrencyManager');
          const wallet = CurrencyManager.getWallet(player);
          player.send(colors.info(`Wallet: ${CurrencyManager.format(wallet)}\n`));
        }

        // Announce to room
        if (context.allPlayers) {
          const roomMessage = colors.info(`${player.username} picks up ${itemInstance.getDisplayName()}.\n`);
          for (const p of context.allPlayers) {
            if (p !== player && p.currentRoom === player.currentRoom && p.send) {
              p.send(roomMessage);
            }
          }
        }

        return;
      }

      // Normal item pickup - check encumbrance
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
  description: 'Pick up an item from the current room or from a container',
  usage: 'get <item> | get <qty> <item> | get all <item> | get <item> from <container> | get all from <container>',
  execute
};
