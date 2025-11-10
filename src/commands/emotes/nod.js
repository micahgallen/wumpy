/**
 * Nod Emote
 * Nod in agreement or acknowledgment
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'nod',
  aliases: [],
  help: {
    description: 'Nod in agreement',
    usage: 'nod [target]',
    examples: [
      'nod',
      'nod Telly'
    ]
  },
  messages: {
    noTarget: {
      self: 'You nod sagely, like a bobblehead philosopher contemplating the meaning of lunch.',
      room: (player) => `${player.getDisplayName()} nods sagely, as if they just figured out something profound.`
    },
    withTarget: {
      self: (player, target) => `You nod at ${target.getDisplayName()} in agreement.`,
      target: (player) => `${player.getDisplayName()} nods at you knowingly.`,
      room: (player, target) => `${player.getDisplayName()} nods at ${target.getDisplayName()}.`
    }
  }
});
