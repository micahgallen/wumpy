const RESPAWN_INTERVAL = 60 * 1000; // 60 seconds

class RespawnService {
  constructor(world) {
    this.world = world;
    this.respawnLoop = null;
  }

  start() {
    if (this.respawnLoop) {
      console.warn('Respawn service already running.');
      return;
    }
    console.log('Starting respawn service...');
    this.respawnLoop = setInterval(() => this.checkAndRespawn(), RESPAWN_INTERVAL);
  }

  stop() {
    if (this.respawnLoop) {
      console.log('Stopping respawn service.');
      clearInterval(this.respawnLoop);
      this.respawnLoop = null;
    }
  }

  checkAndRespawn() {
    console.log('Checking for missing NPCs to respawn...');
    for (const roomId in this.world.rooms) {
      const currentRoom = this.world.rooms[roomId];
      const initialRoom = this.world.initialRoomsState[roomId];

      if (!initialRoom || !initialRoom.npcs) {
        continue; // No initial NPC data for this room
      }

      // Identify missing NPCs
      const missingNpcIds = initialRoom.npcs.filter(
        initialNpcId => !currentRoom.npcs.includes(initialNpcId)
      );

      if (missingNpcIds.length > 0) {
        console.log(`Respawning NPCs in room ${roomId}: ${missingNpcIds.join(', ')}`);
        for (const npcId of missingNpcIds) {
          // Add the missing NPC back to the room
          currentRoom.npcs.push(npcId);

          // Reset NPC HP when respawning
          const npc = this.world.getNPC(npcId);
          if (npc) {
            npc.hp = npc.maxHp;
            console.log(`Reset HP for ${npc.name} (${npcId}): ${npc.hp}/${npc.maxHp}`);
          }

          // TODO: Notify players in the room about the respawn
        }
      }
    }
  }
}

module.exports = RespawnService;