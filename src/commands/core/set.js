const colors = require('../../colors');

const { Role, getRankValue } = require('../../admin/permissions');

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

const setTeleportMessage = (player, args, context, type) => {
  const requiredRank = getRankValue(Role.CREATOR);
  const playerRank = getRankValue(player.role);

  if (playerRank < requiredRank) {
    player.send(colors.error(`\nYou can't set '${type}'.\n`));
    return;
  }

  const message = args.join(' ');

  if (!message) {
    player.send(colors.error(`\nUsage: set ${type} <message>\n`));
    return;
  }

  // Sanitize and validate
  let sanitizedMessage = message.replace(/\x1b\[[0-9;]*m/g, ''); // Strip raw ANSI
  sanitizedMessage = sanitizedMessage.replace(/<(\/)?([\w_]+)?>/g, ''); // Strip color tags

  if (sanitizedMessage.length > 120) {
    player.send(colors.error('\nMessage is too long. Maximum 120 characters.\n'));
    return;
  }

  if (type === 'telenter') {
    player.customEnter = sanitizedMessage;
    player.send(colors.success(`\nYour teleport entrance message has been set.\n`));
  } else {
    player.customExit = sanitizedMessage;
    player.send(colors.success(`\nYour teleport exit message has been set.\n`));
  }

  context.playerDB.savePlayer(player);
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
      case 'telenter':
        setTeleportMessage(player, subArgs, context, 'telenter');
        break;
      case 'telexit':
        setTeleportMessage(player, subArgs, context, 'telexit');
        break;
      default:
        player.send(colors.error(`\nYou can't set '${subCommand}'.\n`));
        break;
    }
  }
};

module.exports = setCommand;
