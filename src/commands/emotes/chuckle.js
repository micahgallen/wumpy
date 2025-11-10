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
      room: (player) => `${player.getDisplayName()} chuckles softly, like a grandfather who just told a terrible joke.`
    },
    withTarget: {
      self: (player, target) => `You chuckle at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} chuckles at you.`,
      room: (player, target) => `${player.getDisplayName()} chuckles at ${target.getDisplayName()}.`
    }
  }
});
