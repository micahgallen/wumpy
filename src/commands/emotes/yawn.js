/**
 * Yawn Emote
 * Express your boredom or exhaustion
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'yawn',
  aliases: [],
  help: {
    description: 'Yawn widely and contagiously',
    usage: 'yawn [target]',
    examples: [
      'yawn',
      'yawn Snuffy'
    ]
  },
  messages: {
    noTarget: {
      self: 'You yawn so wide a small bird could fly in. Better cover your mouth next time.',
      room: (player) => `${player.getDisplayName()} yawns widely. It's contagious. You feel sleepy just watching.`
    },
    withTarget: {
      self: (player, target) => `You yawn dramatically in ${target.getDisplayName()}'s general direction.`,
      target: (player) => `${player.getDisplayName()} yawns dramatically at you. Are you that boring?`,
      room: (player, target) => `${player.getDisplayName()} yawns dramatically at ${target.getDisplayName()}. Ouch.`
    }
  }
});
