/**
 * Groan Emote
 * Groan
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'groan',
  aliases: [],
  help: {
    description: 'Groan',
    usage: 'groan [target]',
    examples: ['groan', 'groan Oscar']
  },
  messages: {
    noTarget: {
      self: 'You groan with the weight of the world on your shoulders, or maybe you just ate too much cheese.',
      room: (player) => `${player.getDisplayName()} groans with the weight of the world on their shoulders, or maybe you just ate too much cheese.`
    },
    withTarget: {
      self: (player, target) => `You groan at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} groans at you.`,
      room: (player, target) => `${player.getDisplayName()} groans at ${target.getDisplayName()}.`
    }
  }
});
