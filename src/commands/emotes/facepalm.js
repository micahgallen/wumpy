/**
 * Facepalm Emote
 * Express exasperation by slapping your face
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'facepalm',
  aliases: ['fpalm'],
  help: {
    description: 'Slap your forehead in exasperation',
    usage: 'facepalm [target]',
    examples: [
      'facepalm',
      'facepalm Bert'
    ]
  },
  messages: {
    noTarget: {
      self: 'You slap your palm against your forehead with an audible *smack*. Why? Just... why?',
      room: (player) => `${player.username} slaps their palm against their forehead. The sound echoes with disappointment.`
    },
    withTarget: {
      self: (player, target) => `You facepalm dramatically while staring at ${target.username}.`,
      target: (player) => `${player.username} facepalms dramatically while staring directly at you. What did you do?`,
      room: (player, target) => `${player.username} facepalms dramatically while staring at ${target.username}.`
    }
  }
});
