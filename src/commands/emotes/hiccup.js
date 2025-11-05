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
      room: (player) => `${player.username} hiccups with a tiny, adorable squeak.`
    },
    withTarget: {
      self: (player, target) => `You hiccup at ${target.username}.`,
      target: (player) => `${player.username} hiccups at you.`,
      room: (player, target) => `${player.username} hiccups at ${target.username}.`
    }
  }
});
