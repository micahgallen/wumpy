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
      room: (player) => `${player.getDisplayName()} cries a single, dramatic tear. It's probably not real.`
    },
    withTarget: {
      self: (player, target) => `You cry on ${target.getDisplayName()}'s shoulder.`,
      target: (player) => `${player.getDisplayName()} cries on your shoulder.`,
      room: (player, target) => `${player.getDisplayName()} cries on ${target.getDisplayName()}'s shoulder.`
    }
  }
});
