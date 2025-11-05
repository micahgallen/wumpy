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
      room: (player) => `${player.username} pats themselves on the back. Self-encouragement is important!`
    },
    withTarget: {
      self: (player, target) => `You pat ${target.username} reassuringly. There, there.`,
      target: (player) => `${player.username} pats you reassuringly. You feel slightly better.`,
      room: (player, target) => `${player.username} pats ${target.username} reassuringly.`
    }
  }
});
