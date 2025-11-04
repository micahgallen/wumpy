/**
 * Movement Commands Module
 * Handles all directional movement commands (north, south, east, west, up, down)
 * and their single-letter aliases (n, s, e, w, u, d)
 */

const { movePlayer } = require('../utils');

/**
 * Create a movement command descriptor for a given direction
 * @param {string} direction - The direction to move (north, south, east, west, up, down)
 * @param {Array<string>} aliases - Array of aliases for this direction
 * @returns {Object} Command descriptor
 */
function createMovementCommand(direction, aliases = []) {
  return {
    name: direction,
    aliases,
    description: `Move ${direction}`,
    usage: direction,
    execute: (player, args, context) => {
      const { world, playerDB, allPlayers, combatEngine } = context;
      movePlayer(player, direction, world, playerDB, allPlayers, combatEngine);
    }
  };
}

// Export all movement command descriptors
module.exports = {
  north: createMovementCommand('north', ['n']),
  south: createMovementCommand('south', ['s']),
  east: createMovementCommand('east', ['e']),
  west: createMovementCommand('west', ['w']),
  up: createMovementCommand('up', ['u']),
  down: createMovementCommand('down', ['d'])
};
