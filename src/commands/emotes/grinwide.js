/**
 * Grin Wide Emote
 * Flash a huge, possibly suspicious grin
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'grinwide',
  aliases: ['widegrin'],
  help: {
    description: 'Grin widely like a Cheshire cat',
    usage: 'grinwide [target]',
    examples: [
      'grinwide',
      'grinwide Oscar'
    ]
  },
  messages: {
    noTarget: {
      self: 'You grin widely, showing all your teeth like a Cheshire cat on caffeine.',
      room: (player) => `${player.username} grins widely, showing all their teeth. It's slightly unsettling.`
    },
    withTarget: {
      self: (player, target) => `You flash ${target.username} your widest, most enthusiastic grin.`,
      target: (player) => `${player.username} flashes you a grin so wide it might be legally considered a threat.`,
      room: (player, target) => `${player.username} grins widely at ${target.username} with alarming enthusiasm.`
    }
  }
});
