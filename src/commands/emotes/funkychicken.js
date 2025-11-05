/**
 * Funky Chicken Emote
 * Bust out the classic funky chicken dance
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'funkychicken',
  aliases: ['funkchicken', 'chicken'],
  help: {
    description: 'Do the funky chicken dance',
    usage: 'funkychicken [target]',
    examples: [
      'funkychicken',
      'funkychicken Grover'
    ]
  },
  messages: {
    noTarget: {
      self: 'You flap your arms and do the funky chicken with reckless abandon! *bawk bawk*',
      room: (player) => `${player.username} flaps their arms and does the funky chicken! *bawk bawk* It's magnificent!`
    },
    withTarget: {
      self: (player, target) => `You do the funky chicken dance around ${target.username}! *bawk bawk*`,
      target: (player) => `${player.username} does the funky chicken dance around you! *bawk bawk* You're not sure how to react.`,
      room: (player, target) => `${player.username} does the funky chicken dance around ${target.username}! *bawk bawk*`
    }
  }
});
