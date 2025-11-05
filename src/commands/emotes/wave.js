/**
 * Wave Emote
 * Wave hello or goodbye
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'wave',
  aliases: [],
  help: {
    description: 'Wave at someone',
    usage: 'wave [target]',
    examples: [
      'wave',
      'wave Cookie'
    ]
  },
  messages: {
    noTarget: {
      self: 'You wave enthusiastically at everyone and no one in particular.',
      room: (player) => `${player.username} waves enthusiastically like they're trying to flag down a ship.`
    },
    withTarget: {
      self: (player, target) => `You wave at ${target.username} cheerfully.`,
      target: (player) => `${player.username} waves at you cheerfully.`,
      room: (player, target) => `${player.username} waves at ${target.username}.`
    }
  }
});
