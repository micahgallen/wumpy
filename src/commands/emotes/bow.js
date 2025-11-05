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
      room: (player) => `${player.username} bows with the grace of a penguin on a skateboard.`
    },
    withTarget: {
      self: (player, target) => `You bow to ${target.username}.`,
      target: (player) => `${player.username} bows to you.`,
      room: (player, target) => `${player.username} bows to ${target.username}.`
    }
  }
});
