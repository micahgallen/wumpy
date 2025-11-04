/**
 * Emotes Module - Data-driven emote commands
 * All predefined emotes (applaud, bow, cackle, etc.) use the same execution logic
 * but different emote definitions from utils.js
 */

const colors = require('../../colors');
const { findPlayerInRoom, getEmoteMessages, broadcastEmote, taunts } = require('../utils');

/**
 * Shared emote execution logic
 * @param {string} emoteName - The name of the emote (e.g., 'applaud', 'bow')
 * @param {Object} player - Player executing the emote
 * @param {Array} args - Command arguments (target player name if any)
 * @param {Object} context - Shared command context
 */
function executeEmote(emoteName, player, args, context) {
  const { allPlayers } = context;

  const targetName = args.join(' ');
  const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

  if (targetName && !targetPlayer) {
    player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
    return;
  }

  const messages = getEmoteMessages(emoteName, player, targetPlayer);
  broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);

  // Special handling for taunt - cycle through taunt index
  if (emoteName === 'taunt') {
    player.tauntIndex = (player.tauntIndex + 1) % taunts.length;
  }
}

/**
 * Create an emote command descriptor
 * @param {string} emoteName - The name of the emote
 * @param {string} description - Description for help text
 * @returns {Object} Command descriptor
 */
function createEmoteCommand(emoteName, description) {
  return {
    name: emoteName,
    aliases: [],
    description,
    usage: `${emoteName} [target]`,
    execute: (player, args, context) => executeEmote(emoteName, player, args, context)
  };
}

// Export all predefined emote commands
module.exports = {
  applaud: createEmoteCommand('applaud', 'Applaud enthusiastically'),
  bow: createEmoteCommand('bow', 'Bow gracefully'),
  cackle: createEmoteCommand('cackle', 'Cackle like a villain'),
  cheer: createEmoteCommand('cheer', 'Cheer loudly'),
  chuckle: createEmoteCommand('chuckle', 'Chuckle softly'),
  cry: createEmoteCommand('cry', 'Cry dramatically'),
  dance: createEmoteCommand('dance', 'Dance'),
  fart: createEmoteCommand('fart', 'Let one rip'),
  flex: createEmoteCommand('flex', 'Flex your muscles'),
  giggle: createEmoteCommand('giggle', 'Giggle'),
  groan: createEmoteCommand('groan', 'Groan'),
  growl: createEmoteCommand('growl', 'Growl menacingly'),
  hiccup: createEmoteCommand('hiccup', 'Hiccup'),
  grin: createEmoteCommand('grin', 'Grin'),
  kiss: createEmoteCommand('kiss', 'Blow a kiss'),
  pinch: createEmoteCommand('pinch', 'Pinch someone'),
  tip: createEmoteCommand('tip', 'Tip your hat'),
  taunt: createEmoteCommand('taunt', 'Taunt with a witty remark')
};
