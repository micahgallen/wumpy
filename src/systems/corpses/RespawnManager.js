/**
 * RespawnManager - Event-Driven NPC Respawn System
 *
 * Handles NPC respawning triggered by corpse decay events from CorpseManager.
 * Uses event-driven architecture (NO polling) for optimal performance.
 *
 * Design Principles:
 * - Event-driven: Responds to corpseDecayed events only
 * - Prevents duplicate NPCs from spawning
 * - Handles edge cases gracefully (missing rooms, already spawned NPCs)
 * - Resets NPC health and state on respawn
 * - Provides manual check method for server startup edge cases
 *
 * Performance Characteristics:
 * - respawnNPC(): O(1) - constant time operations
 * - Event-driven: Zero CPU overhead when no corpses decay
 * - No polling loops or background timers
 *
 * Integration:
 * - Listens to CorpseManager 'corpseDecayed' events
 * - Updates world.rooms NPC arrays
 * - Broadcasts messages to players in affected rooms
 * - Replaces the old polling-based RespawnService
 */

const logger = require('../../logger');

class RespawnManager {
  /**
   * Initialize the RespawnManager
   * @param {object} world - World instance
   */
  constructor(world) {
    this.world = world;
    this.listeners = {};
    // Don't set up event listeners until world is set
    if (world) {
      this.setupEventListeners();
      logger.log('RespawnManager initialized (event-driven mode)');
    }
  }

  /**
   * Set up event listeners for corpse decay
   * This is the core of the event-driven architecture
   */
  setupEventListeners() {
    const CorpseManager = require('./CorpseManager');

    // Listen for corpse decay events
    CorpseManager.on('corpseDecayed', (data) => {
      this.handleCorpseDecay(data);
    });

    // Listen for room messages (to broadcast to players)
    CorpseManager.on('roomMessage', (data) => {
      // Forward room messages to server (if needed)
      // The server/broadcasting logic will handle actual player notifications
      this.emit('roomMessage', data);
    });

    logger.log('RespawnManager event listeners registered');
  }

  /**
   * Handle corpse decay event from CorpseManager
   * @param {object} data - Decay event data
   * @param {string} data.npcId - NPC instance ID
   * @param {string} data.npcType - NPC type/definition ID
   * @param {string} data.roomId - Room where NPC should respawn
   * @param {string} data.corpseId - ID of decayed corpse
   */
  handleCorpseDecay(data) {
    const { npcId, npcType, roomId, corpseId } = data;

    logger.log(`Handling corpse decay: ${corpseId} -> respawning ${npcId} in ${roomId}`);

    // Respawn the NPC at its original spawn location
    this.respawnNPC(npcId, roomId);
  }

  /**
   * Respawn an NPC at its original spawn location
   * @param {string} npcId - NPC instance ID to respawn
   * @param {string} spawnRoomId - Room ID where NPC should respawn
   * @returns {boolean} True if respawn succeeded
   */
  respawnNPC(npcId, spawnRoomId) {
    // 1. Validate spawn room exists
    const room = this.world.getRoom(spawnRoomId);
    if (!room) {
      logger.error(`Cannot respawn ${npcId}: room ${spawnRoomId} not found`);
      return false;
    }

    // 2. Check if NPC already exists in room (prevent duplicates)
    if (room.npcs && room.npcs.includes(npcId)) {
      logger.warn(`NPC ${npcId} already exists in room ${spawnRoomId}, skipping respawn`);
      return false;
    }

    // 3. Add NPC to room's NPC array
    if (!room.npcs) {
      room.npcs = [];
    }
    room.npcs.push(npcId);

    // 4. Reset NPC health and state
    const npc = this.world.getNPC(npcId);
    if (npc) {
      // Reset HP to maximum
      npc.hp = npc.maxHp;

      // Reset any combat-related state (if needed)
      // npc.target = null;  // If NPCs track targets
      // npc.inCombat = false;  // If NPCs have combat flags

      logger.log(`Respawned ${npc.name} (${npcId}) in ${spawnRoomId} with ${npc.hp}/${npc.maxHp} HP`);
    } else {
      logger.warn(`NPC definition not found for ${npcId} during respawn`);
    }

    // 5. Broadcast respawn message to players in room
    this.notifyPlayersInRoom(spawnRoomId, npc);

    return true;
  }

