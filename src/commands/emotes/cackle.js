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
      room: (player) => `${player.username} cackles like a villain who just remembered they left the oven on.`
    },
    withTarget: {
      self: (player, target) => `You cackle maniacally at ${target.username}.`,
      target: (player) => `${player.username} cackles maniacally at you.`,
      room: (player, target) => `${player.username} cackles maniacally at ${target.username}.`
    }
  }
});
