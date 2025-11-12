/**
 * Put Command - Place items into containers
 *
 * Supports putting items from player inventory into containers.
 * Handles capacity checks, stacking, and validation.
 *
 * Syntax:
 * - put <item> in <container>
 * - put all in <container>
 */

const colors = require('../../colors');
const { findContainer } = require('../../systems/containers/ContainerFinder');
const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const ItemRegistry = require('../../items/ItemRegistry');
const config = require('../../config/itemsConfig');

// Get maximum stack size from config
const MAX_STACK_SIZE = config.stacking?.defaultStackSize || 99;

/**
 * Execute put command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length < 3) {
    player.send('\n' + colors.error('Put what in what?\n'));
    player.send(colors.hint('Usage: put <item> in <container>\n'));
    player.send(colors.hint('Usage: put all in <container>\n'));
    return;
  }

  // Parse command: "put <item> in <container>"
  const inIndex = args.findIndex(arg => arg.toLowerCase() === 'in' || arg.toLowerCase() === 'into');

  if (inIndex === -1) {
    player.send('\n' + colors.error('Put what in what?\n'));
    player.send(colors.hint('Usage: put <item> in <container>\n'));
    return;
  }

  const itemKeyword = args.slice(0, inIndex).join(' ').toLowerCase();
  const containerKeyword = args.slice(inIndex + 1).join(' ').toLowerCase();

  if (!itemKeyword || !containerKeyword) {
    player.send('\n' + colors.error('Put what in what?\n'));
    return;
  }

  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Find the target container
  const containerResult = findContainer(containerKeyword, room, player);

  if (!containerResult) {
    player.send('\n' + colors.error(`You don't see "${args.slice(inIndex + 1).join(' ')}" here.\n`));
    return;
  }

  const { container, definition, type, containerId } = containerResult;

  // Handle "put all in <container>"
  if (itemKeyword === 'all') {
    handlePutAll(player, container, definition, type, containerId, allPlayers);
    return;
  }

  // Find the item in player's inventory
  const item = InventoryManager.findItemByKeyword(player, itemKeyword);

  if (!item) {
    player.send('\n' + colors.error(`You don't have "${args.slice(0, inIndex).join(' ')}".\n`));
    return;
  }

  // Put the item in the container
  handlePutItem(player, item, container, definition, type, containerId, allPlayers);
}

/**
 * Handle putting a single item into a container
 */
