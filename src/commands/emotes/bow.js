/**
 * Bow Emote
 * Bow gracefully to no one in particular or to a specific target
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'bow',
  aliases: [],
  help: {
    description: 'Bow gracefully',
    usage: 'bow [target]',
    examples: [
      'bow',
      'bow Elmo'
    ]
  },
  messages: {
    noTarget: {
      self: 'You bow with the grace of a penguin on a skateboard.',
      room: (player) => `${player.getDisplayName()} bows with the grace of a penguin on a skateboard.`
    },
    withTarget: {
      self: (player, target) => `You bow to ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} bows to you.`,
      room: (player, target) => `${player.getDisplayName()} bows to ${target.getDisplayName()}.`
    }
  }
});
