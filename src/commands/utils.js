/**
 * Command Utilities
 * Shared helper functions used across multiple commands
 * Extracted from src/commands.js to support modular command architecture
 */

const colors = require('../colors');

/**
 * Mapping of directions to their opposite for arrival messages
 */
const oppositeDirection = {
  north: 'the south',
  south: 'the north',
  east: 'the west',
  west: 'the east',
  up: 'below',
  down: 'above'
};

/**
 * Find a player in the same room by name
 * @param {string} playerName - Name to search for
 * @param {Object} player - The player doing the search
 * @param {Set} allPlayers - Set of all connected players
 * @returns {Object|null} Player object or null if not found
 */
function findPlayerInRoom(playerName, player, allPlayers) {
  for (const p of allPlayers) {
    if (p.username.toLowerCase() === playerName.toLowerCase() && p.currentRoom === player.currentRoom) {
      return p;
    }
  }
  return null;
}

/**
 * Check for aggressive NPCs in player's room and initiate combat if needed
 * @param {Object} player - Player object
 * @param {Object} world - World object
 * @param {Object} combatEngine - CombatEngine instance
 */
function checkAggressiveNPCs(player, world, combatEngine) {
  const room = world.getRoom(player.currentRoom);
  if (room && room.npcs) {
    for (const npcId of room.npcs) {
      const npc = world.getNPC(npcId);
      if (npc && npc.aggressive) {
        const isPlayerInCombat = combatEngine.activeCombats.some(c => c.participants.some(p => p.username === player.username));
        if (!isPlayerInCombat) {
          combatEngine.initiateCombat([npc, player]);
          break; // For now, only one NPC attacks
        }
      }
    }
  }
}

/**
 * Move player in a direction
 * @param {Object} player - Player object
 * @param {string} direction - Direction to move
 * @param {Object} world - World object
 * @param {Object} playerDB - PlayerDB object
 * @param {Set} allPlayers - Set of all connected players
 * @param {Object} combatEngine - CombatEngine instance
 */
function movePlayer(player, direction, world, playerDB, allPlayers, combatEngine) {
  const originalRoomId = player.currentRoom;
  const destinationRoomId = world.findExit(originalRoomId, direction);

  if (!destinationRoomId) {
    player.send('\n' + colors.error('You cannot go that way.\n'));
    return;
  }

  const destinationRoom = world.getRoom(destinationRoomId);
  if (!destinationRoom) {
    player.send('\n' + colors.error('That exit leads to nowhere. (Room not found)\n'));
    return;
  }

  // Broadcast leave message
  for (const p of allPlayers) {
    if (p.currentRoom === originalRoomId && p.username !== player.username) {
      p.send('\n' + colors.action(`${player.getDisplayName()} leaves heading ${direction}.`) + '\n');
      p.sendPrompt();
    }
  }

  // Move the player
  player.currentRoom = destinationRoomId;
  playerDB.updatePlayerRoom(player.username, destinationRoomId);

  // Broadcast enter message
  for (const p of allPlayers) {
    if (p.currentRoom === destinationRoomId && p.username !== player.username) {
      p.send('\n' + colors.action(`${player.getDisplayName()} arrives from ${oppositeDirection[direction]}.`) + '\n');
      p.sendPrompt();
    }
  }

  // Show the new room to the player who moved
  player.send('\n' + colors.info(`You move ${direction}.\n`));

  // Call look command from registry to show the new room
  const registry = require('./registry');
  const lookCommand = registry.getCommand('look');
  if (lookCommand) {
    lookCommand.execute(player, [], { world, playerDB: playerDB, allPlayers });
  }

  // Check for aggressive NPCs
  checkAggressiveNPCs(player, world, combatEngine);
}

/**
 * Find an item in player's inventory by keyword
 * Uses smart matching: exact matches take priority, then partial matches
 * Prevents false positives from single-letter keywords
 *
 * @param {Object} player - Player object with inventory
 * @param {string} keyword - Search keyword (already lowercased)
 * @returns {Object|null} Found item or null
 */
function findItemInInventory(player, keyword) {
  let item = null;
  let exactMatchItem = null;

  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
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
  return exactMatchItem || item;
}

module.exports = {
  oppositeDirection,
  findPlayerInRoom,
  checkAggressiveNPCs,
  movePlayer,
  findItemInInventory
};
