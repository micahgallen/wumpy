/**
 * Guild Description Modifier Examples
 *
 * This module demonstrates how guild systems can add description modifiers
 * when players join guilds. Each guild adds a unique visual description
 * that appears when someone looks at the player.
 */

const PlayerDescriptionService = require('../../src/systems/description/PlayerDescriptionService');

/**
 * Guild modifier definitions
 * Each guild has a unique description that reflects its nature and style
 */
const GUILD_MODIFIERS = {
  warriors_guild: {
    text: 'The crimson tabard of the Warriors Guild marks them as a trained combatant. The stains suggest it\'s not just for show.',
    priority: 80
  },
  mages_guild: {
    text: 'The silver star of the Mages Guild adorns their robes, and arcane energy crackles faintly around their fingertips.',
    priority: 80
  },
  thieves_guild: {
    text: 'A skilled eye might notice the subtle hand signals they unconsciously make - the cant of the Thieves Guild.',
    priority: 75
  },
  healers_guild: {
    text: 'They wear the white and gold of the Healers Guild. An aura of calm competence surrounds them like a well-practiced bedside manner.',
    priority: 80
  },
  rangers_guild: {
    text: 'Their movements are quiet and economical, marked with the leaf-green badge of the Rangers Guild. They probably know seventeen ways to kill you with a pine cone.',
    priority: 80
  },
  merchants_guild: {
    text: 'The scales-and-coin symbol of the Merchants Guild gleams on their vest. They\'re probably calculating the resale value of your equipment right now.',
    priority: 75
  },
  bards_guild: {
    text: 'The lute symbol of the Bards Guild is embroidered on their sleeve. They look like the sort who might break into song at any moment. Be warned.',
    priority: 80
  },
  necromancers_guild: {
    text: 'The black robes of the Necromancers Guild seem to absorb light. The faint smell of formaldehyde follows them, which is either professional dedication or poor hygiene.',
    priority: 85
  }
};

/**
 * Add a guild modifier to a player
 * Call this when a player joins a guild
 *
 * @param {Object} player - The player object
 * @param {string} guildId - The guild identifier (e.g., 'warriors_guild')
 * @param {Object} playerDB - PlayerDB instance for persistence
 * @returns {boolean} Success
 */
function addGuildModifier(player, guildId, playerDB) {
  const modifier = GUILD_MODIFIERS[guildId];

  if (!modifier) {
    console.error(`Unknown guild: ${guildId}`);
    return false;
  }

  // Remove any existing guild modifier first
  removeAllGuildModifiers(player, playerDB);

  // Add the new guild modifier
  PlayerDescriptionService.addDescriptionModifier(
    player,
    modifier.text,
    `guild_${guildId}`,
    modifier.priority,
    playerDB
  );

  return true;
}

/**
 * Remove a specific guild modifier from a player
 * Call this when a player leaves a guild
 *
 * @param {Object} player - The player object
 * @param {string} guildId - The guild identifier
 * @param {Object} playerDB - PlayerDB instance for persistence
 */
function removeGuildModifier(player, guildId, playerDB) {
  PlayerDescriptionService.removeDescriptionModifier(
    player,
    `guild_${guildId}`,
    playerDB
  );
}

/**
 * Remove all guild modifiers from a player
 * Useful when implementing guild switching
 *
 * @param {Object} player - The player object
 * @param {Object} playerDB - PlayerDB instance for persistence
 */
function removeAllGuildModifiers(player, playerDB) {
  if (!player.descriptionModifiers) {
    return;
  }

  // Remove all modifiers that start with 'guild_'
  player.descriptionModifiers = player.descriptionModifiers.filter(
    m => !m.source.startsWith('guild_')
  );

  if (playerDB) {
    playerDB.savePlayer(player);
  }
}

/**
 * Check if a player has a guild modifier
 *
 * @param {Object} player - The player object
 * @param {string} guildId - The guild identifier
 * @returns {boolean}
 */
function hasGuildModifier(player, guildId) {
  return PlayerDescriptionService.hasDescriptionModifier(player, `guild_${guildId}`);
}

/**
 * Get list of available guilds
 *
 * @returns {Array<string>} Array of guild IDs
 */
function getAvailableGuilds() {
  return Object.keys(GUILD_MODIFIERS);
}

/**
 * Get guild modifier info
 *
 * @param {string} guildId - The guild identifier
 * @returns {Object|null} Modifier info or null
 */
function getGuildModifierInfo(guildId) {
  return GUILD_MODIFIERS[guildId] || null;
}

// Example usage in a guild join command:
//
// function executeJoinGuild(player, args, context) {
//   const guildId = args[0];
//
//   if (!getAvailableGuilds().includes(guildId)) {
//     player.send('That guild doesn\'t exist.');
//     return;
//   }
//
//   if (hasGuildModifier(player, guildId)) {
//     player.send('You\'re already a member of this guild!');
//     return;
//   }
//
//   // Join the guild
//   player.guild = guildId;
//   addGuildModifier(player, guildId, context.playerDB);
//
//   player.send(`Welcome to the ${guildId.replace('_', ' ')}!`);
// }

module.exports = {
  GUILD_MODIFIERS,
  addGuildModifier,
  removeGuildModifier,
  removeAllGuildModifiers,
  hasGuildModifier,
  getAvailableGuilds,
  getGuildModifierInfo
};
