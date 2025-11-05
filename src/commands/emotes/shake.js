/**
 * Shake Emote
 * Shake your head in disagreement or disbelief
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'shake',
  aliases: ['headshake'],
  help: {
    description: 'Shake your head in disagreement',
    usage: 'shake [target]',
    examples: [
      'shake',
      'shake Rosita'
    ]
  },
  messages: {
    noTarget: {
      self: 'You shake your head slowly, like a disappointed parent at a science fair volcano that won\'t erupt.',
      room: (player) => `${player.username} shakes their head in disappointment. Somebody done goofed.`
    },
    withTarget: {
      self: (player, target) => `You shake your head at ${target.username} disapprovingly.`,
      target: (player) => `${player.username} shakes their head at you. Shame! Shame!`,
      room: (player, target) => `${player.username} shakes their head disappointedly at ${target.username}.`
    }
  }
});
