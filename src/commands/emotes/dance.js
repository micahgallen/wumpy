/**
 * Dance Emote
 * Dance the dance of your people
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'dance',
  aliases: [],
  help: {
    description: 'Dance',
    usage: 'dance [target]',
    examples: [
      'dance',
      'dance BigBird'
    ]
  },
  messages: {
    noTarget: {
      self: 'You dance the dance of your people. It\'s... something.',
      room: (player) => `${player.username} dances the dance of their people. It's... something.`
    },
    withTarget: {
      self: (player, target) => `You dance with ${target.username}.`,
      target: (player) => `${player.username} dances with you.`,
      room: (player, target) => `${player.username} dances with ${target.username}.`
    }
  }
});
