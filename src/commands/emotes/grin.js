/**
 * Grin Emote
 * Grin
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'grin',
  aliases: [],
  help: {
    description: 'Grin',
    usage: 'grin [target]',
    examples: ['grin', 'grin Cookie']
  },
  messages: {
    noTarget: {
      self: 'You grin like a Cheshire cat who just got away with something.',
      room: (player) => `${player.getDisplayName()} grins like a Cheshire cat who just got away with something.`
    },
    withTarget: {
      self: (player, target) => `You grin at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} grins at you.`,
      room: (player, target) => `${player.getDisplayName()} grins at ${target.getDisplayName()}.`
    }
  }
});
