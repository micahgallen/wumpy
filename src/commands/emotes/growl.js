/**
 * Growl Emote
 * Growl menacingly
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'growl',
  aliases: [],
  help: {
    description: 'Growl menacingly',
    usage: 'growl [target]',
    examples: ['growl', 'growl Grover']
  },
  messages: {
    noTarget: {
      self: 'You growl menacingly, or maybe you\'re just hungry.',
      room: (player) => `${player.username} growls menacingly, or maybe they're just hungry.`
    },
    withTarget: {
      self: (player, target) => `You growl at ${target.username}.`,
      target: (player) => `${player.username} growls at you.`,
      room: (player, target) => `${player.username} growls at ${target.username}.`
    }
  }
});
