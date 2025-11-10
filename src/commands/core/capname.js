const colors = require('../../colors');

const capnameCommand = {
  name: 'capname',
  description: 'View your custom display name (capname).',
  aliases: [],
  execute: (player, args, context) => {
    if (args.length > 0) {
      player.send(colors.error(`\nInvalid argument. To set your name, use 'set capname <name>'.\n`));
      return;
    }

    if (player.capname) {
      player.send(`\nYour current capname is: ${player.capname}${colors.ANSI.RESET}\n`);
      player.send(`It is stored as: ${colors.unparseColorTags(player.capname)}\n`);
    } else {
      player.send(`\nYou do not have a capname set. Use 'set capname <name>' to set one.\n`);
    }
  }
};

module.exports = capnameCommand;
