/**
 * Woo Emote
 * Express excitement like you just won tickets to a concert
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'woo',
  aliases: ['woohoo'],
  help: {
    description: 'Express excitement enthusiastically',
    usage: 'woo [target]',
    examples: [
      'woo',
      'woo Elmo'
    ]
  },
  messages: {
    noTarget: {
      self: 'You throw your hands in the air and woo like you just don\'t care!',
      room: (player) => `${player.username} throws their hands in the air and woos like they just don't care!`
    },
    withTarget: {
      self: (player, target) => `You woo enthusiastically at ${target.username}!`,
      target: (player) => `${player.username} woos enthusiastically at you!`,
      room: (player, target) => `${player.username} woos enthusiastically at ${target.username}!`
    }
  }
});
