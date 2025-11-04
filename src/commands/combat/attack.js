/**
 * Attack Command
 * Initiates combat with an NPC target
 */

const colors = require('../../colors');

/**
 * Guard function to prevent ghosts from attacking
 */
function requireNotGhost(player, args, context) {
  if (player.isGhost) {
    return {
      allowed: false,
      reason: '\n' + colors.error('You cannot attack while you are a ghost!') +
              '\n' + colors.hint('Your ethereal form passes through the world without substance.\n')
    };
  }
  return { allowed: true };
}

/**
 * Attack command handler
 * Attempts to initiate combat with an NPC in the current room
 */
function execute(player, args, context) {
  const { world, combatEngine } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Attack what? Try "attack [target]"\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Search NPCs in current room
  if (room.npcs) {
    for (const npcId of room.npcs) {
      const npc = world.getNPC(npcId);
      if (npc && npc.keywords) {
        if (npc.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching NPC

          // Check if NPC is dead
          if (npc.isDead && npc.isDead()) {
            player.send('\n' + colors.error(`The ${npc.name} is already dead.\n`));
            return;
          }

          // Retaliation logic
          if (!npc.aggressive) {
            const timidity = npc.timidity !== undefined ? npc.timidity : 0.5;
            if (Math.random() > timidity) {
              npc.aggressive = true;
              player.send(`\n${colors.action(`The ${npc.name} becomes aggressive!`)}\n`);
            }
          }

          combatEngine.initiateCombat([player, npc]);
          return;
        }
      }
    }
  }
  player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here to attack.\n`));
}

/**
 * Command descriptor for registration
 */
module.exports = {
  name: 'attack',
  aliases: ['kill'],
  execute,
  guard: requireNotGhost,
  help: {
    description: 'Initiate combat with an NPC',
    usage: 'attack <target>',
    examples: ['attack goblin', 'attack wumpy']
  }
};
