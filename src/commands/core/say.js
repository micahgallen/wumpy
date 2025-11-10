/**
 * Say command - Speak to others in the current room
 */

const colors = require('../../colors');

/**
 * Execute say command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { allPlayers } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Say what? Try "say [message]"\n'));
    return;
  }

  const message = args.join(' ');

  // Send to self
  player.send('\n' + colors.say(`You say, "${message}"\n`));

  // Broadcast to others in the room
  for (const p of allPlayers) {
    if (p.currentRoom === player.currentRoom && p.username !== player.username) {
      p.send('\n' + colors.say(`${player.getDisplayName()} says, "${message}"\n`));
      p.sendPrompt();
    }
  }
}

module.exports = {
  name: 'say',
  aliases: [],
  execute,
  help: {
    description: 'Speak to others in the current room',
    usage: 'say <message>',
    examples: ['say Hello everyone!', 'say Has anyone seen the wumpy?']
  }
};
