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
      room: (player) => `${player.username} applauds with the enthusiasm of someone who just saw a dog walk on its hind legs.`
    },
    withTarget: {
      self: (player, target) => `You applaud ${target.username}.`,
      target: (player) => `${player.username} applauds you.`,
      room: (player, target) => `${player.username} applauds ${target.username}.`
    }
  }
});
