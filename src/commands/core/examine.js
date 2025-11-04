/**
 * Examine command - Look at NPCs or objects in detail
 */

const colors = require('../../colors');

/**
 * Execute examine command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;
  const target = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Search for players in the current room
  for (const p of allPlayers) {
    if (p.username.toLowerCase() === target && p.currentRoom === player.currentRoom) {
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

  // Search NPCs in current room
  if (room.npcs) {
    for (const npcId of room.npcs) {
      const npc = world.getNPC(npcId);
      if (npc && npc.keywords) {
        if (npc.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching NPC
          let output = [];
          output.push(colors.npcName(npc.name) + colors.hint(` (Level ${npc.level})`));

          // Wrap NPC description
          const wrappedDesc = colors.wrap(npc.description, 80);
          output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.NPC));

          if (npc.dialogue && npc.dialogue.length > 0) {
            output.push('');
            output.push(colors.hint('The ' + npc.name + ' looks like they might have something to say.'));
          }

          if (npc.is_kickable) {
            output.push(colors.hint('This creature looks eminently kickable.'));
          }

          player.send('\n' + output.join('\n') + '\n');
          return;
        }
      }
    }
  }

  // Search objects in current room
  if (room.objects) {
    for (const objId of room.objects) {
      const obj = world.getObject(objId);
      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching object
          let output = [];
          output.push(colors.objectName(obj.name));

          // Wrap object description
          const wrappedDesc = colors.wrap(obj.description, 80);
          output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.OBJECT));

          if (obj.is_container) {
            if (obj.can_be_opened) {
              output.push('');
              if (obj.is_open) {
                output.push(colors.hint('The container is currently open.'));
              } else {
                output.push(colors.hint('The container is currently closed.'));
              }
            }
          }

          if (obj.is_usable) {
            output.push(colors.hint('This looks like it might be usable.'));
          }

          if (obj.can_sit_on) {
            output.push(colors.hint('You could probably sit on this.'));
          }

          if (obj.can_sleep_in) {
            output.push(colors.hint('This looks like a comfortable place to sleep.'));
          }

          player.send('\n' + output.join('\n') + '\n');
          return;
        }
      }
    }
  }

  // Search inventory
  if (player.inventory && player.inventory.length > 0) {
    for (const objId of player.inventory) {
      const obj = world.getObject(objId);
      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          let output = [];
          output.push(colors.objectName(obj.name) + colors.hint(' (in your inventory)'));

          // Wrap object description
          const wrappedDesc = colors.wrap(obj.description, 80);
          output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.OBJECT));

          player.send('\n' + output.join('\n') + '\n');
          return;
        }
      }
    }
  }

  player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here.\n`));
}

module.exports = {
  name: 'examine',
  aliases: ['ex'],
  execute,
  help: {
    description: 'Examine an NPC or object in detail',
    usage: 'examine <target>',
    examples: ['examine wumpy', 'examine cookie jar', 'ex sign']
  }
};
