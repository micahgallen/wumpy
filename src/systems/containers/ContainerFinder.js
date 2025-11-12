/**
 * Container Finder Utility
 *
 * Shared utility for finding containers in rooms by keyword.
 * Supports both portable containers (corpses, bags) and room containers (fixed).
 */

/**
 * Finds a container in a room by keyword
 *
 * Search priority:
 * 1. Portable containers in room.items (corpses, bags, etc.)
 * 2. Fixed room containers (chests, barrels, etc.)
 * 3. Portable containers in player inventory (if player provided)
 *
 * @param {string} keyword - The keyword to search for
 * @param {Object} room - The room object
 * @param {Object} [player] - Optional player object (for inventory search)
 * @returns {Object|null} - {container, definition, type, containerId} or null
 *   - container: The container instance object
 *   - definition: The container definition (for room containers only)
 *   - type: 'portable' | 'room' | 'inventory'
 *   - containerId: The container ID (for room containers)
 */
function findContainer(keyword, room, player = null) {
  const normalizedKeyword = keyword.toLowerCase();

  // Check room.items first (portable containers - corpses, bags, etc.)
  if (room.items && room.items.length > 0) {
    for (const item of room.items) {
      // Check if item is a container (has inventory property)
      if (!item.inventory) {
        continue;
      }

      // Check item name
      if (item.name && item.name.toLowerCase().includes(normalizedKeyword)) {
        return { container: item, type: 'portable' };
      }

      // Check keywords
      if (item.keywords && item.keywords.some(kw =>
        kw.toLowerCase() === normalizedKeyword ||
        kw.toLowerCase().includes(normalizedKeyword)
      )) {
        return { container: item, type: 'portable' };
      }
    }
  }

  // Check room containers (fixed containers)
  const RoomContainerManager = require('./RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(room.id);

  for (const container of containers) {
    const definition = RoomContainerManager.getDefinition(container.definitionId);
    if (!definition) continue;

    // Check name
    if (definition.name && definition.name.toLowerCase().includes(normalizedKeyword)) {
      return {
        container,
        definition,
        type: 'room',
        containerId: container.id
      };
    }

    // Check keywords
    if (definition.keywords && definition.keywords.some(kw =>
      kw.toLowerCase() === normalizedKeyword ||
      kw.toLowerCase().includes(normalizedKeyword)
    )) {
      return {
        container,
        definition,
        type: 'room',
        containerId: container.id
      };
    }
  }

  // Check player inventory (if player provided)
  if (player && player.inventory && player.inventory.length > 0) {
    for (const item of player.inventory) {
      // Check if item is a container
      if (!item.inventory) {
        continue;
      }

      // Check item name
      if (item.name && item.name.toLowerCase().includes(normalizedKeyword)) {
        return { container: item, type: 'inventory' };
      }

      // Check keywords
      if (item.keywords && item.keywords.some(kw =>
        kw.toLowerCase() === normalizedKeyword ||
        kw.toLowerCase().includes(normalizedKeyword)
      )) {
        return { container: item, type: 'inventory' };
      }
    }
  }

  return null;
}

module.exports = {
  findContainer
};
