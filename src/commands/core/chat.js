const colors = require('../../colors');

module.exports = {
  name: 'chat',
  description: 'Broadcasts a message to all active players.',
  usage: 'chat <message>',
  execute(player, args, context) {
    const message = args.join(' ').trim();

    if (!message) {
      player.send(colors.error('What do you want to chat?\n'));
      return;
    }

    const senderDisplayName = player.capname || player.username;
    const formattedMessage = colors.info(`[GLOBAL CHAT] ${senderDisplayName}: ${message}\n`);

    // Iterate over all connected players and send the message
    if (context.allPlayers) {
      context.allPlayers.forEach(p => {
        p.send(formattedMessage);
      });
    } else {
      player.send(colors.error('Global chat is currently unavailable.\n'));
    }
  },
};
