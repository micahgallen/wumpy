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
      room: (player) => `${player.getDisplayName()} slaps their palm against their forehead. The sound echoes with disappointment.`
    },
    withTarget: {
      self: (player, target) => `You facepalm dramatically while staring at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} facepalms dramatically while staring directly at you. What did you do?`,
      room: (player, target) => `${player.getDisplayName()} facepalms dramatically while staring at ${target.getDisplayName()}.`
    }
  }
});
