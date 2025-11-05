/**
 * Emote Factory
 * Creates command descriptors for emote commands
 */

const colors = require('../../colors');
const { findPlayerInRoom, broadcastEmote } = require('./emoteUtils');

/**
 * Resolve message (can be string or function)
 * @param {string|Function} msg - Message or message generator function
 * @param {Object} player - Player object
 * @param {Object|null} target - Target player (optional)
 * @returns {string} Resolved message
 */
function resolveMessage(msg, player, target = null) {
  if (typeof msg === 'function') {
    return msg(player, target);
  }
  return msg;
}

/**
 * Create an emote command descriptor
 * @param {Object} config - Emote configuration
 * @param {string} config.name - Command name (lowercase)
 * @param {Array<string>} [config.aliases] - Alternative command names
 * @param {Object} config.help - Help information
 * @param {string} config.help.description - Brief description
 * @param {string} [config.help.usage] - Usage pattern
 * @param {Array<string>} [config.help.examples] - Usage examples
 * @param {Object} config.messages - Message templates
 * @param {Object} config.messages.noTarget - Messages when no target specified
 * @param {string|Function} config.messages.noTarget.self - Message shown to player
 * @param {string|Function} config.messages.noTarget.room - Message shown to room
 * @param {Object} [config.messages.withTarget] - Messages when target specified (optional)
 * @param {string|Function} config.messages.withTarget.self - Message shown to player
 * @param {string|Function} config.messages.withTarget.target - Message shown to target
 * @param {string|Function} config.messages.withTarget.room - Message shown to room
 * @param {Object} [config.hooks] - Optional lifecycle hooks
 * @param {Function} [config.hooks.beforeExecute] - Called before emote executes
 * @param {Function} [config.hooks.afterExecute] - Called after emote executes
 * @returns {Object} Command descriptor
 */
function createEmote(config) {
  // Validate required fields
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Emote must have a name (string)');
  }
  if (!config.messages || !config.messages.noTarget) {
    throw new Error(`Emote '${config.name}' must have messages.noTarget`);
  }
  if (!config.messages.noTarget.self || !config.messages.noTarget.room) {
    throw new Error(`Emote '${config.name}' noTarget messages must have 'self' and 'room'`);
  }
  if (config.messages.withTarget) {
    if (!config.messages.withTarget.self || !config.messages.withTarget.target || !config.messages.withTarget.room) {
      throw new Error(`Emote '${config.name}' withTarget messages must have 'self', 'target', and 'room'`);
    }
  }

  const {
    name,
    aliases = [],
    help = {},
    messages,
    hooks = {}
  } = config;

  return {
    name,
    aliases,
    description: help.description || `Perform the ${name} emote`,
    usage: help.usage || `${name} [target]`,
    examples: help.examples || [],

    execute: (player, args, context) => {
      const { allPlayers } = context;

      // Call beforeExecute hook if present
      if (hooks.beforeExecute) {
        hooks.beforeExecute(player, args, context);
      }

      // Find target if specified
      const targetName = args.join(' ');
      const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

      if (targetName && !targetPlayer) {
        player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
        return;
      }

      // Get appropriate messages
      let selfMsg, targetMsg, roomMsg;

      if (targetPlayer && messages.withTarget) {
        selfMsg = resolveMessage(messages.withTarget.self, player, targetPlayer);
        targetMsg = resolveMessage(messages.withTarget.target, player, targetPlayer);
        roomMsg = resolveMessage(messages.withTarget.room, player, targetPlayer);
      } else {
        selfMsg = resolveMessage(messages.noTarget.self, player);
        roomMsg = resolveMessage(messages.noTarget.room, player);
        targetMsg = null;
      }

      // Broadcast the emote
      broadcastEmote(player, targetPlayer, allPlayers, selfMsg, targetMsg, roomMsg);

      // Call afterExecute hook if present
      if (hooks.afterExecute) {
        hooks.afterExecute(player, args, context);
      }
    }
  };
}

module.exports = createEmote;
