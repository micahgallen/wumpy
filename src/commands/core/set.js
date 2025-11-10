const colors = require('../../colors');

const setCapname = (player, args, context) => {
    const rawCapname = args.join(' ');

    if (!rawCapname) {
        player.send(`\nUsage: set capname <new_name>\n`);
        return;
    }

    // Parse color tags into ANSI codes
    const newCapname = colors.parseColorTags(rawCapname);

    // Validation: Stripped capname must match username (case-insensitive)
    const strippedCapname = colors.stripColors(newCapname);
    if (strippedCapname.toLowerCase() !== player.username.toLowerCase()) {
        player.send(colors.error(`\nInvalid capname. The name must match your character name '${player.username}'.\n`));
        return;
    }

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
