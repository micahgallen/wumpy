/**
 * Cry Emote
 * Cry dramatically
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'cry',
  aliases: [],
  help: {
    description: 'Cry dramatically',
    usage: 'cry [target]',
    examples: ['cry', 'cry Ernie']
  },
  messages: {
    noTarget: {
      self: 'You cry a single, dramatic tear. It\'s probably not real.',
      room: (player) => `${player.username} cries a single, dramatic tear. It's probably not real.`
    },
    withTarget: {
      self: (player, target) => `You cry on ${target.username}'s shoulder.`,
      target: (player) => `${player.username} cries on your shoulder.`,
      room: (player, target) => `${player.username} cries on ${target.username}'s shoulder.`
    }
  }
});
