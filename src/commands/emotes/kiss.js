/**
 * Kiss Emote
 * Blow a kiss
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'kiss',
  aliases: [],
  help: {
    description: 'Blow a kiss',
    usage: 'kiss [target]',
    examples: ['kiss', 'kiss Elmo']
  },
  messages: {
    noTarget: {
      self: 'You blow a kiss into the air. It lands on someone\'s cheek with a soft *smack*.',
      room: (player) => `${player.getDisplayName()} blows a kiss into the air. It lands on someone's cheek with a soft *smack*.`
    },
    withTarget: {
      self: (player, target) => `You blow a kiss to ${target.getDisplayName()}.`,
      target: (player) => `${player.getDisplayName()} blows a kiss to you.`,
      room: (player, target) => `${player.getDisplayName()} blows a kiss to ${target.getDisplayName()}.`
    }
  }
});
