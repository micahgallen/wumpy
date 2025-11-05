/**
 * Chuckle Emote
 * Chuckle softly
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'chuckle',
  aliases: [],
  help: {
    description: 'Chuckle softly',
    usage: 'chuckle [target]',
    examples: ['chuckle', 'chuckle Cookie']
  },
  messages: {
    noTarget: {
      self: 'You chuckle softly, like a grandfather who just told a terrible joke.',
      room: (player) => `${player.username} chuckles softly, like a grandfather who just told a terrible joke.`
    },
    withTarget: {
      self: (player, target) => `You chuckle at ${target.username}.`,
      target: (player) => `${player.username} chuckles at you.`,
      room: (player, target) => `${player.username} chuckles at ${target.username}.`
    }
  }
});