function handlePutItem(player, item, container, definition, type, containerId, allPlayers) {
  // Validate item can be put (not equipped, etc.)
  if (item.isEquipped) {
    player.send('\n' + colors.error(`You must unequip ${item.name} before putting it away.\n`));
    return;
  }

  // Check if item can be dropped (quest items, etc.)
  if (item.isDroppable === false) {
    // Check if container explicitly allows quest items
    const allowsQuestItems = (type === 'room' && definition?.allowQuestItems) ||
                             (type !== 'room' && container?.allowQuestItems);

    if (!allowsQuestItems) {
      if (item.isQuestItem) {
        player.send('\n' + colors.error(`You can't put that quest item in a container.\n`));
      } else {
        player.send('\n' + colors.error(`You can't put that item in a container.\n`));
      }
      return;
    }
  }

  // Handle room containers
  if (type === 'room') {
    const result = putItemInRoomContainer(player, item, containerId);

    if (!result.success) {
      player.send('\n' + colors.error(result.message + '\n'));
      return;
    }

    // Remove from player inventory
    const removed = InventoryManager.removeItem(player, item.instanceId);

    if (!removed) {
      // Rollback - remove from container
      const containerObj = RoomContainerManager.getContainer(containerId);
      if (containerObj) {
        if (result.stacked) {
          // Item was stacked - find by definitionId and reduce quantity
          const stack = containerObj.inventory.find(i =>
            i.definitionId === item.definitionId && i.isStackable
          );
          if (stack) {
            stack.quantity = (stack.quantity || 1) - (item.quantity || 1);
            // Remove stack if quantity reaches zero
            if (stack.quantity <= 0) {
              const stackIndex = containerObj.inventory.indexOf(stack);
              containerObj.inventory.splice(stackIndex, 1);
            }
          }
        } else {
          // Item was added as new entry - find by instanceId and remove
          const itemIndex = containerObj.inventory.findIndex(i => i.instanceId === item.instanceId);
          if (itemIndex !== -1) {
            containerObj.inventory.splice(itemIndex, 1);
          }
        }
      }
      player.send('\n' + colors.error('Failed to remove item from inventory.\n'));
      return;
    }

    // Success
    let message = `You put ${item.name}`;
    if (item.quantity > 1) {
      message += ` (x${item.quantity})`;
    }
    message += ` in ${definition.name}.`;

    player.send('\n' + colors.success(message + '\n'));

    // Announce to room
    if (allPlayers && definition) {
      const announcement = `${player.getDisplayName()} puts ${item.name} in ${definition.name}.`;
      for (const p of allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }

  // Handle portable containers
  if (type === 'portable' || type === 'inventory') {
    const result = putItemInPortableContainer(player, item, container);

    if (!result.success) {
      player.send('\n' + colors.error(result.message + '\n'));
      return;
    }

    // Remove from player inventory
    const removed = InventoryManager.removeItem(player, item.instanceId);

    if (!removed) {
      // Rollback - remove from container
      if (result.stacked) {
        // Item was stacked - find by definitionId and reduce quantity
        const stack = container.inventory.find(i =>
          i.definitionId === item.definitionId && i.isStackable
        );
        if (stack) {
          stack.quantity = (stack.quantity || 1) - (item.quantity || 1);
          // Remove stack if quantity reaches zero
          if (stack.quantity <= 0) {
            const stackIndex = container.inventory.indexOf(stack);
            container.inventory.splice(stackIndex, 1);
          }
        }
      } else {
        // Item was added as new entry - find by instanceId and remove
        const itemIndex = container.inventory.findIndex(i => i.instanceId === item.instanceId);
        if (itemIndex !== -1) {
          container.inventory.splice(itemIndex, 1);
        }
      }
      player.send('\n' + colors.error('Failed to remove item from inventory.\n'));
      return;
    }

    // Success
    let message = `You put ${item.name}`;
    if (item.quantity > 1) {
      message += ` (x${item.quantity})`;
    }
    message += ` in ${container.name}.`;

    player.send('\n' + colors.success(message + '\n'));

    // Announce to room
    if (allPlayers && container.name) {
      const announcement = `${player.getDisplayName()} puts ${item.name} in ${container.name}.`;
      for (const p of allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }
}

/**
 * Handle putting all items into a container
 */
function handlePutAll(player, container, definition, type, containerId, allPlayers) {
  if (!player.inventory || player.inventory.length === 0) {
    player.send('\n' + colors.info('You have nothing to put away.\n'));
    return;
  }

  // Check if container allows quest items
  const allowsQuestItems = (type === 'room' && definition?.allowQuestItems) ||
                           (type !== 'room' && container?.allowQuestItems);

  // Filter out equipped items and non-droppable items (unless container allows them)
  const itemsToPut = player.inventory.filter(item => {
    if (item.isEquipped) return false;
    if (item.isDroppable === false && !allowsQuestItems) return false;
    return true;
  });

  if (itemsToPut.length === 0) {
    player.send('\n' + colors.info('You have nothing to put away (all items are equipped or cannot be stored).\n'));
    return;
  }

  let putCount = 0;
  let failedItems = [];

  // Try to put each item
  for (const item of itemsToPut) {
    let result;

    if (type === 'room') {
      result = putItemInRoomContainer(player, item, containerId, true);
    } else {
      result = putItemInPortableContainer(player, item, container, true);
    }

    if (result.success) {
      // Remove from player inventory
      const removed = InventoryManager.removeItem(player, item.instanceId);
      if (removed) {
        putCount++;
      }
    } else {
      failedItems.push({ item, reason: result.message });
    }
  }

  // Report results
  if (putCount > 0) {
    const containerName = type === 'room' ? definition.name : container.name;
    player.send('\n' + colors.success(`You put ${putCount} item(s) in ${containerName}.\n`));

    // Announce to room
    if (allPlayers) {
      const announcement = `${player.getDisplayName()} puts several items in ${containerName}.`;
      for (const p of allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }
  }

  if (failedItems.length > 0) {
    player.send(colors.warning(`Failed to put ${failedItems.length} item(s):\n`));
    for (const { item, reason } of failedItems.slice(0, 3)) {
      player.send(colors.dim(`  - ${item.name}: ${reason}\n`));
    }
    if (failedItems.length > 3) {
      player.send(colors.dim(`  ... and ${failedItems.length - 3} more\n`));
    }
  }
}

/**
 * Put an item in a room container
 */
function putItemInRoomContainer(player, item, containerId, silent = false) {
  const containerObj = RoomContainerManager.getContainer(containerId);

  if (!containerObj) {
    return { success: false, message: 'Container not found.' };
  }

  const definition = RoomContainerManager.getDefinition(containerObj.definitionId);

  if (!definition) {
    return { success: false, message: 'Container definition not found.' };
  }

  // Check if container is open
  if (!containerObj.isOpen) {
    return {
      success: false,
      message: `${definition.name} is closed.`
    };
  }

  // Check capacity (slot-based)
  if (containerObj.inventory.length >= containerObj.capacity) {
    return {
      success: false,
      message: `${definition.name} is full.`
    };
  }

  // Check if item is stackable and can stack with existing items
  if (item.isStackable) {
    const existingStack = containerObj.inventory.find(i =>
      i.definitionId === item.definitionId &&
      i.isStackable
    );

    if (existingStack) {
      // Check if stacking would exceed max stack size
      const newQuantity = (existingStack.quantity || 1) + (item.quantity || 1);
      if (newQuantity > MAX_STACK_SIZE) {
        return {
          success: false,
          message: `Cannot stack - would exceed maximum stack size of ${MAX_STACK_SIZE}.`
        };
      }

      // Stack the items
      existingStack.quantity = newQuantity;
      containerObj.modifiedAt = Date.now();
      return { success: true, stacked: true };
    }
  }

  // Add item to container inventory
  containerObj.inventory.push(item);
  containerObj.modifiedAt = Date.now();

  return { success: true };
}

/**
 * Put an item in a portable container
 */
function putItemInPortableContainer(player, item, container, silent = false) {
  // Validate container
  if (!container || !container.inventory) {
    return { success: false, message: 'Invalid container.' };
  }

  // Check if container is open
  if (!container.isOpen) {
    return {
      success: false,
      message: `${container.name} is closed.`
    };
  }

  // Check capacity
  const capacity = container.capacity || 20;
  if (container.inventory.length >= capacity) {
    return {
      success: false,
      message: `${container.name} is full.`
    };
  }

  // Check if item is stackable and can stack with existing items
  if (item.isStackable) {
    const existingStack = container.inventory.find(i =>
      i.definitionId === item.definitionId &&
      i.isStackable
    );

    if (existingStack) {
      // Check if stacking would exceed max stack size
      const newQuantity = (existingStack.quantity || 1) + (item.quantity || 1);
      if (newQuantity > MAX_STACK_SIZE) {
        return {
          success: false,
          message: `Cannot stack - would exceed maximum stack size of ${MAX_STACK_SIZE}.`
        };
      }

      // Stack the items
      existingStack.quantity = newQuantity;
      return { success: true, stacked: true };
    }
  }

  // Add item to container inventory
  container.inventory.push(item);

  return { success: true };
}

module.exports = {
  name: 'put',
  description: 'Put items in a container',
  usage: 'put <item> in <container> | put all in <container>',
  execute
};
