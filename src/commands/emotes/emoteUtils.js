/**
 * Emote Utilities
 * Generic helper functions used by all emote commands
 */

const colors = require('../../colors');

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
 * Broadcast an emote to player, target, and room
 * @param {Object} player - Player performing the emote
 * @param {Object|null} target - Target player (optional)
 * @param {Set} allPlayers - Set of all connected players
 * @param {string} selfMessage - Message shown to the player
 * @param {string|null} targetMessage - Message shown to target (if target exists)
 * @param {string} roomMessage - Message shown to others in room
 */
function broadcastEmote(player, target, allPlayers, selfMessage, targetMessage, roomMessage) {
  if (target) {
    player.send(`\n${colors.emote(selfMessage)}\n`);
    target.send(`\n${colors.emote(targetMessage)}\n`);
    for (const p of allPlayers) {
      if (p.currentRoom === player.currentRoom && p.username !== player.username && p.username !== target.username) {
        p.send(`\n${colors.emote(roomMessage)}\n`);
        p.sendPrompt();
      }
    }
  } else {
    for (const p of allPlayers) {
      if (p.currentRoom === player.currentRoom) {
        if (p.username === player.username) {
          p.send(`\n${colors.emote(selfMessage)}\n`);
        } else {
          p.send(`\n${colors.emote(roomMessage)}\n`);
        }
        p.sendPrompt();
      }
    }
  }
}

module.exports = {
  findPlayerInRoom,
  broadcastEmote
};
