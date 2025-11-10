/**
 * Cheer Emote
 * Cheer loudly
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'cheer',
  aliases: [],
  help: {
    description: 'Cheer loudly',
    usage: 'cheer [target]',
    examples: ['cheer', 'cheer BigBird']
  },
  messages: {
    noTarget: {
      self: 'You cheer with the force of a thousand suns, or at least a very excited hamster.',
      room: (player) => `${player.getDisplayName()} cheers with the force of a thousand suns, or at least a very excited hamster.`
    },
    withTarget: {
      self: (player, target) => `You cheer for ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} cheers for you.`,
      room: (player, target) => `${player.getDisplayName()} cheers for ${target.getDisplayName()}.`
    }
  }
});
