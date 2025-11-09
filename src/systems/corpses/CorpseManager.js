/**
 * CorpseManager - Event-Driven Corpse Lifecycle Management
 *
 * Manages corpse creation, decay, and loot for dead NPCs.
 * Uses event-driven timers (NO polling) for optimal performance.
 *
 * Design Principles:
 * - Each corpse schedules its own decay timer
 * - Corpses are pickupable container items
 * - Un-looted items despawn with corpse
 * - Emits events for respawn system integration
 *
 * Performance Characteristics:
 * - createNPCCorpse(): O(1) - constant time operations
 * - onCorpseDecay(): O(1) - array filter is O(C) where C = corpses in room (~5 max)
 * - hasActiveCorpse(): O(1) - hash map lookup
 * - Memory: ~2KB per corpse (mostly loot items)
 */

const logger = require('../../logger');
const TimerManager = require('./TimerManager');
const { ItemType } = require('../../items/schemas/ItemTypes');

class CorpseManager {
  constructor() {
    this.corpses = new Map(); // corpseId -> corpse data
    this.npcCorpseMap = new Map(); // npcId -> corpseId
    this.listeners = {}; // Event listeners
  }

  /**
   * Create a corpse from a dead NPC
   * @param {object} npc - NPC object
   * @param {string} roomId - Room where corpse is created
   * @param {string} killerName - Name of player who killed NPC
   * @param {object} world - World instance
   * @returns {object} Created corpse container
   */
  createNPCCorpse(npc, roomId, killerName, world) {
    try {
      // Generate loot using LootGenerator
      let items = [];
      try {
        const LootGenerator = require('../loot/LootGenerator');
        const lootResult = LootGenerator.generateNPCLoot(npc);
        items = lootResult.items || [];
      } catch (lootError) {
        // LootGenerator may fail if ItemRegistry not loaded (e.g., in tests)
        // Continue with empty loot
        logger.warn(`Failed to generate loot for ${npc.name}: ${lootError.message}`);
      }

      // Get corpse configuration
      const config = require('../../config/itemsConfig');
      const corpseConfig = config.corpses || {};
      const npcConfig = corpseConfig.npc || {};

      // Calculate weight based on NPC size
      const sizeWeights = corpseConfig.sizeWeights || {};
      const npcSize = npc.size || 'medium';
      const baseWeight = sizeWeights[npcSize] || npcConfig.baseWeight || 100;

      // Calculate capacity
      const capacity = npcConfig.capacity || 20;

      // Create corpse ID
      const timestamp = Date.now();
      const corpseId = `corpse_${npc.id}_${timestamp}`;

      // Create corpse description with killer name
      const description = killerName
        ? `The lifeless body of ${npc.name}. Killed by ${killerName}.`
        : `The lifeless body of ${npc.name}.`;

      // Generate keywords from NPC name (split by spaces, lowercase)
      const nameWords = npc.name.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      const keywords = ['corpse', 'body', npc.id, ...nameWords];

      // Create corpse container using existing container structure
      const corpse = {
        id: corpseId,
        instanceId: corpseId,
        definitionId: `corpse_${npc.id}`,
        name: `corpse of ${npc.name}`,
        description: description,
        keywords: keywords,

        // Item properties (corpse is a pickupable container item)
        itemType: ItemType.CONTAINER,
        containerType: 'npc_corpse',
        isPickupable: true,
        weight: baseWeight,
        capacity: capacity,

        // Container properties
        inventory: items,
        isOpen: true,  // Corpses are always open (can be looted)
        isLocked: false,

        // Corpse-specific metadata
        npcId: npc.id,
        npcType: npc.id,
        killerName: killerName,
        spawnLocation: npc.homeRoom || roomId,  // Where NPC respawns (use home room if available)
        createdAt: timestamp,
        decayTime: timestamp + (npcConfig.decayTime || 300000) // 5 minutes default
      };

      // Store corpse
      this.corpses.set(corpseId, corpse);
      this.npcCorpseMap.set(npc.id, corpseId);

      // Add to room.items (since corpse is pickupable)
      this.addCorpseToRoom(corpse, roomId, world);

      // Schedule decay timer
      const delay = corpse.decayTime - Date.now();
      TimerManager.schedule(
        `corpse_decay_${corpseId}`,
        delay,
        (data) => this.onCorpseDecay(data.corpseId, world),
        {
          type: 'corpse_decay',
          corpseId,
          npcId: npc.id,
          roomId: roomId
        }
      );

      logger.log(`Created corpse ${corpseId} in room ${roomId} (decay in ${Math.floor(delay / 1000)}s, ${items.length} items, ${baseWeight} lbs)`);

      return corpse;
    } catch (error) {
      logger.error(`Failed to create NPC corpse for ${npc.name}:`, error);
      return null;
    }
  }