  /**
   * Notify players in a room about NPC respawn
   * @param {string} roomId - Room ID
   * @param {object} npc - NPC that respawned
   */
  notifyPlayersInRoom(roomId, npc) {
    if (!npc) return;

    const message = `${npc.name} appears in the room.`;

    // Emit event for server to handle broadcasting
    // The server will pick this up and send to all players in the room
    this.emit('roomMessage', { roomId, message });

    logger.log(`Broadcast respawn message to room ${roomId}: ${message}`);
  }

  /**
   * Manual respawn check for edge cases
   *
   * Used during:
   * - Server startup (to catch any NPCs that should exist but don't)
   * - Admin commands
   * - Recovery from errors
   *
   * This method checks all rooms for missing NPCs and respawns them
   * if they don't have an active corpse. This is NOT called on a loop,
   * only on-demand when needed.
   *
   * @returns {number} Number of NPCs respawned
   */
  checkAndRespawnMissing() {
    logger.log('Manual respawn check initiated (checking all rooms)');

    const CorpseManager = require('./CorpseManager');
    let respawnedCount = 0;

    for (const roomId in this.world.rooms) {
      const currentRoom = this.world.rooms[roomId];
      const initialRoom = this.world.initialRoomsState[roomId];

      // Skip rooms with no initial NPC data
      if (!initialRoom || !initialRoom.npcs) {
        continue;
      }

      // Identify missing NPCs (in initial state but not in current room)
      const missingNpcIds = initialRoom.npcs.filter(
        initialNpcId => !currentRoom.npcs || !currentRoom.npcs.includes(initialNpcId)
      );

      // Respawn missing NPCs (but skip if they have an active corpse)
      for (const npcId of missingNpcIds) {
        // Don't respawn if corpse still exists
        if (CorpseManager.hasActiveCorpse(npcId)) {
          logger.log(`NPC ${npcId} has active corpse, skipping manual respawn`);
          continue;
        }

        // Respawn the missing NPC
        const success = this.respawnNPC(npcId, roomId);
        if (success) {
          respawnedCount++;
        }
      }
    }

    logger.log(`Manual respawn check complete: ${respawnedCount} NPCs respawned`);
    return respawnedCount;
  }

  /**
   * Initialize with world instance (call after world is loaded)
   * @param {object} world - World instance
   */
  initialize(world) {
    this.world = world;
    this.setupEventListeners();
    logger.log('RespawnManager initialized (event-driven mode)');
  }

  /**
   * Simple event emitter implementation
   * Allows RespawnManager to emit events that server can listen to
   *
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        try {
          listener(data);
        } catch (error) {
          logger.error(`RespawnManager event listener for '${event}' failed:`, error);
        }
      }
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  /**
   * Get debug info about respawn state
   * @returns {object} Respawn statistics
   */
  getDebugInfo() {
    const CorpseManager = require('./CorpseManager');

    const info = {
      totalRooms: Object.keys(this.world.rooms).length,
      roomsWithNPCs: 0,
      totalNPCs: 0,
      activeCorpses: CorpseManager.getActiveCorpseCount(),
      missingNPCs: []
    };

    // Count current state
    for (const roomId in this.world.rooms) {
      const room = this.world.rooms[roomId];
      if (room.npcs && room.npcs.length > 0) {
        info.roomsWithNPCs++;
        info.totalNPCs += room.npcs.length;
      }

      // Check for missing NPCs
      const initialRoom = this.world.initialRoomsState[roomId];
      if (initialRoom && initialRoom.npcs) {
        const missingNpcIds = initialRoom.npcs.filter(
          initialNpcId => !room.npcs || !room.npcs.includes(initialNpcId)
        );

        for (const npcId of missingNpcIds) {
          const hasCorpse = CorpseManager.hasActiveCorpse(npcId);
          info.missingNPCs.push({
            npcId,
            roomId,
            hasCorpse,
            shouldRespawn: !hasCorpse
          });
        }
      }
    }

    return info;
  }
}

// Export singleton instance
module.exports = new RespawnManager(null); // World will be set during initialization
