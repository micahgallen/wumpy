/**
 * Bandaid Emote
 * Slap a bandaid on it! The universal solution to all problems.
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'bandaid',
  aliases: ['bandage', 'fix'],
  help: {
    description: 'Slap a bandaid on it - the universal fix for everything',
    usage: 'bandaid [target]',
    examples: [
      'bandaid',
      'bandaid Elmo',
      'bandaid self'
    ]
  },
  messages: {
    noTarget: {
      self: 'You slap a bandaid on yourself. That should fix... something. Probably. Maybe. Look, it\'s the thought that counts.',
      room: (player) => `${player.getDisplayName()} slaps a bandaid on themselves with the confidence of someone who hasn't read the manual.`
    },
    withTarget: {
      self: (player, target) => `You slap a bandaid on ${target.getDisplayName()}. "There! All better!" you declare, ignoring the laws of medicine, physics, and common sense.`,
      target: (player) => `${player.getDisplayName()} slaps a bandaid on you with reckless optimism. You're... pretty sure that's not where the problem is, but hey, free bandaid!`,
      room: (player, target) => `${player.getDisplayName()} slaps a bandaid on ${target.getDisplayName()} with the sort of misplaced confidence usually reserved for people who fix servers by turning them off and on again.`
    },
    targetSelf: {
      self: 'You slap a bandaid on yourself. The ultimate act of self-care: acknowledging you have problems and covering them with adhesive medical strips.',
      room: (player) => `${player.getDisplayName()} slaps a bandaid on themselves. It's unclear what they're fixing, but they seem satisfied with this solution.`
    }
  }
});
