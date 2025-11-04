/**
 * Look command - Display current room information or examine a target
 */

const colors = require('../../colors');
const registry = require('../registry');

/**
 * Execute look command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  let targetName;
  if (args.length > 1 && args[0].toLowerCase() === 'at') {
    targetName = args.slice(1).join(' ').toLowerCase();
  } else if (args.length > 0) {
    targetName = args.join(' ').toLowerCase();
  }

  if (targetName) {
    // Check self
    if (targetName === player.username.toLowerCase()) {
      let output = `\n${colors.playerName(player.username)}`;
      if (player.isGhost) {
        output += colors.hint(' (ghost)');
      }
      output += `\n${player.description}`;
      if (player.isGhost) {
        output += `\n${colors.hint('Your form is translucent and ethereal.')}`;
      }
      player.send(output + '\n');
      return;
    }

    // Check other players
    for (const p of allPlayers) {
      if (p.username.toLowerCase() === targetName && p.currentRoom === player.currentRoom) {
        let output = `\n${colors.playerName(p.username)}`;
        if (p.isGhost) {
          output += colors.hint(' (ghost)');
        }
        output += `\n${p.description}`;
        if (p.isGhost) {
          output += `\n${colors.hint('Their form is translucent and ethereal, barely visible in this world.')}`;
        }
        player.send(output + '\n');
        return;
      }
    }

    // Check NPCs - delegate to examine command for consistent behavior
    const room = world.getRoom(player.currentRoom);
    if (room && room.npcs) {
      for (const npcId of room.npcs) {
        const npc = world.getNPC(npcId);
        if (npc && npc.keywords) {
          if (npc.keywords.some(keyword => keyword.toLowerCase() === targetName || targetName.includes(keyword.toLowerCase()))) {
            // Found matching NPC - use examine logic
            const examineCommand = registry.getCommand('examine');
            if (examineCommand) {
              examineCommand.execute(player, args, context);
            }
            return;
          }
        }
      }
    }

    // Check objects - delegate to examine command
    if (room && room.objects) {
      for (const objId of room.objects) {
        const obj = world.getObject(objId);
        if (obj && obj.keywords) {
          if (obj.keywords.some(keyword => keyword.toLowerCase() === targetName || targetName.includes(keyword.toLowerCase()))) {
            // Found matching object - use examine logic
            const examineCommand = registry.getCommand('examine');
            if (examineCommand) {
              examineCommand.execute(player, args, context);
            }
            return;
          }
        }
      }
    }

    player.send(`\n${colors.error('You don\'t see that here.')}\n`);
    return;
  }

  const roomDescription = world.formatRoom(player.currentRoom, allPlayers, player);
  player.send('\n' + roomDescription);
}

module.exports = {
  name: 'look',
  aliases: ['l'],
  execute,
  help: {
    description: 'Look around the current room or at a specific target',
    usage: 'look [target]',
    examples: ['look', 'look at wumpy', 'look sign', 'l']
  }
};
