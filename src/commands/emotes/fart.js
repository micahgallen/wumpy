/**
 * Fart Emote
 * Let one rip
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'fart',
  aliases: [],
  help: {
    description: 'Let one rip',
    usage: 'fart [target]',
    examples: ['fart', 'fart Oscar']
  },
  messages: {
    noTarget: {
      self: 'You let out a small, apologetic toot.',
      room: (player) => `${player.getDisplayName()} lets out a small, apologetic toot.`
    },
    withTarget: {
      self: (player, target) => `You fart in ${target.getDisplayName()}'s general direction.`,
      target: (player) => `${player.getDisplayName()} farts in your general direction.`,
      room: (player, target) => `${player.getDisplayName()} farts in ${target.getDisplayName()}'s general direction.`
    }
  }
});
