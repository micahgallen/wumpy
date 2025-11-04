/**
 * Drop Command - Drop an object from inventory into the current room
 */

const colors = require('../../colors');

/**
 * Execute the drop command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Drop what? Try "drop [item]"\n'));
    return;
  }

  if (!player.inventory || player.inventory.length === 0) {
    player.send('\n' + colors.error('You are not carrying anything to drop.\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Search for matching object in inventory
  for (let i = 0; i < player.inventory.length; i++) {
    const objId = player.inventory[i];
    const obj = world.getObject(objId);

    if (obj && obj.keywords) {
      if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
        // Found matching object

        // Remove from inventory
        player.inventory.splice(i, 1);

        // Add to room
        if (!room.objects) {
          room.objects = [];
        }
        room.objects.push(objId);

        // Save player data
        playerDB.updatePlayerInventory(player.username, player.inventory);

        player.send('\n' + colors.success(`You drop ${obj.name}.\n`));
        return;
      }
    }
  }

  player.send('\n' + colors.error(`You are not carrying "${args.join(' ')}".\n`));
}

module.exports = {
  name: 'drop',
  aliases: [],
  description: 'Drop an item from your inventory',
  usage: 'drop <item>',
  execute
};
