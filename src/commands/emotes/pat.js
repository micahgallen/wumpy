/**
 * Pat Emote
 * Pat someone reassuringly
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'pat',
  aliases: [],
  help: {
    description: 'Pat someone on the head or shoulder',
    usage: 'pat [target]',
    examples: [
      'pat',
      'pat Grover'
    ]
  },
  messages: {
    noTarget: {
      self: 'You pat yourself on the back for a job well done. Good job, you!',
      room: (player) => `${player.getDisplayName()} pats themselves on the back. Self-encouragement is important!`
    },
    withTarget: {
      self: (player, target) => `You pat ${target.getDisplayName()} reassuringly. There, there.`,
      target: (player) => `${player.getDisplayName()} pats you reassuringly. You feel slightly better.`,
      room: (player, target) => `${player.getDisplayName()} pats ${target.getDisplayName()} reassuringly.`
    }
  }
});
