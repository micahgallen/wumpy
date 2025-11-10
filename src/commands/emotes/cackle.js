/**
 * Cackle Emote
 * Cackle like a villain
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'cackle',
  aliases: [],
  help: {
    description: 'Cackle like a villain',
    usage: 'cackle [target]',
    examples: ['cackle', 'cackle Oscar']
  },
  messages: {
    noTarget: {
      self: 'You cackle like a villain who just remembered they left the oven on.',
      room: (player) => `${player.getDisplayName()} cackles like a villain who just remembered they left the oven on.`
    },
    withTarget: {
      self: (player, target) => `You cackle maniacally at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} cackles maniacally at you.`,
      room: (player, target) => `${player.getDisplayName()} cackles maniacally at ${target.getDisplayName()}.`
    }
  }
});
