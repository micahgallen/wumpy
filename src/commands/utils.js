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
      p.send('\n' + colors.action(`${player.username} leaves heading ${direction}.`) + '\n');
      p.sendPrompt();
    }
  }

  // Move the player
  player.currentRoom = destinationRoomId;
  playerDB.updatePlayerRoom(player.username, destinationRoomId);

  // Broadcast enter message
  for (const p of allPlayers) {
    if (p.currentRoom === destinationRoomId && p.username !== player.username) {
      p.send('\n' + colors.action(`${player.username} arrives from ${oppositeDirection[direction]}.`) + '\n');
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

module.exports = {
  oppositeDirection,
  findPlayerInRoom,
  checkAggressiveNPCs,
  movePlayer
};
