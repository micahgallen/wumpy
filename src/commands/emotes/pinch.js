/**
 * Pinch Emote
 * Pinch someone
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'pinch',
  aliases: [],
  help: {
    description: 'Pinch someone',
    usage: 'pinch [target]',
    examples: ['pinch', 'pinch Bert']
  },
  messages: {
    noTarget: {
      self: 'You pinch yourself to make sure you\'re not dreaming. Nope, still here.',
      room: (player) => `${player.username} pinches themselves to make sure they're not dreaming. Nope, still here.`
    },
    withTarget: {
      self: (player, target) => `You pinch ${target.username} playfully.`,
      target: (player) => `${player.username} pinches you playfully.`,
      room: (player, target) => `${player.username} pinches ${target.username} playfully.`
    }
  }
});
