/**
 * Salute Emote
 * Give a crisp military salute
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'salute',
  aliases: [],
  help: {
    description: 'Salute formally',
    usage: 'salute [target]',
    examples: [
      'salute',
      'salute BigBird'
    ]
  },
  messages: {
    noTarget: {
      self: 'You snap off a crisp salute to absolutely nobody. You look mildly ridiculous.',
      room: (player) => `${player.getDisplayName()} salutes the empty air with military precision. Respect.`
    },
    withTarget: {
      self: (player, target) => `You salute ${target.getDisplayName()} with crisp military precision.`,
      target: (player) => `${player.getDisplayName()} salutes you formally. Should you salute back?`,
      room: (player, target) => `${player.getDisplayName()} gives ${target.getDisplayName()} a crisp military salute.`
    }
  }
});
