/**
 * Open Command - Open containers and doors
 *
 * Supports both room containers (fixed) and portable containers (corpses, bags)
 */

const colors = require('../../colors');
const { findContainer } = require('../../systems/containers/ContainerFinder');
const RoomContainerManager = require('../../systems/containers/RoomContainerManager');

/**
 * Execute open command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Open what?\n'));
    player.send(colors.hint('Usage: open <container>\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Find the container
  const result = findContainer(target, room, player);

  if (!result) {
    player.send('\n' + colors.error(`You don't see "${args.join(' ')}" here.\n`));
    return;
  }

  const { container, definition, type, containerId } = result;

  // Handle room containers
  if (type === 'room') {
    // Use RoomContainerManager to open the container
    const openResult = RoomContainerManager.openContainer(containerId, player);

    if (!openResult.success) {
      player.send('\n' + colors.error(openResult.message + '\n'));
      return;
    }

    // Success - show message
    player.send('\n' + colors.success(openResult.message + '\n'));

    // Show contents if configured
    const openedContainer = openResult.container;
    if (openedContainer && openedContainer.inventory && openedContainer.inventory.length > 0) {
      player.send(colors.info('Inside you see:\n'));
      const ItemRegistry = require('../../items/ItemRegistry');

      for (const item of openedContainer.inventory) {
        const itemDef = ItemRegistry.getItem(item.definitionId);
        if (itemDef) {
          let itemLine = '  - ' + itemDef.name;
          if (item.quantity > 1) {
            itemLine += colors.dim(` x${item.quantity}`);
          }
          player.send(itemLine + '\n');
        }
      }
    } else {
      player.send(colors.dim('It is empty.\n'));
    }

    // Announce to room
    if (allPlayers && definition) {
      const announcement = `${player.getDisplayName()} opens ${definition.name}.`;
      for (const p of allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }

  // Handle portable containers (corpses, bags, etc.)
  if (type === 'portable' || type === 'inventory') {
    // Validate container has required properties
    if (!container || !container.name) {
      player.send('\n' + colors.error('That container appears to be invalid.\n'));
      return;
    }

    // Check if already open
    if (container.isOpen) {
      player.send('\n' + colors.info(`${container.name} is already open.\n`));
      return;
    }

    // Check if locked (for future portable container locks)
    if (container.isLocked) {
      player.send('\n' + colors.error(`${container.name} is locked.\n`));
      return;
    }

    // Open the container
    container.isOpen = true;

    player.send('\n' + colors.success(`You open ${container.name}.\n`));

    // Show contents
    if (container.inventory && container.inventory.length > 0) {
      player.send(colors.info('Inside you see:\n'));
      const ItemRegistry = require('../../items/ItemRegistry');

      for (const item of container.inventory) {
        const itemDef = ItemRegistry.getItem(item.definitionId);
        if (itemDef) {
          let itemLine = '  - ' + itemDef.name;
          if (item.quantity > 1) {
            itemLine += colors.dim(` x${item.quantity}`);
          }
          player.send(itemLine + '\n');
        }
      }
    } else {
      player.send(colors.dim('It is empty.\n'));
    }

    // Announce to room
    if (allPlayers && container.name) {
      const announcement = `${player.getDisplayName()} opens ${container.name}.`;
      for (const p of allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }
}

module.exports = {
  name: 'open',
  description: 'Open a container',
  usage: 'open <container>',
  execute
};
