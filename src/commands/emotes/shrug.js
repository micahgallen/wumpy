/**
 * Shrug Emote
 * The universal gesture of "I dunno"
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'shrug',
  aliases: [],
  help: {
    description: 'Shrug in a noncommittal fashion',
    usage: 'shrug [target]',
    examples: [
      'shrug',
      'shrug Ernie'
    ]
  },
  messages: {
    noTarget: {
      self: 'You shrug with the nonchalance of someone who knows nothing and cares even less.',
      room: (player) => `${player.getDisplayName()} shrugs with magnificent indifference.`
    },
    withTarget: {
      self: (player, target) => `You shrug at ${target.getDisplayName()}. Not your problem, apparently.`,
      target: (player) => `${player.getDisplayName()} shrugs at you unhelpfully.`,
      room: (player, target) => `${player.getDisplayName()} shrugs at ${target.getDisplayName()} with casual indifference.`
    }
  }
});
