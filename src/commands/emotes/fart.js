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
      room: (player) => `${player.username} lets out a small, apologetic toot.`
    },
    withTarget: {
      self: (player, target) => `You fart in ${target.username}'s general direction.`,
      target: (player) => `${player.username} farts in your general direction.`,
      room: (player, target) => `${player.username} farts in ${target.username}'s general direction.`
    }
  }
});
