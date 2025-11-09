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

  // Search items in room FIRST (new item system - higher priority than NPCs/objects)
  if (room.items && room.items.length > 0) {
    const ItemRegistry = require('../../items/ItemRegistry');
    for (const itemData of room.items) {
      const itemDef = ItemRegistry.getItem(itemData.definitionId);
      if (itemDef && itemDef.keywords) {
        // Exact match only for items to avoid conflicts
        if (itemDef.keywords.some(keyword => keyword.toLowerCase() === target)) {
          const ItemFactory = require('../../items/ItemFactory');
          const itemInstance = ItemFactory.restoreItem(itemData, itemDef);
          const examineText = itemInstance.onExamine(player);
          player.send('\n' + examineText + '\n');
          return;
        }
      } else if (itemData.keywords && itemData.name) {
        // Dynamic item (like corpse) not in registry - check keywords directly
        if (itemData.keywords.some(keyword => keyword.toLowerCase() === target)) {
          let output = [];
          output.push(colors.objectName(itemData.name));

          // Show description
          if (itemData.description) {
            const wrappedDesc = colors.wrap(itemData.description, 80);
            output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.OBJECT));
          }

          // For corpses, show decay state
          if (itemData.containerType === 'npc_corpse' && itemData.decayTime) {
            const now = Date.now();
            const totalDecayTime = itemData.decayTime - itemData.createdAt;
            const elapsed = now - itemData.createdAt;
            const percentRemaining = Math.max(0, ((totalDecayTime - elapsed) / totalDecayTime) * 100);

            let decayState = '';
            if (percentRemaining > 75) {
              decayState = colors.hint('The corpse is still fresh.');
            } else if (percentRemaining > 50) {
              decayState = colors.hint('The corpse shows signs of decay.');
            } else if (percentRemaining > 25) {
              decayState = colors.hint('The corpse is rotting and beginning to smell.');
            } else {
              decayState = colors.hint('The corpse is putrid and will soon decay completely.');
            }

            output.push('');
            output.push(decayState);

            // Show contents if corpse has items
            if (itemData.inventory && itemData.inventory.length > 0) {
              output.push('');
              output.push(colors.hint('The corpse contains:'));
              const ItemRegistry = require('../../items/ItemRegistry');
              for (const item of itemData.inventory) {
                const itemDef = ItemRegistry.getItem(item.definitionId);
                if (itemDef) {
                  let itemLine = '  - ' + colors.objectName(itemDef.name);
                  if (item.quantity && item.quantity > 1) {
                    itemLine += colors.dim(` x${item.quantity}`);
                  }
                  output.push(itemLine);
                } else if (item.name) {
                  // Dynamic item not in registry
                  let itemLine = '  - ' + colors.objectName(item.name);
                  if (item.quantity && item.quantity > 1) {
                    itemLine += colors.dim(` x${item.quantity}`);
                  }
                  output.push(itemLine);
                }
              }
            }
          }

          player.send('\n' + output.join('\n') + '\n');
          return;
        }
      }
    }
  }

  // Search NPCs in current room
  if (room.npcs) {
    for (const npcId of room.npcs) {
      const npc = world.getNPC(npcId);
      if (npc && npc.keywords) {
        // Use exact match first, then partial match
        const exactMatch = npc.keywords.some(keyword => keyword.toLowerCase() === target);
        const partialMatch = npc.keywords.some(keyword => target.includes(keyword.toLowerCase()));

        if (exactMatch || partialMatch) {
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

  // Search inventory BEFORE objects (new item system)
  // This ensures items in inventory have priority over room objects
  const isNewInventory = player.inventory && player.inventory.length > 0 &&
                         typeof player.inventory[0] === 'object' && player.inventory[0].instanceId;

  if (isNewInventory) {
    for (const item of player.inventory) {
      // Exact match only for items in inventory
      if (item.keywords && item.keywords.some(keyword => keyword.toLowerCase() === target)) {
        // Found in inventory - call examine hook
        const examineText = item.onExamine(player);
        player.send('\n' + examineText + ' ' + colors.hint('(in your inventory)') + '\n');
        return;
      }
    }
  } else if (player.inventory && player.inventory.length > 0) {
    // Legacy inventory system
    for (const objId of player.inventory) {
      const obj = world.getObject(objId);
      if (obj && obj.keywords) {
        // Exact match for legacy items too
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target)) {
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

  // Search objects in current room (checked AFTER inventory)
  if (room.objects) {
    for (const objId of room.objects) {
      const obj = world.getObject(objId);
      if (obj && obj.keywords) {
        // Exact match only for objects to avoid conflicts with items
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target)) {
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
