/**
 * Applaud Emote
 * Applaud enthusiastically
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'applaud',
  aliases: [],
  help: {
    description: 'Applaud enthusiastically',
    usage: 'applaud [target]',
    examples: ['applaud', 'applaud Elmo']
  },
  messages: {
    noTarget: {
      self: 'You applaud with the enthusiasm of someone who just saw a dog walk on its hind legs.',
      room: (player) => `${player.getDisplayName()} applauds with the enthusiasm of someone who just saw a dog walk on its hind legs.`
    },
    withTarget: {
      self: (player, target) => `You applaud ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} applauds you.`,
      room: (player, target) => `${player.getDisplayName()} applauds ${target.getDisplayName()}.`
    }
  }
});
