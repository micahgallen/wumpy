/**
 * Bounce Emote
 * Bounce around with unbridled energy
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'bounce',
  aliases: [],
  help: {
    description: 'Bounce around energetically',
    usage: 'bounce [target]',
    examples: [
      'bounce',
      'bounce Abby'
    ]
  },
  messages: {
    noTarget: {
      self: 'You bounce around like a hyperactive pogo stick that discovered espresso.',
      room: (player) => `${player.getDisplayName()} bounces around with the energy of someone who drank all the potions.`
    },
    withTarget: {
      self: (player, target) => `You bounce excitedly around ${target.getDisplayName()}!`,
      target: (player) => `${player.getDisplayName()} bounces around you with alarming enthusiasm!`,
      room: (player, target) => `${player.getDisplayName()} bounces around ${target.getDisplayName()} like an overexcited puppy.`
    }
  }
});
