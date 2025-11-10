/**
 * Giggle Emote
 * Giggle
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'giggle',
  aliases: [],
  help: {
    description: 'Giggle',
    usage: 'giggle [target]',
    examples: ['giggle', 'giggle Zoe']
  },
  messages: {
    noTarget: {
      self: 'You giggle like a schoolgirl who just passed a note in class.',
      room: (player) => `${player.getDisplayName()} giggles like a schoolgirl who just passed a note in class.`
    },
    withTarget: {
      self: (player, target) => `You giggle at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} giggles at you.`,
      room: (player, target) => `${player.getDisplayName()} giggles at ${target.getDisplayName()}.`
    }
  }
});
