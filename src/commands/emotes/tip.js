/**
 * Tip Emote
 * Tip your hat
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'tip',
  aliases: [],
  help: {
    description: 'Tip your hat',
    usage: 'tip [target]',
    examples: ['tip', 'tip BigBird']
  },
  messages: {
    noTarget: {
      self: 'You tip your hat politely.',
      room: (player) => `${player.getDisplayName()} tips their hat politely.`
    },
    withTarget: {
      self: (player, target) => `You tip your hat to ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} tips their hat to you.`,
      room: (player, target) => `${player.getDisplayName()} tips their hat to ${target.getDisplayName()}.`
    }
  }
});
