const colors = require('../../colors');

const setCapname = (player, args, context) => {
  const rawCapname = args.join(' ');

  if (!rawCapname) {
    player.send(`\nUsage: set capname <new_name>\n`);
    return;
  }

  // SECURITY: Strip any raw ANSI codes user might have input (prevent injection)
  const sanitizedCapname = rawCapname.replace(/\x1b\[[0-9;]*m/g, '');

  if (!sanitizedCapname) {
    player.send(colors.error(`\nCapname cannot be empty.\n`));
    return;
  }

  // Length check on raw input (prevent tag spam)
  if (sanitizedCapname.length > 500) {
    player.send(colors.error(`\nCapname input too long. Maximum 500 characters.\n`));
    return;
  }

  // Parse color tags into ANSI codes
  const newCapname = colors.parseColorTags(sanitizedCapname);

  // Validation: Strip colors and trim whitespace
  const strippedCapname = colors.stripColors(newCapname).trim();

  // Length check on stripped version
  if (strippedCapname.length > 50) {
    player.send(colors.error(`\nCapname too long. Maximum 50 characters (excluding colors).\n`));
    return;
  }

  // CRITICAL: Stripped capname must match username (case-insensitive)
  if (strippedCapname.toLowerCase() !== player.username.toLowerCase()) {
    player.send(colors.error(`\nInvalid capname. Must match your username '${player.username}'.\n`));
    return;
  }

  // Set and save
  player.capname = newCapname;
  context.playerDB.savePlayer(player);

  player.send(colors.success(`\nYour capname has been set to: ${player.capname}${colors.ANSI.RESET}\n`));
};

const setCommand = {
  name: 'set',
  description: 'Set various player attributes.',
  aliases: [],
  execute: (player, args, context) => {
    if (args.length < 1) {
      player.send(colors.error('\nWhat do you want to set? (e.g., set capname <name>)\n'));
      return;
    }

    const subCommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subCommand) {
      case 'capname':
        setCapname(player, subArgs, context);
        break;
      default:
        player.send(colors.error(`\nYou can't set '${subCommand}'.\n`));
        break;
    }
  }
};

module.exports = setCommand;
