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
      let output = `\n${colors.playerName(player.getDisplayName())}`;
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
        let output = `\n${colors.playerName(p.getDisplayName())}`;
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

    const room = world.getRoom(player.currentRoom);

    // Check items FIRST (new item system) - higher priority
    if (room && room.items) {
      const ItemRegistry = require('../../items/ItemRegistry');
      for (const itemData of room.items) {
        const itemDef = ItemRegistry.getItem(itemData.definitionId);
        if (itemDef && itemDef.keywords) {
          // Exact match only for items to avoid conflicts
          if (itemDef.keywords.some(keyword => keyword.toLowerCase() === targetName)) {
            const examineCommand = registry.getCommand('examine');
            if (examineCommand) {
              examineCommand.execute(player, args, context);
            }
            return;
          }
        } else if (itemData.keywords && itemData.name) {
          // Dynamic item (like corpse) not in registry - check keywords directly
          if (itemData.keywords.some(keyword => keyword.toLowerCase() === targetName)) {
            const examineCommand = registry.getCommand('examine');
            if (examineCommand) {
              examineCommand.execute(player, args, context);
            }
            return;
          }
        }
      }
    }

    // Check NPCs - delegate to examine command for consistent behavior
    if (room && room.npcs) {
      for (const npcId of room.npcs) {
        const npc = world.getNPC(npcId);
        if (npc && npc.keywords) {
          // Exact match first, then partial
          const exactMatch = npc.keywords.some(keyword => keyword.toLowerCase() === targetName);
          const partialMatch = npc.keywords.some(keyword => targetName.includes(keyword.toLowerCase()));

          if (exactMatch || partialMatch) {
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

    // Check inventory items BEFORE objects (new item system)
    const isNewInventory = player.inventory && player.inventory.length > 0 &&
                           typeof player.inventory[0] === 'object' && player.inventory[0].instanceId;

    if (isNewInventory) {
      for (const item of player.inventory) {
        if (item.keywords && item.keywords.some(keyword => keyword.toLowerCase() === targetName)) {
          const examineCommand = registry.getCommand('examine');
          if (examineCommand) {
            examineCommand.execute(player, args, context);
          }
          return;
        }
      }
    }

    // Check objects - delegate to examine command
    if (room && room.objects) {
      for (const objId of room.objects) {
        const obj = world.getObject(objId);
        if (obj && obj.keywords) {
          // Exact match only for objects to avoid conflicts with items
          if (obj.keywords.some(keyword => keyword.toLowerCase() === targetName)) {
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

    // Check legacy inventory
    if (player.inventory && player.inventory.length > 0 && typeof player.inventory[0] === 'string') {
      for (const objId of player.inventory) {
        const obj = world.getObject(objId);
        if (obj && obj.keywords && obj.keywords.some(keyword => keyword.toLowerCase() === targetName)) {
          const examineCommand = registry.getCommand('examine');
          if (examineCommand) {
            examineCommand.execute(player, args, context);
          }
          return;
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
