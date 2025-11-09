/**
 * Destroy Command (Admin)
 *
 * Instantly removes an NPC without corpse generation or respawn
 * Use this for cleanup or removing problematic NPCs
 * Usage: destroy <target>
 */

const colors = require('../../colors');
const logger = require('../../logger');

function execute(player, args, context) {
  const { world } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Destroy what?\n'));
    player.send(colors.info('Usage: destroy <target>\n'));
    return;
  }

  // Find target NPC in current room
  const room = world.getRoom(player.currentRoom);
  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  const targetName = args.join(' ').toLowerCase();
  const npcIndex = room.npcs?.findIndex(n =>
    n.name.toLowerCase().includes(targetName) ||
    n.id.toLowerCase().includes(targetName)
  );

  if (npcIndex === -1 || npcIndex === undefined || !room.npcs) {
    player.send('\n' + colors.error(`No NPC matching "${args.join(' ')}" found in this room.\n`));
    return;
  }

  const npc = room.npcs[npcIndex];
  const npcName = npc.name;
  const npcId = npc.id;

  // Remove from room.npcs array
  room.npcs.splice(npcIndex, 1);

  // If NPC was in combat, remove combat state
  const CombatEngine = require('../../systems/combat/CombatEngine');
  if (CombatEngine.isInCombat(npcId)) {
    CombatEngine.endCombat(npcId);
  }

  logger.log(`Admin destroyed NPC: ${npcName} (${npcId}) in room ${player.currentRoom}`);

  // Notify admin
  player.send('\n' + colors.success(`${npcName} has been annihilated!\n`));
  player.send(colors.warning(`No corpse created. NPC will NOT respawn.\n`));
  player.send(colors.info(`Use 'respawn ${npcId}' to restore if needed.\n`));

  // Notify room (optional)
  world.sendToRoom(
    player.currentRoom,
    colors.dim(`${npcName} vanishes in a puff of admin magic.`),
    [player.username]
  );
}

module.exports = {
  name: 'destroy',
  aliases: ['annihilate', 'obliterate'],
  description: 'Instantly remove an NPC without corpse or respawn (admin)',
  usage: 'destroy <target>',
  examples: [
    'destroy wumpy - Remove wumpy completely',
    'destroy big bird - Remove Big Bird',
    'annihilate grover - Remove Grover using alias'
  ],
  execute
};
