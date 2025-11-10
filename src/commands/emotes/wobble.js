/**
 * Wobble Emote
 * Wobble around unsteadily like you've had too much mead
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'wobble',
  aliases: [],
  help: {
    description: 'Wobble around unsteadily',
    usage: 'wobble [target]',
    examples: [
      'wobble',
      'wobble Elmo'
    ]
  },
  messages: {
    noTarget: {
      self: 'You wobble around like a Weeble that forgot it\'s not supposed to fall down.',
      room: (player) => `${player.getDisplayName()} wobbles around unsteadily. Should someone call a healer?`
    },
    withTarget: {
      self: (player, target) => `You wobble dramatically in the direction of ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} wobbles dramatically in your direction. You might want to catch them.`,
      room: (player, target) => `${player.getDisplayName()} wobbles dramatically toward ${target.getDisplayName()}.`
    }
  }
});
