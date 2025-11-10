/**
 * Poke Emote
 * Poke someone to get their attention
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'poke',
  aliases: [],
  help: {
    description: 'Poke someone annoyingly',
    usage: 'poke [target]',
    examples: [
      'poke',
      'poke Count'
    ]
  },
  messages: {
    noTarget: {
      self: 'You poke the air in front of you. It\'s not very effective.',
      room: (player) => `${player.getDisplayName()} pokes the air mysteriously. Are they practicing?`
    },
    withTarget: {
      self: (player, target) => `You poke ${target.getDisplayName()} repeatedly. Poke, poke, poke!`,
      target: (player) => `${player.getDisplayName()} pokes you. Poke, poke, poke! Hey, cut that out!`,
      room: (player, target) => `${player.getDisplayName()} pokes ${target.getDisplayName()} repeatedly. This might escalate.`
    }
  }
});
