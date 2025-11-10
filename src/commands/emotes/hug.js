/**
 * Hug Emote
 * Give someone a warm, fuzzy hug
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'hug',
  aliases: [],
  help: {
    description: 'Hug someone warmly',
    usage: 'hug [target]',
    examples: [
      'hug',
      'hug BigBird'
    ]
  },
  messages: {
    noTarget: {
      self: 'You hug yourself. It\'s not the same, but it\'ll do.',
      room: (player) => `${player.getDisplayName()} hugs themselves. Aww, that's both sad and adorable.`
    },
    withTarget: {
      self: (player, target) => `You wrap ${target.getDisplayName()} in a warm, fuzzy hug.`,
      target: (player) => `${player.getDisplayName()} wraps you in a warm, fuzzy hug.`,
      room: (player, target) => `${player.getDisplayName()} wraps ${target.getDisplayName()} in a warm, fuzzy hug.`
    }
  }
});
