/**
 * Tickle Emote
 * Tickle someone mercilessly
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'tickle',
  aliases: [],
  help: {
    description: 'Tickle someone until they giggle',
    usage: 'tickle [target]',
    examples: [
      'tickle',
      'tickle Elmo'
    ]
  },
  messages: {
    noTarget: {
      self: 'You tickle yourself. That\'s... not how tickling works, but okay.',
      room: (player) => `${player.getDisplayName()} tries to tickle themselves. Science has proven this doesn't work, but they're trying anyway.`
    },
    withTarget: {
      self: (player, target) => `You tickle ${target.getDisplayName()} mercilessly! Hehehehe!`,
      target: (player) => `${player.getDisplayName()} tickles you mercilessly! You can't help but giggle!`,
      room: (player, target) => `${player.getDisplayName()} tickles ${target.getDisplayName()} until they're gasping for air!`
    }
  }
});
