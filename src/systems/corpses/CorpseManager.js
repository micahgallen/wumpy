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
    this.playerCorpseMap = new Map(); // username -> Set<corpseId> (supports multiple corpses)
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
   * Create a corpse from a dead player
   * @param {object} player - Player object who died
   * @param {string} roomId - Room where player died
   * @param {object} killer - NPC or Player who killed them (optional)
   * @param {object} world - World instance
   * @returns {object} Created player corpse container
   */
  createPlayerCorpse(player, roomId, killer, world) {
    try {
      // Validate inputs
      if (!player || !player.username) {
        logger.error('createPlayerCorpse: Invalid player object (missing username)');
        return null;
      }

      if (!roomId) {
        logger.error(`createPlayerCorpse: Invalid roomId for player ${player.username}`);
        return null;
      }

      if (!world) {
        logger.error(`createPlayerCorpse: World instance is null for player ${player.username}`);
        return null;
      }

      // Get corpse configuration
      const config = require('../../config/itemsConfig');
      const corpseConfig = config.corpses || {};
      const playerConfig = corpseConfig.player || {};

      // Create corpse ID
      const timestamp = Date.now();
      const corpseId = `corpse_player_${player.username}_${timestamp}`;

      // Determine killer name
      const killerName = killer ? (killer.name || killer.username || 'Unknown') : 'Unknown';

      // Create corpse description with killer name
      const description = `The lifeless body of ${player.username}. Killed by ${killerName}.`;

      // Generate keywords from player username
      const nameWords = player.username.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      const keywords = ['corpse', 'body', player.username.toLowerCase(), ...nameWords];

      // Collect ALL items (inventory + equipped)
      const allItems = [...(player.inventory || [])];

      // Unequip all equipped items and add to collection
      if (player.equipment) {
        for (const slot in player.equipment) {
          if (player.equipment[slot]) {
            const equippedItem = player.equipment[slot];
            allItems.push(equippedItem);
            player.equipment[slot] = null; // Unequip
          }
        }
      }

      // Apply durability damage to ALL items (death penalty)
      const deathDurabilityLoss = config.durability?.lossOnDeath || 10;
      for (const item of allItems) {
        if (item.durability !== undefined && item.maxDurability !== undefined) {
          const loss = Math.floor(item.maxDurability * (deathDurabilityLoss / 100));
          item.durability = Math.max(0, item.durability - loss);
        }
      }

      // Get player's currency (deep copy to avoid reference issues)
      const playerCurrency = {
        platinum: (player.currency?.platinum || 0),
        gold: (player.currency?.gold || 0),
        silver: (player.currency?.silver || 0),
        copper: (player.currency?.copper || 0)
      };

      // Get room information for deathLocation
      const room = world.getRoom(roomId);
      const deathLocation = room ? room.name : 'Unknown Location';

      // Create corpse container
      const corpse = {
        id: corpseId,
        instanceId: corpseId,
        definitionId: `corpse_player_${player.username}`,
        name: `corpse of ${player.username}`,
        description: description,
        keywords: keywords,

        // Item properties (corpse is a non-pickupable container item)
        itemType: ItemType.CONTAINER,
        containerType: 'player_corpse',
        isPickupable: playerConfig.isPickupable !== undefined ? playerConfig.isPickupable : false,
        weight: playerConfig.baseWeight || 150,
        capacity: playerConfig.capacity || 100,

        // Container properties
        inventory: allItems,
        isOpen: true,  // Corpses are always open (can be looted by owner)
        isLocked: false,

        // Player corpse-specific metadata
        ownerUsername: player.username,
        roomId: roomId,
        deathLocation: deathLocation,
        playerLevel: player.level || 1,
        currency: playerCurrency,
        killerName: killerName,
        createdAt: timestamp,

        // Lifecycle management
        isLooted: false,
        lootedAt: null

        // NO decayTime property (player corpses don't decay)
        // NO npcId property
        // NO spawnLocation property
      };

      // Store corpse
      this.corpses.set(corpseId, corpse);

      // Store in playerCorpseMap (supports multiple corpses per player)
      if (!this.playerCorpseMap.has(player.username)) {
        this.playerCorpseMap.set(player.username, new Set());
      }
      this.playerCorpseMap.get(player.username).add(corpseId);

      // Clear player inventory and equipment
      player.inventory = [];
      if (player.equipment) {
        for (const slot in player.equipment) {
          player.equipment[slot] = null;
        }
      }

      // Clear player currency
      const CurrencyManager = require('../currency/CurrencyManager');
      player.currency = CurrencyManager.createWallet();

      // Add to room.items
      this.addCorpseToRoom(corpse, roomId, world);

      logger.log(`Created player corpse ${corpseId} in room ${roomId} (${allItems.length} items, owner: ${player.username})`);

      return corpse;
    } catch (error) {
      logger.error(`Failed to create player corpse for ${player?.username || 'unknown'}:`, error);
      logger.error(`Error stack: ${error.stack}`);
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
   * Get all corpses for a player (supports multiple deaths)
   * @param {string} username - Player username
   * @returns {Array<object>} Array of corpse objects
   */
  getCorpsesByPlayer(username) {
    const corpseIds = this.playerCorpseMap.get(username);
    if (!corpseIds) {
      return [];
    }
    return Array.from(corpseIds)
      .map(id => this.corpses.get(id))
      .filter(corpse => corpse !== undefined);
  }

  /**
   * Check if a player can loot a player corpse
   * @param {object} corpse - Player corpse object
   * @param {object} player - Player attempting to loot
   * @returns {boolean} True if player owns this corpse
   */
  canLootPlayerCorpse(corpse, player) {
    if (!corpse || corpse.containerType !== 'player_corpse') {
      return false;
    }
    if (corpse.isLooted) {
      return false;
    }
    return corpse.ownerUsername === player.username;
  }

  /**
   * Mark a player corpse as looted (owner retrieved items)
   * @param {string} corpseId - Corpse ID
   * @param {object} player - Player who looted it
   * @param {object} world - World instance
   * @returns {boolean} True if marked successfully
   */
  markCorpseAsLooted(corpseId, player, world) {
    const corpse = this.corpses.get(corpseId);
    if (!corpse || corpse.containerType !== 'player_corpse') {
      return false;
    }

    // Verify ownership
    if (corpse.ownerUsername !== player.username) {
      return false;
    }

    // Mark as looted
    corpse.isLooted = true;
    corpse.lootedAt = Date.now();

    logger.log(`Player corpse ${corpseId} marked as looted by ${player.username}`);

    // Schedule cleanup timer (grace period before removal)
    const config = require('../../config/itemsConfig');
    const playerConfig = config.corpses?.player || {};
    const gracePeriod = playerConfig.lootedGracePeriod || 300000; // 5 minutes default

    TimerManager.schedule(
      `player_corpse_cleanup_${corpseId}`,
      gracePeriod,
      (data) => {
        logger.log(`Cleaning up looted player corpse ${data.corpseId}`);
        this.destroyPlayerCorpse(data.corpseId, world);
      },
      {
        type: 'player_corpse_cleanup',
        corpseId: corpseId,
        username: player.username
      }
    );

    return true;
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
   * Destroy a player corpse (for cleanup after looting or admin commands)
   * @param {string} corpseId - Corpse ID
   * @param {object} world - World instance
   * @returns {boolean} True if corpse was destroyed
   */
  destroyPlayerCorpse(corpseId, world) {
    const corpse = this.corpses.get(corpseId);
    if (!corpse || corpse.containerType !== 'player_corpse') {
      return false;
    }

    // Cancel cleanup timer if exists
    TimerManager.cancel(`player_corpse_cleanup_${corpseId}`);

    // Remove from room
    this.removeCorpseFromRoom(corpseId, corpse.roomId, world);

    // Remove from playerCorpseMap
    if (this.playerCorpseMap.has(corpse.ownerUsername)) {
      this.playerCorpseMap.get(corpse.ownerUsername).delete(corpseId);
      // If no more corpses for this player, remove the entry
      if (this.playerCorpseMap.get(corpse.ownerUsername).size === 0) {
        this.playerCorpseMap.delete(corpse.ownerUsername);
      }
    }

    // Cleanup
    this.corpses.delete(corpseId);

    logger.log(`Destroyed player corpse ${corpseId} (owner: ${corpse.ownerUsername})`);
    return true;
  }

  /**
   * Clean up abandoned player corpses (corpses from inactive players)
   * @param {object} world - World instance
   * @param {object} playerDB - Player database instance
   * @returns {number} Number of corpses cleaned up
   */
  cleanupAbandonedCorpses(world, playerDB) {
    const config = require('../../config/itemsConfig');
    const playerConfig = config.corpses?.player || {};
    const ABANDONMENT_THRESHOLD = playerConfig.abandonmentThreshold || 604800000; // 7 days default

    let cleanedCount = 0;
    const now = Date.now();

    // Iterate through all corpses
    for (const corpse of this.corpses.values()) {
      // Only check player corpses
      if (corpse.containerType !== 'player_corpse') continue;

      // Skip if already looted (cleanup timer already scheduled)
      if (corpse.isLooted) continue;

      // Check corpse age
      const age = now - corpse.createdAt;
      if (age > ABANDONMENT_THRESHOLD) {
        // Check if player has logged in recently
        try {
          const player = playerDB.getPlayer(corpse.ownerUsername);
          if (!player || !player.lastLogin) {
            // Player not found or never logged in, clean up corpse
            logger.log(`Cleaning up abandoned corpse for missing player ${corpse.ownerUsername}`);
            this.destroyPlayerCorpse(corpse.id, world);
            cleanedCount++;
            continue;
          }

          // Check if player has been inactive
          const timeSinceLogin = now - player.lastLogin;
          if (timeSinceLogin > ABANDONMENT_THRESHOLD) {
            logger.log(`Cleaning up abandoned corpse for inactive player ${corpse.ownerUsername} (last login: ${Math.floor(timeSinceLogin / 86400000)} days ago)`);
            this.destroyPlayerCorpse(corpse.id, world);
            cleanedCount++;
          }
        } catch (error) {
          logger.error(`Error checking player ${corpse.ownerUsername} for corpse cleanup: ${error.message}`);
        }
      }
    }

    if (cleanedCount > 0) {
      logger.log(`Cleaned up ${cleanedCount} abandoned player corpses`);
    }

    return cleanedCount;
  }

  /**
   * Export corpse state for persistence
   * @returns {object} Serializable corpse data with separate NPC and player corpses
   */
  exportState() {
    const state = {
      npcCorpses: [],
      playerCorpses: []
    };

    for (const corpse of this.corpses.values()) {
      if (corpse.containerType === 'npc_corpse') {
        // Export NPC corpse
        state.npcCorpses.push({
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
      } else if (corpse.containerType === 'player_corpse') {
        // Export player corpse
        state.playerCorpses.push({
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
          ownerUsername: corpse.ownerUsername,
          roomId: corpse.roomId,
          deathLocation: corpse.deathLocation,
          playerLevel: corpse.playerLevel,
          currency: corpse.currency,
          killerName: corpse.killerName,
          createdAt: corpse.createdAt,
          isLooted: corpse.isLooted,
          lootedAt: corpse.lootedAt
        });
      }
    }

    return state;
  }

  /**
   * Restore corpse state from persistence
   * @param {Array<object>|object} state - Previously exported state (array for old format, object for new format)
   * @param {object} world - World instance
   */
  restoreState(state, world) {
    let restoredNPCCount = 0;
    let restoredPlayerCount = 0;
    const now = Date.now();

    // Handle backward compatibility: old format was an array, new format is an object
    const npcCorpses = Array.isArray(state) ? state : (state.npcCorpses || []);
    const playerCorpses = Array.isArray(state) ? [] : (state.playerCorpses || []);

    // Restore NPC corpses (with decay timers)
    for (const corpseData of npcCorpses) {
      const remaining = corpseData.decayTime - now;

      // Check if corpse expired while server was down
      if (remaining <= 0) {
        logger.log(`NPC corpse ${corpseData.id} expired during downtime, decaying immediately`);

        // Remove from room if it still exists there
        this.removeCorpseFromRoom(corpseData.id, corpseData.spawnLocation, world);

        // Emit decay event for respawn system
        this.emit('corpseDecayed', {
          npcId: corpseData.npcId,
          npcType: corpseData.npcType,
          roomId: corpseData.spawnLocation,
          corpseId: corpseData.id
        });

        // Don't restore expired corpses to memory
        continue;
      }

      // Recreate corpse in memory
      this.corpses.set(corpseData.id, corpseData);
      this.npcCorpseMap.set(corpseData.npcId, corpseData.id);

      // Add back to room
      this.addCorpseToRoom(corpseData, corpseData.spawnLocation, world);

      // Reschedule decay timer with remaining time
      TimerManager.schedule(
        `corpse_decay_${corpseData.id}`,
        remaining,
        (data) => this.onCorpseDecay(data.corpseId, world),
        {
          type: 'corpse_decay',
          corpseId: corpseData.id,
          npcId: corpseData.npcId,
          roomId: corpseData.spawnLocation
        }
      );

      restoredNPCCount++;
    }

    // Restore player corpses (NO decay timers, but cleanup timers if looted)
    for (const playerCorpse of playerCorpses) {
      // If corpse was looted and grace period expired, skip it
      const config = require('../../config/itemsConfig');
      const playerConfig = config.corpses?.player || {};
      const gracePeriod = playerConfig.lootedGracePeriod || 300000; // 5 minutes default

      if (playerCorpse.isLooted && playerCorpse.lootedAt) {
        const timeSinceLooted = now - playerCorpse.lootedAt;
        if (timeSinceLooted > gracePeriod) {
          logger.log(`Player corpse ${playerCorpse.id} grace period expired during downtime, skipping restoration`);
          continue;
        }
      }

      // Recreate corpse in memory
      this.corpses.set(playerCorpse.id, playerCorpse);

      // Store in playerCorpseMap (supports multiple corpses per player)
      if (!this.playerCorpseMap.has(playerCorpse.ownerUsername)) {
        this.playerCorpseMap.set(playerCorpse.ownerUsername, new Set());
      }
      this.playerCorpseMap.get(playerCorpse.ownerUsername).add(playerCorpse.id);

      // Add back to room
      this.addCorpseToRoom(playerCorpse, playerCorpse.roomId, world);

      // If looted, reschedule cleanup timer
      if (playerCorpse.isLooted && playerCorpse.lootedAt) {
        const timeSinceLooted = now - playerCorpse.lootedAt;
        const remaining = gracePeriod - timeSinceLooted;

        if (remaining > 0) {
          TimerManager.schedule(
            `player_corpse_cleanup_${playerCorpse.id}`,
            remaining,
            (data) => {
              logger.log(`Cleaning up looted player corpse ${data.corpseId}`);
              this.destroyPlayerCorpse(data.corpseId, world);
            },
            {
              type: 'player_corpse_cleanup',
              corpseId: playerCorpse.id,
              username: playerCorpse.ownerUsername
            }
          );
        }
      }

      restoredPlayerCount++;
    }

    logger.log(`Restored ${restoredNPCCount} NPC corpses and ${restoredPlayerCount} player corpses`);
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
