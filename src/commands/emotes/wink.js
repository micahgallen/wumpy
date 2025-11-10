/**
 * Wink Emote
 * Give a knowing wink
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'wink',
  aliases: [],
  help: {
    description: 'Wink knowingly',
    usage: 'wink [target]',
    examples: [
      'wink',
      'wink Zoe'
    ]
  },
  messages: {
    noTarget: {
      self: 'You wink at nobody in particular. That just looks like a twitch.',
      room: (player) => `${player.getDisplayName()} winks at nobody in particular. Is that a twitch or intentional?`
    },
    withTarget: {
      self: (player, target) => `You wink knowingly at ${target.getDisplayName()}. *wink wink*`,
      target: (player) => `${player.getDisplayName()} winks at you knowingly. What do they know?!`,
      room: (player, target) => `${player.getDisplayName()} winks at ${target.getDisplayName()}. There's definitely a conspiracy here.`
    }
  }
});