  /**
   * Add corpse to room's item list (since corpses are pickupable)
   * @param {object} corpse - Corpse container
   * @param {string} roomId - Room ID
   * @param {object} world - World instance
   */
  addCorpseToRoom(corpse, roomId, world) {
    const room = world.getRoom(roomId);
    if (room) {
      if (!room.items) {
        room.items = [];
      }
      room.items.push(corpse);
      logger.log(`Added corpse ${corpse.id} to room ${roomId}.items`);
    } else {
      logger.error(`Cannot add corpse to room ${roomId}: room not found`);
    }
  }

  /**
   * Remove corpse from room's item list
   * @param {string} corpseId - Corpse ID
   * @param {string} roomId - Room ID
   * @param {object} world - World instance
   */
  removeCorpseFromRoom(corpseId, roomId, world) {
    const room = world.getRoom(roomId);
    if (room && room.items) {
      room.items = room.items.filter(item => item.id !== corpseId);
      logger.log(`Removed corpse ${corpseId} from room ${roomId}.items`);
    }
  }

  /**
   * Handle corpse decay event
   * @param {string} corpseId - ID of decaying corpse
   * @param {object} world - World instance
   */
  onCorpseDecay(corpseId, world) {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) {
      logger.warn(`Attempted to decay non-existent corpse: ${corpseId}`);
      return;
    }

    logger.log(`Corpse ${corpseId} is decaying (${corpse.inventory.length} items will despawn)`);

    // Remove from room.items
    this.removeCorpseFromRoom(corpseId, corpse.spawnLocation, world);

    // Notify players in room
    this.notifyPlayersInRoom(
      corpse.spawnLocation,
      `The ${corpse.name} decays into dust and blows away.`,
      world
    );

    // Emit decay event for respawn system
    this.emit('corpseDecayed', {
      npcId: corpse.npcId,
      npcType: corpse.npcType,
      roomId: corpse.spawnLocation,
      corpseId
    });

    // Cleanup
    this.corpses.delete(corpseId);
    this.npcCorpseMap.delete(corpse.npcId);

