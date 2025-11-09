/**
 * Respawn Command (Admin)
 *
 * Force an NPC to respawn immediately, optionally in the current room
 * Usage: respawn <npc_id> [here]
 */

const colors = require('../../colors');
const logger = require('../../logger');

function execute(player, args, context) {
  const { world } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Respawn what?\n'));
    player.send(colors.info('Usage: respawn <npc_id> [here]\n'));
    player.send(colors.info('Examples:\n'));
    player.send(colors.info('  respawn purple_wumpy - Respawn in home room\n'));
    player.send(colors.info('  respawn purple_wumpy here - Respawn in current room\n'));
    return;
  }

  const npcId = args[0].toLowerCase();
  const spawnHere = args.length > 1 && args[1].toLowerCase() === 'here';

  // Get RespawnManager
  const RespawnManager = require('../../systems/corpses/RespawnManager');
  const CorpseManager = require('../../systems/corpses/CorpseManager');

  // Check if NPC has an active corpse
  if (CorpseManager.hasActiveCorpse(npcId)) {
    const corpse = CorpseManager.getCorpseByNPC(npcId);
    player.send('\n' + colors.warning(`${npcId} has an active corpse.\n`));
    player.send(colors.info(`Decaying corpse first...\n`));

    // Manually decay the corpse
    CorpseManager.destroyCorpse(corpse.id, world);

    player.send(colors.success(`Corpse removed.\n`));
  }

  // Determine spawn location
  let spawnRoomId;
  if (spawnHere) {
    spawnRoomId = player.currentRoom;
  } else {
    // Try to find NPC's home room from world definition
    // This is a bit tricky - we need to search all rooms for this NPC's definition
    const npcDef = findNPCDefinition(npcId, world);
    if (npcDef && npcDef.homeRoom) {
      spawnRoomId = npcDef.homeRoom;
    } else {
      player.send('\n' + colors.warning(`Could not determine home room for ${npcId}.\n`));
      player.send(colors.info(`Spawning in current room instead.\n`));
      spawnRoomId = player.currentRoom;
    }
  }

  // Spawn the NPC
  try {
    const spawned = RespawnManager.respawnNPC(npcId, spawnRoomId, world);

    if (spawned) {
      player.send('\n' + colors.success(`${npcId} respawned in ${spawnRoomId}!\n`));
      logger.log(`Admin ${player.username} respawned ${npcId} in ${spawnRoomId}`);
    } else {
      player.send('\n' + colors.error(`Failed to respawn ${npcId}. Check logs for details.\n`));
    }
  } catch (error) {
    player.send('\n' + colors.error(`Error respawning ${npcId}: ${error.message}\n`));
    logger.error(`Admin respawn failed for ${npcId}:`, error);
  }
}

/**
 * Find NPC definition in world
 * @param {string} npcId - NPC ID to find
 * @param {object} world - World instance
 * @returns {object|null} NPC definition or null
 */
function findNPCDefinition(npcId, world) {
  // Search all rooms for an NPC with this ID
  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.npcs) {
      const npc = room.npcs.find(n => n.id === npcId);
      if (npc) {
        return npc;
      }
    }
  }
  return null;
}

module.exports = {
  name: 'respawn',
  aliases: ['spawn', 'summon'],
  description: 'Force an NPC to respawn immediately (admin)',
  usage: 'respawn <npc_id> [here]',
  examples: [
    'respawn purple_wumpy - Respawn in home room',
    'respawn blue_wumpy here - Respawn in current room',
    'spawn grover - Respawn Grover using alias'
  ],
  execute
};
