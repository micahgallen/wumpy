/**
 * Kick Command - Kick an NPC (primarily for wumpies)
 */

const colors = require('../../colors');

/**
 * Execute the kick command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, activeInteractions } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Kick what? Try "kick [target]"\n'));
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

          if (npc.is_kickable) {
            const interactionKey = `${player.currentRoom}_${npcId}`;
            if (activeInteractions.has(interactionKey)) {
              player.send('\n' + colors.error(`The ${npc.name} is already busy being kicked by someone else!`));
              return;
            }

            player.send('\n' + colors.action(`You kick the ${npc.name}!` + '\n'));
            const randomResponse = npc.kick_responses[Math.floor(Math.random() * npc.kick_responses.length)];
            player.send(colors.npcSay(`${randomResponse}\n`));

            // Start the apology dialogue sequence
            let dialogueIndex = 0;
            const dialogueInterval = setInterval(() => {
              if (dialogueIndex < npc.apology_dialogue.length) {
                player.send(colors.npcSay(`The ${npc.name} says, "${npc.apology_dialogue[dialogueIndex++]}"\n`));
              } else {
                clearInterval(dialogueInterval);
              }
            }, 1000);

            const timer = setTimeout(() => {
              // Wumpy vanishes
              const wumpyIndex = room.npcs.indexOf(npcId);
              if (wumpyIndex > -1) {
                room.npcs.splice(wumpyIndex, 1);
              }
              player.send('\n' + colors.action(`The ${npc.name} vanishes in a puff of logic!`));
              activeInteractions.delete(interactionKey);
            }, 10000);

            activeInteractions.set(interactionKey, {
              player: player.username,
              timer: timer,
              dialogueInterval: dialogueInterval
            });

            return;
          } else {
            player.send('\n' + colors.error(`You can\'t kick the ${npc.name}. It doesn\'t seem to appreciate that.\n`));
            return;
          }
        }
      }
    }
  }
  player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here to kick.\n`));
}

module.exports = {
  name: 'kick',
  aliases: [],
  description: 'Kick an NPC (typically a wumpy)',
  usage: 'kick <target>',
  execute
};
