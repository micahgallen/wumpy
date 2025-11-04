/**
 * Get/Take Command - Pick up an object from the current room
 */

const colors = require('../../colors');

/**
 * Execute the get command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Get what? Try "get [item]"\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room || !room.objects || room.objects.length === 0) {
    player.send('\n' + colors.error('There is nothing here to take.\n'));
    return;
  }

  // Search for matching object in room
  for (let i = 0; i < room.objects.length; i++) {
    const objId = room.objects[i];
    const obj = world.getObject(objId);

    if (obj && obj.keywords) {
      if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
        // Found matching object

        // Check if takeable
        if (obj.is_takeable === false) {
          player.send('\n' + colors.error(`You can\'t take ${obj.name}. It\'s too heavy or fixed in place.\n`));
          return;
        }

        // Remove from room
        room.objects.splice(i, 1);

        // Add to inventory
        if (!player.inventory) {
          player.inventory = [];
        }
        player.inventory.push(objId);

        // Save player data
        playerDB.updatePlayerInventory(player.username, player.inventory);

        player.send('\n' + colors.success(`You take ${obj.name}.\n`));
        return;
      }
    }
  }

  player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here.\n`));
}

module.exports = {
  name: 'get',
  aliases: ['take'],
  description: 'Pick up an item from the current room',
  usage: 'get <item>',
  execute
};
