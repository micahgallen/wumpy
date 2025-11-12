/**
 * Unlock Command - Unlock locked containers
 *
 * Supports key-based unlocking with automatic key detection or explicit key specification.
 *
 * Syntax:
 * - unlock <container>           (auto-detect key)
 * - unlock <container> with <key> (explicit key)
 */

const colors = require('../../colors');
const { findContainer } = require('../../systems/containers/ContainerFinder');
const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
const InventoryManager = require('../../systems/inventory/InventoryManager');

/**
 * Execute unlock command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Unlock what?\n'));
    player.send(colors.hint('Usage: unlock <container>\n'));
    player.send(colors.hint('Usage: unlock <container> with <key>\n'));
    return;
  }

  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Parse command: check if "with <key>" is specified
  const withIndex = args.findIndex(arg => arg.toLowerCase() === 'with' || arg.toLowerCase() === 'using');

  let containerKeyword, keyKeyword;

  if (withIndex !== -1) {
    // Explicit key: "unlock chest with brass key"
    containerKeyword = args.slice(0, withIndex).join(' ').toLowerCase();
    keyKeyword = args.slice(withIndex + 1).join(' ').toLowerCase();
  } else {
    // Auto-detect key: "unlock chest"
    containerKeyword = args.join(' ').toLowerCase();
    keyKeyword = null;
  }

  if (!containerKeyword) {
    player.send('\n' + colors.error('Unlock what?\n'));
    return;
  }

  // Find the container
  const containerResult = findContainer(containerKeyword, room, player);

  if (!containerResult) {
    player.send('\n' + colors.error(`You don't see "${containerKeyword}" here.\n`));
    return;
  }

  const { container, definition, type, containerId } = containerResult;

  // Only room containers support locks currently
  if (type !== 'room') {
    player.send('\n' + colors.info(`${container.name} doesn't have a lock.\n`));
    return;
  }

  // Check if container is locked
  if (!container.isLocked) {
    player.send('\n' + colors.info(`${definition.name} is already unlocked.\n`));
    return;
  }

  // Check if container requires a key
  if (!definition.requiresKey && !definition.keyItemId) {
    player.send('\n' + colors.error(`${definition.name} cannot be unlocked (no key defined).\n`));
    return;
  }

  // Find the required key
  let keyItem = null;

  if (keyKeyword) {
    // Player specified a key - find it
    keyItem = InventoryManager.findItemByKeyword(player, keyKeyword);

    if (!keyItem) {
      player.send('\n' + colors.error(`You don't have "${keyKeyword}".\n`));
      return;
    }

    // Check if this is the correct key
    if (keyItem.definitionId !== definition.keyItemId) {
      player.send('\n' + colors.error(`${keyItem.name} doesn't fit the lock.\n`));
      return;
    }
  } else {
    // Auto-detect key in player inventory
    if (!player.inventory || player.inventory.length === 0) {
      player.send('\n' + colors.error(`You don't have the key to unlock ${definition.name}.\n`));
      player.send(colors.hint(`Required key: ${definition.keyItemId}\n`));
      return;
    }

    keyItem = player.inventory.find(item => item.definitionId === definition.keyItemId);

    if (!keyItem) {
      player.send('\n' + colors.error(`You don't have the key to unlock ${definition.name}.\n`));
      player.send(colors.hint(`Required key: ${definition.keyItemId}\n`));
      return;
    }
  }

  // Unlock the container using RoomContainerManager
  const result = RoomContainerManager.unlockContainer(containerId, player, keyItem);

  if (!result.success) {
    player.send('\n' + colors.error(result.message + '\n'));
    return;
  }

  // Success
  player.send('\n' + colors.success(result.message + '\n'));

  // Announce to room
  if (allPlayers && definition) {
    const announcement = `${player.getDisplayName()} unlocks ${definition.name}.`;
    for (const p of allPlayers) {
      if (p !== player && p.currentRoom === player.currentRoom) {
        p.send('\n' + colors.dim(announcement + '\n'));
      }
    }
  }
}

module.exports = {
  name: 'unlock',
  description: 'Unlock a locked container',
  usage: 'unlock <container> | unlock <container> with <key>',
  execute
};
