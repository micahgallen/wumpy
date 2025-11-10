/**
 * Hiccup Emote
 * Hiccup
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'hiccup',
  aliases: [],
  help: {
    description: 'Hiccup',
    usage: 'hiccup [target]',
    examples: ['hiccup', 'hiccup Snuffy']
  },
  messages: {
    noTarget: {
      self: 'You hiccup with a tiny, adorable squeak.',
      room: (player) => `${player.getDisplayName()} hiccups with a tiny, adorable squeak.`
    },
    withTarget: {
      self: (player, target) => `You hiccup at ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} hiccups at you.`,
      room: (player, target) => `${player.getDisplayName()} hiccups at ${target.getDisplayName()}.`
    }
  }
});
