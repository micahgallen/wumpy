/**
 * Flex Emote
 * Flex your muscles
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'flex',
  aliases: [],
  help: {
    description: 'Flex your muscles',
    usage: 'flex [target]',
    examples: ['flex', 'flex Bert']
  },
  messages: {
    noTarget: {
      self: 'You flex your muscles, which are surprisingly well-defined for a text-based adventurer.',
      room: (player) => `${player.getDisplayName()} flexes their muscles, which are surprisingly well-defined for a text-based adventurer.`
    },
    withTarget: {
      self: (player, target) => `You flex for ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} flexes for you.`,
      room: (player, target) => `${player.getDisplayName()} flexes for ${target.getDisplayName()}.`
    }
  }
});
