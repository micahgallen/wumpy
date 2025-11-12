/**
 * Close Command - Close containers and doors
 *
 * Supports both room containers (fixed) and portable containers (corpses, bags)
 */

const colors = require('../../colors');
const { findContainer } = require('../../systems/containers/ContainerFinder');
const RoomContainerManager = require('../../systems/containers/RoomContainerManager');

/**
 * Execute close command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Close what?\n'));
    player.send(colors.hint('Usage: close <container>\n'));
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
    // Use RoomContainerManager to close the container
    const closeResult = RoomContainerManager.closeContainer(containerId, player);

    if (!closeResult.success) {
      player.send('\n' + colors.error(closeResult.message + '\n'));
      return;
    }

    // Success - show message
    player.send('\n' + colors.success(closeResult.message + '\n'));

    // Announce to room
    if (allPlayers && definition) {
      const announcement = `${player.getDisplayName()} closes ${definition.name}.`;
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
    // Validate container has required properties
    if (!container || !container.name) {
      player.send('\n' + colors.error('That container appears to be invalid.\n'));
      return;
    }

    // Check if already closed
    if (!container.isOpen) {
      player.send('\n' + colors.info(`${container.name} is already closed.\n`));
      return;
    }

    // Close the container
    container.isOpen = false;

    player.send('\n' + colors.success(`You close ${container.name}.\n`));

    // Announce to room
    if (allPlayers && container.name) {
      const announcement = `${player.getDisplayName()} closes ${container.name}.`;
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
  name: 'close',
  description: 'Close a container',
  usage: 'close <container>',
  execute
};
