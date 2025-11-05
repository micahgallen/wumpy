/**
 * Strut Emote
 * Strut around with confidence
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'strut',
  aliases: [],
  help: {
    description: 'Strut around confidently',
    usage: 'strut [target]',
    examples: [
      'strut',
      'strut Bert'
    ]
  },
  messages: {
    noTarget: {
      self: 'You strut around with the confidence of a peacock wearing sunglasses.',
      room: (player) => `${player.username} struts around like they own the place. The swagger is real.`
    },
    withTarget: {
      self: (player, target) => `You strut confidently around ${target.username}, showing off.`,
      target: (player) => `${player.username} struts around you with exaggerated confidence. Are they showing off?`,
      room: (player, target) => `${player.username} struts around ${target.username} like a peacock in full display.`
    }
  }
});
