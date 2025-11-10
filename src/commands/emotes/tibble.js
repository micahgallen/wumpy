/**
 * Tibble Emote
 * Do a mysterious tibble dance that nobody quite understands
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'tibble',
  aliases: [],
  help: {
    description: 'Perform a mysterious tibble dance',
    usage: 'tibble [target]',
    examples: [
      'tibble',
      'tibble Cookie'
    ]
  },
  messages: {
    noTarget: {
      self: 'You tibble mysteriously. You\'re not sure what that means, but it feels right.',
      room: (player) => `${player.getDisplayName()} tibbles mysteriously. Nobody knows what that means, but they're all impressed.`
    },
    withTarget: {
      self: (player, target) => `You tibble at ${target.getDisplayName()} with great significance.`,
      target: (player) => `${player.getDisplayName()} tibbles at you. You have no idea what that means, but you feel honored.`,
      room: (player, target) => `${player.getDisplayName()} tibbles at ${target.getDisplayName()}. The air crackles with confusion.`
    }
  }
});
