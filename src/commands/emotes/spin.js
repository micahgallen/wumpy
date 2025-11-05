/**
 * Spin Emote
 * Spin around in circles
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'spin',
  aliases: ['twirl'],
  help: {
    description: 'Spin around dramatically',
    usage: 'spin [target]',
    examples: [
      'spin',
      'spin Murray'
    ]
  },
  messages: {
    noTarget: {
      self: 'You spin around and around until the room spins too. Or was it spinning already?',
      room: (player) => `${player.username} spins around dramatically. They're going to regret that in about 3... 2... 1...`
    },
    withTarget: {
      self: (player, target) => `You spin around ${target.username} like a majestic tornado of questionable grace.`,
      target: (player) => `${player.username} spins around you. You're getting dizzy just watching.`,
      room: (player, target) => `${player.username} spins around ${target.username} in dizzying circles.`
    }
  }
});
