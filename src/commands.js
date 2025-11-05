/**
 * Commands - Command handlers for the MUD
 * Each command is a function that takes (player, args, world, playerDB)
 */

const colors = require('./colors');
const logger = require('./logger');
const { isAdminCommand, executeAdminCommand } = require('./admin/chatBinding');

// Import shared utilities from commands/utils.js
const {
  oppositeDirection,
  findPlayerInRoom,
  checkAggressiveNPCs,
  movePlayer
} = require('./commands/utils');

// Import command registry
const registry = require('./commands/registry');

// Register modular commands
// Combat commands
const attackCommand = require('./commands/combat/attack');
registry.registerCommand(attackCommand);

// Core commands
const quitCommand = require('./commands/core/quit');
const helpCommand = require('./commands/core/help');
const whoCommand = require('./commands/core/who');
const inventoryCommand = require('./commands/core/inventory');
const describeCommand = require('./commands/core/describe');
const sayCommand = require('./commands/core/say');
const wumpcomCommand = require('./commands/core/wumpcom');
const lookCommand = require('./commands/core/look');
const examineCommand = require('./commands/core/examine');
const scoreCommand = require('./commands/core/score');
const getCommand = require('./commands/core/get');
const dropCommand = require('./commands/core/drop');
const kickCommand = require('./commands/core/kick');
const emoteCommand = require('./commands/core/emote');
registry.registerCommand(quitCommand);
registry.registerCommand(helpCommand);
registry.registerCommand(whoCommand);
registry.registerCommand(inventoryCommand);
registry.registerCommand(describeCommand);
registry.registerCommand(sayCommand);
registry.registerCommand(wumpcomCommand);
registry.registerCommand(lookCommand);
registry.registerCommand(examineCommand);
registry.registerCommand(scoreCommand);
registry.registerCommand(getCommand);
registry.registerCommand(dropCommand);
registry.registerCommand(kickCommand);
registry.registerCommand(emoteCommand);

// Movement commands
const movementCommands = require('./commands/movement/movement');
registry.registerCommand(movementCommands.north);
registry.registerCommand(movementCommands.south);
registry.registerCommand(movementCommands.east);
registry.registerCommand(movementCommands.west);
registry.registerCommand(movementCommands.up);
registry.registerCommand(movementCommands.down);

// Emote commands - load from registry
const emoteRegistry = require('./commands/emotes/registry');
emoteRegistry.forEach(descriptor => registry.registerCommand(descriptor));

// All commands are now registered in the registry above.
// The legacy commands object has been fully migrated.

/**
 * Parse and execute a command
 * @param {string} input - Raw command input from player
 * @param {Object} player - Player object
 * @param {Object} world - World object
 * @param {Object} playerDB - PlayerDB object
 * @param {Set} allPlayers - Set of all connected players (optional)
 * @param {Map} activeInteractions - Map of active interactions (optional)
 * @param {Object} combatEngine - CombatEngine instance (optional)
 * @param {Object} adminSystem - Admin system components (optional)
 */
function parseCommand(input, player, world, playerDB, allPlayers = null, activeInteractions = null, combatEngine = null, adminSystem = null) {
  const trimmed = input.trim();
  if (!trimmed) {
    return; // Ignore empty commands
  }

  // Check for admin commands (starting with @)
  if (adminSystem && isAdminCommand(trimmed)) {
    const context = {
      adminService: adminSystem.adminService,
      rateLimiter: adminSystem.rateLimiter,
      allPlayers: allPlayers,
      world: world,
      playerDB: playerDB,
      combatEngine: combatEngine
    };
    executeAdminCommand(trimmed, player, context);
    return;
  }

  // Handle "sorry" for wumpy interaction
  if (trimmed.toLowerCase() === 'sorry' || trimmed.toLowerCase() === 'say sorry') {
    const room = world.getRoom(player.currentRoom);
    if (room && room.npcs) {
      for (const npcId of room.npcs) {
        const interactionKey = `${player.currentRoom}_${npcId}`;
        if (activeInteractions && activeInteractions.has(interactionKey)) {
          const interaction = activeInteractions.get(interactionKey);
          if (interaction.player === player.username) {
            clearTimeout(interaction.timer);
            clearInterval(interaction.dialogueInterval);
            activeInteractions.delete(interactionKey);
            const npc = world.getNPC(npcId);
            player.send('\n' + colors.npcSay(`The ${npc.name} says, "Thank you for saying sorry!"\n`));
            return;
          }
        }
      }
    }
  }

  // Split command and arguments
  const parts = trimmed.split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Build context object for registry-based commands
  const context = {
    world,
    playerDB,
    allPlayers,
    activeInteractions,
    combatEngine
  };

  // Look up command in registry
  const registeredCommand = registry.getCommand(commandName);
  if (!registeredCommand) {
    player.send('\n' + colors.error(`Unknown command: ${commandName}\n`) + colors.hint(`Type 'help' for a list of commands.\n`));
    return;
  }

  try {
    // Check guard if present
    if (registeredCommand.guard) {
      const guardResult = registeredCommand.guard(player, args, context);
      if (!guardResult.allowed) {
        player.send('\n' + colors.error(guardResult.reason || 'You cannot use this command right now.\n'));
        return;
      }
    }

    // Execute the command
    registeredCommand.execute(player, args, context);
  } catch (err) {
    logger.error(`Error executing command '${commandName}':`, err);
    player.send('\n' + colors.error('An error occurred while processing that command.\n'));
  }
}

module.exports = {
  parseCommand,
  // Re-export utilities for backward compatibility
  oppositeDirection,
  findPlayerInRoom,
  checkAggressiveNPCs,
  movePlayer
};