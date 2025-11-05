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
      room: (player) => `${player.username} giggles like a schoolgirl who just passed a note in class.`
    },
    withTarget: {
      self: (player, target) => `You giggle at ${target.username}.`,
      target: (player) => `${player.username} giggles at you.`,
      room: (player, target) => `${player.username} giggles at ${target.username}.`
    }
  }
});