    logger.log(`Corpse ${corpseId} decayed successfully`);
  }

  /**
   * Check if an NPC has an active corpse
   * @param {string} npcId - NPC instance ID
   * @returns {boolean} True if corpse exists
   */
  hasActiveCorpse(npcId) {
    return this.npcCorpseMap.has(npcId);
  }

  /**
   * Get corpse by ID
   * @param {string} corpseId - Corpse ID
   * @returns {object|null} Corpse object or null
   */
  getCorpse(corpseId) {
    return this.corpses.get(corpseId) || null;
  }

  /**
   * Get corpse by NPC ID
   * @param {string} npcId - NPC ID
   * @returns {object|null} Corpse object or null
   */
  getCorpseByNPC(npcId) {
    const corpseId = this.npcCorpseMap.get(npcId);
    return corpseId ? this.getCorpse(corpseId) : null;
  }

  /**
   * Get all active corpses
   * @returns {Array<object>} Array of corpse objects
   */
  getAllCorpses() {
    return Array.from(this.corpses.values());
  }

  /**
   * Get count of active corpses
   * @returns {number} Number of active corpses
   */
  getActiveCorpseCount() {
    return this.corpses.size;
  }

  /**
   * Manually destroy a corpse (for admin commands or special cases)
   * @param {string} corpseId - Corpse ID
   * @param {object} world - World instance
   * @returns {boolean} True if corpse was destroyed
   */
  destroyCorpse(corpseId, world) {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) {
      return false;
    }

    // Cancel decay timer
    TimerManager.cancel(`corpse_decay_${corpseId}`);

    // Remove from room
    this.removeCorpseFromRoom(corpseId, corpse.spawnLocation, world);

    // Cleanup
    this.corpses.delete(corpseId);
    this.npcCorpseMap.delete(corpse.npcId);

    logger.log(`Manually destroyed corpse ${corpseId}`);
    return true;
  }

  /**
   * Export corpse state for persistence
   * @returns {Array<object>} Serializable corpse data
   */
  exportState() {
    const state = [];
    for (const corpse of this.corpses.values()) {
      state.push({
        id: corpse.id,
        instanceId: corpse.instanceId,
        definitionId: corpse.definitionId,
        name: corpse.name,
        description: corpse.description,
        keywords: corpse.keywords,
        itemType: corpse.itemType,
        containerType: corpse.containerType,
        isPickupable: corpse.isPickupable,
        weight: corpse.weight,
        capacity: corpse.capacity,
        inventory: corpse.inventory,
        isOpen: corpse.isOpen,
        isLocked: corpse.isLocked,
        npcId: corpse.npcId,
        npcType: corpse.npcType,
        killerName: corpse.killerName,
        spawnLocation: corpse.spawnLocation,
        createdAt: corpse.createdAt,
        decayTime: corpse.decayTime
      });
    }
    return state;
  }

  /**
   * Restore corpse state from persistence
   * @param {Array<object>} state - Previously exported state
   * @param {object} world - World instance
   */
  restoreState(state, world) {
    let restoredCount = 0;

    for (const corpseData of state) {
      // Recreate corpse in memory
      this.corpses.set(corpseData.id, corpseData);
      this.npcCorpseMap.set(corpseData.npcId, corpseData.id);

      // Add back to room
      this.addCorpseToRoom(corpseData, corpseData.spawnLocation, world);

      restoredCount++;
    }

    logger.log(`Restored ${restoredCount} corpses`);
  }

  /**
   * Simple event emitter
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]) {
        try {
          listener(data);
        } catch (error) {
          logger.error(`Event listener for ${event} failed:`, error);
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
   * Notify players in a room
   * @param {string} roomId - Room ID
   * @param {string} message - Message to send
   * @param {object} world - World instance
   */
  notifyPlayersInRoom(roomId, message, world) {
    // Emit event for server to handle
    // The server/command system will pick this up and broadcast
    this.emit('roomMessage', { roomId, message });
  }

  /**
   * Get debug info about corpses
   * @returns {object} Corpse statistics
   */
  getDebugInfo() {
    const info = {
      activeCorpses: this.corpses.size,
      corpses: []
    };

    for (const corpse of this.corpses.values()) {
      const remaining = corpse.decayTime - Date.now();
      info.corpses.push({
        id: corpse.id,
        npcId: corpse.npcId,
        roomId: corpse.spawnLocation,
        killerName: corpse.killerName,
        itemCount: corpse.inventory.length,
        weight: corpse.weight,
        createdAt: corpse.createdAt,
        decayTime: corpse.decayTime,
        remainingMs: remaining,
        remainingSec: Math.floor(remaining / 1000)
      });
    }

    // Sort by decay time
    info.corpses.sort((a, b) => a.decayTime - b.decayTime);

    return info;
  }
}

// Export singleton instance
module.exports = new CorpseManager();
