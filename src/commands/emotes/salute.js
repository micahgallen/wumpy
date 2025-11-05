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
      room: (player) => `${player.username} salutes the empty air with military precision. Respect.`
    },
    withTarget: {
      self: (player, target) => `You salute ${target.username} with crisp military precision.`,
      target: (player) => `${player.username} salutes you formally. Should you salute back?`,
      room: (player, target) => `${player.username} gives ${target.username} a crisp military salute.`
    }
  }
});
