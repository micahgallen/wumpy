/**
 * Taunt Emote
 * Hurl Monty Python insults with cycling taunt rotation
 */

const createEmote = require('./createEmote');

// Monty Python taunts for this emote
const taunts = [
  'I don\'t want to talk to you no more, you empty-headed animal food trough water! ',
  'I fart in your general direction! Your mother was a hamster and your father smelt of elderberries!',
  'Go and boil your bottoms, sons of a silly person!',
  'I wave my private parts at your aunties, you cheesy lot of second-hand electric donkey-bottom biters!',
  'Go away or I shall taunt you again!'
];

module.exports = createEmote({
  name: 'taunt',
  aliases: [],
  help: {
    description: 'Taunt with a witty Monty Python remark',
    usage: 'taunt',
    examples: [
      'taunt'
    ]
  },
  messages: {
    noTarget: {
      self: (player) => {
        const currentTaunt = taunts[player.tauntIndex];
        return `You taunt, "${currentTaunt}"`;
      },
      room: (player) => {
        const currentTaunt = taunts[player.tauntIndex];
        return `${player.username} taunts, "${currentTaunt}"`;
      }
    }
  },
  hooks: {
    afterExecute: (player) => {
      // Cycle to next taunt
      player.tauntIndex = (player.tauntIndex + 1) % taunts.length;
    }
  }
});
