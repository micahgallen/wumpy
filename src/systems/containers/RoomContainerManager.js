/**
 * Room Container Manager
 *
 * Manages fixed room containers (treasure chests, barrels, crates, etc.)
 * that are permanent fixtures in rooms and cannot be picked up.
 *
 * Key Responsibilities:
 * - Load container definitions from world files
 * - Create and track container instances
 * - Manage container state (open/closed, locked/unlocked)
 * - Handle container inventory
 * - Integrate with existing ContainerManager for portable containers
 *
 * Container Types:
 * - Room Containers: Fixed in place, stored in room.containers array
 * - Portable Containers: Can be picked up (corpses, bags), stored in room.items array
 *
 * Phase 1 (MVP): Basic open/close/get functionality
 * Phase 2: Loot spawning and respawning
 * Phase 3: Persistence across server restarts
 * Phase 4: Advanced features (locks, traps, etc.)
 */

const logger = require('../../logger');
const config = require('../../config/itemsConfig');
const LootSpawner = require('./LootSpawner');
const TimerManager = require('../corpses/TimerManager');

class RoomContainerManager {
  constructor() {
    // Container definitions loaded from world files (blueprints)
    this.definitions = new Map();

    // Active container instances (runtime state)
    this.containers = new Map();

    // Index by room for quick lookup
    this.containersByRoom = new Map();

    // Reference to world instance
    this.world = null;
  }

  /**
   * Initialize the manager with a world instance
   * @param {Object} world - World instance
   */
  initialize(world) {
    this.world = world;
    logger.log('RoomContainerManager initialized');
  }

  /**
   * Register a container definition
   * @param {Object} definition - Container definition object
   */
  registerDefinition(definition) {
    if (!definition.id) {
      logger.warn('Cannot register container definition without ID');
      return false;
    }

    // Validate required fields
    if (!definition.name) {
      logger.warn(`Cannot register container ${definition.id}: missing required field 'name'`);
      return false;
    }

    if (!definition.description) {
      logger.warn(`Cannot register container ${definition.id}: missing required field 'description'`);
      return false;
    }

    if (!definition.keywords || !Array.isArray(definition.keywords) || definition.keywords.length === 0) {
      logger.warn(`Cannot register container ${definition.id}: 'keywords' must be a non-empty array`);
      return false;
    }

    if (!definition.isRoomContainer && definition.containerType !== 'room_container') {
      logger.warn(`Container ${definition.id} is not marked as a room container`);
      return false;
    }

    this.definitions.set(definition.id, definition);
    logger.log(`Registered room container definition: ${definition.id}`);
    return true;
  }

  /**
   * Get a container definition by ID
   * @param {string} definitionId - Container definition ID
   * @returns {Object|null} Container definition or null
   */
  getDefinition(definitionId) {
    return this.definitions.get(definitionId) || null;
  }

  /**
   * Create a container instance from a definition
   * @param {string} definitionId - Container definition ID
   * @param {string} roomId - Room ID where container is located
   * @returns {Object|null} Container instance or null
   */
  createContainerInstance(definitionId, roomId) {
    const definition = this.getDefinition(definitionId);
    if (!definition) {
      logger.error(`Cannot create container: definition ${definitionId} not found`);
      return null;
    }

    // Create unique instance ID
    const instanceId = `${definitionId}_room_${roomId}_${Date.now()}`;

    // Create container instance with runtime state
    const container = {
      // Identity
      id: instanceId,
      definitionId: definitionId,
      roomId: roomId,

      // State
      isOpen: definition.isOpen !== undefined ? definition.isOpen : false,
      isLocked: definition.isLocked !== undefined ? definition.isLocked : false,

      // Inventory
      inventory: [],
      capacity: definition.capacity || this.getDefaultCapacity(definition.containerType),

      // Metadata
      createdAt: Date.now(),
      modifiedAt: Date.now(),

      // Loot tracking (for Phase 2)
      lastLooted: null,
      nextRespawn: null
    };

    // Store the container
    this.containers.set(instanceId, container);

    // Index by room
    if (!this.containersByRoom.has(roomId)) {
      this.containersByRoom.set(roomId, []);
    }
    this.containersByRoom.get(roomId).push(container);

    logger.log(`Created container instance: ${instanceId} in room ${roomId}`);

    // Initialize loot if configured
    this.initializeLoot(instanceId);

    return container;
  }

  /**
   * Get default capacity for container type
   * @param {string} containerType - Container type
   * @returns {number} Default capacity
   */
  getDefaultCapacity(containerType) {
    const capacityByType = config.containers?.capacityByType;
    if (!capacityByType) {
      return config.containers?.defaultCapacity || 20;
    }

    return capacityByType[containerType] || config.containers.defaultCapacity || 20;
  }

  /**
   * Get a container instance by ID
   * @param {string} containerId - Container instance ID
   * @returns {Object|null} Container instance or null
   */
  getContainer(containerId) {
    return this.containers.get(containerId) || null;
  }

  /**
   * Get all containers in a specific room
   * @param {string} roomId - Room ID
   * @returns {Array} Array of container instances
   */
  getContainersByRoom(roomId) {
    return this.containersByRoom.get(roomId) || [];
  }

  /**
   * Find a container in a room by keyword
   * @param {string} roomId - Room ID
   * @param {string} keyword - Keyword to search for
   * @returns {Object|null} Container instance or null
   */
  findContainerByKeyword(roomId, keyword) {
    const containers = this.getContainersByRoom(roomId);
    const normalizedKeyword = keyword.toLowerCase();

    for (const container of containers) {
      const definition = this.getDefinition(container.definitionId);
      if (!definition) continue;

      // Check name
      if (definition.name && definition.name.toLowerCase().includes(normalizedKeyword)) {
        return container;
      }

      // Check keywords
      if (definition.keywords && definition.keywords.some(kw =>
        kw.toLowerCase() === normalizedKeyword ||
        kw.toLowerCase().includes(normalizedKeyword)
      )) {
        return container;
      }
    }

    return null;
  }

  /**
   * Open a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player object (for future permission checks)
   * @returns {Object} {success: boolean, message: string}
   */
  openContainer(containerId, player) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if already open
    if (container.isOpen) {
      return {
        success: false,
        message: `${definition.name} is already open.`
      };
    }

    // Check if locked
    if (container.isLocked) {
      let message = `${definition.name} is locked.`;
      if (definition.keyItemId) {
        message += ` You need ${definition.keyItemId} to unlock it.`;
      }
      return { success: false, message: message };
    }

    // Open the container
    container.isOpen = true;
    container.modifiedAt = Date.now();

    // Get custom message or use default
    const message = definition.onOpen?.message || `You open ${definition.name}.`;

    logger.log(`Player ${player?.username || 'unknown'} opened container ${containerId}`);

    return {
      success: true,
      message: message,
      container: container
    };
  }

  /**
   * Close a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player object (for future permission checks)
   * @returns {Object} {success: boolean, message: string}
   */
  closeContainer(containerId, player) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if already closed
    if (!container.isOpen) {
      return {
        success: false,
        message: `${definition.name} is already closed.`
      };
    }

    // Close the container
    container.isOpen = false;
    container.modifiedAt = Date.now();

    // Get custom message or use default
    const message = definition.onClose?.message || `You close ${definition.name}.`;

    logger.log(`Player ${player?.username || 'unknown'} closed container ${containerId}`);

    return {
      success: true,
      message: message,
      container: container
    };
  }

  /**
   * Add an item to a container
   * @param {string} containerId - Container ID
   * @param {Object} item - Item to add
   * @returns {Object} {success: boolean, message: string}
   */
  addItem(containerId, item) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if container is open
    if (!container.isOpen) {
      return {
        success: false,
        message: `${definition.name} is closed.`
      };
    }

    // Check capacity
    if (container.inventory.length >= container.capacity) {
      return {
        success: false,
        message: `${definition.name} is full.`
      };
    }

    // Add item to inventory
    container.inventory.push(item);
    container.modifiedAt = Date.now();

    return {
      success: true,
      message: `Added ${item.name || 'item'} to ${definition.name}.`
    };
  }

  /**
   * Remove an item from a container
   * @param {string} containerId - Container ID
   * @param {number} itemIndex - Index of item in inventory
   * @returns {Object} {success: boolean, item?: Object, message: string}
   */
  removeItem(containerId, itemIndex) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (itemIndex < 0 || itemIndex >= container.inventory.length) {
      return { success: false, message: 'Item not found in container.' };
    }

    // Remove item from inventory
    const item = container.inventory.splice(itemIndex, 1)[0];
    container.modifiedAt = Date.now();

    // Check if container is now empty and trigger respawn
    if (container.inventory.length === 0) {
      this.onContainerEmptied(containerId);
    }

    return {
      success: true,
      item: item,
      message: 'Item removed from container.'
    };
  }

  /**
   * Get count of all room containers
   * @returns {number} Total number of container instances
   */
  getContainerCount() {
    return this.containers.size;
  }

  /**
   * Get count of container definitions
   * @returns {number} Total number of container definitions
   */
  getDefinitionCount() {
    return this.definitions.size;
  }

  /**
   * Spawn loot for a container based on its loot configuration
   * @param {string} containerId - Container instance ID
   * @returns {Object} {success: boolean, items: Array, message: string}
   */
  spawnLoot(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, items: [], message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, items: [], message: 'Container definition not found.' };
    }

    // Use LootSpawner to generate loot
    const result = LootSpawner.spawnLoot(container, definition);

    if (result.success) {
      // Add spawned items to container inventory
      container.inventory = result.items;
      container.modifiedAt = Date.now();
      container.lastLooted = null; // Reset last looted time
      this.cancelRespawn(containerId); // Cancel any active respawn timer
      container.nextRespawn = null; // Clear respawn timer

      logger.log(`Spawned ${result.items.length} items in container ${containerId}`);
    }

    return result;
  }

  /**
   * Schedule a respawn timer for a container
   * @param {string} containerId - Container instance ID
   * @returns {boolean} True if timer scheduled successfully
   */
  scheduleRespawn(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      logger.warn(`Cannot schedule respawn: container ${containerId} not found`);
      return false;
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      logger.warn(`Cannot schedule respawn: definition ${container.definitionId} not found`);
      return false;
    }

    // Check if respawn is enabled
    if (!definition.lootConfig || !definition.lootConfig.respawnOnEmpty) {
      return false; // Respawn not configured
    }

    // Get respawn delay
    const delay = LootSpawner.getRespawnDelay(definition);

    // Calculate next respawn time
    const nextRespawn = Date.now() + delay;
    container.nextRespawn = nextRespawn;

    // Schedule timer
    const timerId = `container_respawn_${containerId}`;
    TimerManager.schedule(
      timerId,
      delay,
      (data) => this.onContainerRespawn(data.containerId),
      {
        type: 'container_respawn',
        containerId: containerId,
        roomId: container.roomId,
        definitionId: container.definitionId
      }
    );

    logger.log(`Scheduled respawn for container ${containerId} in ${Math.floor(delay / 1000)}s`);
    return true;
  }

  /**
   * Handle container respawn event
   * @param {string} containerId - Container instance ID
   */
  onContainerRespawn(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      logger.warn(`Respawn timer fired for non-existent container: ${containerId}`);
      return;
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      logger.warn(`Respawn timer fired but definition not found: ${container.definitionId}`);
      return;
    }

    // Check if container should actually respawn
    const shouldRespawn = LootSpawner.shouldRespawn(container, definition);
    if (!shouldRespawn.shouldRespawn) {
      logger.log(`Container ${containerId} not ready for respawn: ${shouldRespawn.reason}`);
      return;
    }

    // Clear inventory for full respawn mode
    const respawnMode = LootSpawner.getRespawnMode(definition);
    if (respawnMode === 'full') {
      container.inventory = [];
    }

    // Spawn new loot
    const result = this.spawnLoot(containerId);

    if (result.success) {
      logger.log(`Container ${containerId} respawned with ${result.items.length} items`);

      // Notify players in the room if container is visible
      this.notifyRoomOfRespawn(container, definition);
    } else {
      logger.error(`Failed to respawn container ${containerId}: ${result.message}`);
    }
  }

  /**
   * Notify players in a room that a container has respawned (optional feature)
   * @param {Object} container - Container instance
   * @param {Object} definition - Container definition
   */
  notifyRoomOfRespawn(container, definition) {
    // This is a placeholder for future functionality
    // In a full implementation, you would get all players in the room
    // and send them a message like "You hear a click as the chest refills."
    // For now, we just log it
    logger.debug(`Container ${definition.name} in room ${container.roomId} has respawned`);
  }

  /**
   * Handle container being emptied
   * Called when last item is removed from container
   * @param {string} containerId - Container instance ID
   */
  onContainerEmptied(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      return;
    }

    // Prevent double-scheduling if container is already awaiting respawn
    if (container.nextRespawn !== null) {
      return;
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return;
    }

    // Update last looted time
    container.lastLooted = Date.now();
    container.modifiedAt = Date.now();

    // Schedule respawn if configured
    if (definition.lootConfig && definition.lootConfig.respawnOnEmpty) {
      this.scheduleRespawn(containerId);
      logger.log(`Container ${containerId} emptied, respawn scheduled`);
    }
  }

  /**
   * Initialize loot for a container on creation
   * @param {string} containerId - Container instance ID
   * @returns {boolean} True if loot spawned
   */
  initializeLoot(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      return false;
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return false;
    }

    // Check if should spawn on init
    if (!LootSpawner.shouldSpawnOnInit(definition)) {
      logger.debug(`Container ${containerId} configured to not spawn loot on init`);
      return false;
    }

    // Spawn initial loot
    const result = this.spawnLoot(containerId);

    if (result.success) {
      logger.log(`Initialized container ${containerId} with ${result.items.length} items`);
      return true;
    } else {
      logger.warn(`Failed to initialize loot for container ${containerId}: ${result.message}`);
      return false;
    }
  }

  /**
   * Cancel respawn timer for a container
   * @param {string} containerId - Container instance ID
   * @returns {boolean} True if timer was cancelled
   */
  cancelRespawn(containerId) {
    const timerId = `container_respawn_${containerId}`;
    const cancelled = TimerManager.cancel(timerId);

    if (cancelled) {
      const container = this.getContainer(containerId);
      if (container) {
        container.nextRespawn = null;
      }
      logger.log(`Cancelled respawn timer for container ${containerId}`);
    }

    return cancelled;
  }

  /**
   * Get respawn status for a container
   * @param {string} containerId - Container instance ID
   * @returns {Object} Respawn status info
   */
  getRespawnStatus(containerId) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { exists: false };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { exists: true, configured: false };
    }

    const timerId = `container_respawn_${containerId}`;
    const hasTimer = TimerManager.has(timerId);
    const remainingTime = hasTimer ? TimerManager.getRemainingTime(timerId) : 0;

    return {
      exists: true,
      configured: !!definition.lootConfig?.respawnOnEmpty,
      hasActiveTimer: hasTimer,
      nextRespawn: container.nextRespawn,
      remainingMs: remainingTime,
      remainingSec: Math.floor(remainingTime / 1000),
      lastLooted: container.lastLooted,
      isEmpty: container.inventory.length === 0
    };
  }

  /**
   * Export container state for persistence
   * @returns {Object} Serializable container state
   */
  exportState() {
    const state = {
      version: '1.0.0',
      savedAt: Date.now(),
      containers: {}
    };

    for (const [containerId, container] of this.containers) {
      state.containers[containerId] = {
        id: containerId,
        definitionId: container.definitionId,
        roomId: container.roomId,
        isOpen: container.isOpen,
        isLocked: container.isLocked,
        inventory: container.inventory,
        capacity: container.capacity,
        lastLooted: container.lastLooted,
        nextRespawn: container.nextRespawn,
        createdAt: container.createdAt,
        modifiedAt: container.modifiedAt,
        trapState: container.trapState || null
      };
    }

    return state;
  }

  /**
   * Restore container state from persistence
   * @param {Object} state - Previously exported state
   * @returns {Object} Restoration results
   */
  restoreState(state) {
    if (!state || typeof state !== 'object') {
      logger.warn('restoreState: Invalid state object');
      return { restoredCount: 0, expiredCount: 0, errors: [] };
    }

    const now = Date.now();
    let restoredCount = 0;
    let expiredCount = 0;
    const errors = [];

    // Handle legacy formats
    const containers = state.containers || {};
    const downtime = state.savedAt ? now - state.savedAt : 0;

    logger.log(`Restoring container state (server was down for ${Math.floor(downtime / 1000)}s)`);

    for (const containerId in containers) {
      const containerData = containers[containerId];

      try {
        // Validate definition exists
        const definition = this.getDefinition(containerData.definitionId);
        if (!definition) {
          logger.warn(`Cannot restore container ${containerId}: definition ${containerData.definitionId} not found`);
          errors.push({
            containerId,
            reason: `Definition ${containerData.definitionId} not found`
          });
          continue;
        }

        // Restore container to memory
        const container = {
          id: containerData.id,
          definitionId: containerData.definitionId,
          roomId: containerData.roomId,
          isOpen: containerData.isOpen !== undefined ? containerData.isOpen : false,
          isLocked: containerData.isLocked !== undefined ? containerData.isLocked : false,
          inventory: containerData.inventory || [],
          capacity: containerData.capacity || definition.capacity || this.getDefaultCapacity(definition.containerType),
          lastLooted: containerData.lastLooted || null,
          nextRespawn: containerData.nextRespawn || null,
          createdAt: containerData.createdAt || now,
          modifiedAt: containerData.modifiedAt || now,
          trapState: containerData.trapState || null
        };

        // Store in manager
        this.containers.set(containerId, container);

        // Index by room
        if (!this.containersByRoom.has(container.roomId)) {
          this.containersByRoom.set(container.roomId, []);
        }
        this.containersByRoom.get(container.roomId).push(container);

        // Handle respawn timer restoration
        if (container.nextRespawn && definition.lootConfig?.respawnOnEmpty) {
          const remaining = container.nextRespawn - now;
          const RESPAWN_BUFFER_MS = 100;

          if (remaining <= RESPAWN_BUFFER_MS) {
            // Timer expired during downtime - respawn immediately
            logger.log(`Container ${containerId} respawn timer expired during downtime, respawning now`);
            this.onContainerRespawn(containerId);
            expiredCount++;
          } else {
            // Timer still active - reschedule with remaining time
            const timerId = `container_respawn_${containerId}`;
            TimerManager.schedule(
              timerId,
              remaining,
              (data) => this.onContainerRespawn(data.containerId),
              {
                type: 'container_respawn',
                containerId: containerId,
                roomId: container.roomId,
                definitionId: container.definitionId
              }
            );
            logger.log(`Rescheduled respawn for container ${containerId} in ${Math.floor(remaining / 1000)}s`);
          }
        }

        restoredCount++;
      } catch (error) {
        logger.error(`Failed to restore container ${containerId}: ${error.message}`);
        errors.push({
          containerId,
          reason: error.message
        });
      }
    }

    logger.log(`Restored ${restoredCount} containers, ${expiredCount} respawned immediately, ${errors.length} errors`);

    return {
      restoredCount,
      expiredCount,
      errors,
      downtime
    };
  }

  /**
   * Save container state to disk
   * @param {string} filePath - Path to save file
   * @returns {boolean} True if saved successfully
   */
  saveState(filePath) {
    try {
      const state = this.exportState();

      const dir = require('path').dirname(filePath);
      const fs = require('fs');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      logger.log(`Saved ${Object.keys(state.containers).length} containers to ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save container state: ${error.message}`);
      return false;
    }
  }

  /**
   * Load container state from disk
   * @param {string} filePath - Path to load file
   * @returns {Object} Restoration results
   */
  loadState(filePath) {
    try {
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        logger.log('No container state file found, starting fresh');
        return { restoredCount: 0, expiredCount: 0, errors: [] };
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const state = JSON.parse(rawData);

      return this.restoreState(state);
    } catch (error) {
      logger.error(`Failed to load container state: ${error.message}`);
      return { restoredCount: 0, expiredCount: 0, errors: [{ reason: error.message }] };
    }
  }

  /**
   * Unlock a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player object
   * @param {Object} keyItem - Key item from player inventory
   * @returns {Object} {success: boolean, message: string}
   */
  unlockContainer(containerId, player, keyItem) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if already unlocked
    if (!container.isLocked) {
      return {
        success: false,
        message: `${definition.name} is already unlocked.`
      };
    }

    // Validate key item
    if (!keyItem) {
      return {
        success: false,
        message: 'No key provided.'
      };
    }

    // Check if key matches
    if (definition.keyItemId && keyItem.definitionId !== definition.keyItemId) {
      return {
        success: false,
        message: `${keyItem.name} doesn't fit the lock.`
      };
    }

    // Unlock the container
    container.isLocked = false;
    container.modifiedAt = Date.now();

    // Get custom message or use default
    const message = definition.onUnlock?.message || `You unlock ${definition.name} with ${keyItem.name}.`;

    logger.log(`Player ${player?.username || 'unknown'} unlocked container ${containerId}`);

    return {
      success: true,
      message: message,
      container: container
    };
  }

  /**
   * Lock a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player object
   * @param {Object} keyItem - Key item from player inventory
   * @returns {Object} {success: boolean, message: string}
   */
  lockContainer(containerId, player, keyItem) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if already locked
    if (container.isLocked) {
      return {
        success: false,
        message: `${definition.name} is already locked.`
      };
    }

    // Check if container is open
    if (container.isOpen) {
      return {
        success: false,
        message: `You must close ${definition.name} before locking it.`
      };
    }

    // Validate key item
    if (!keyItem) {
      return {
        success: false,
        message: 'No key provided.'
      };
    }

    // Check if key matches
    if (definition.keyItemId && keyItem.definitionId !== definition.keyItemId) {
      return {
        success: false,
        message: `${keyItem.name} doesn't fit the lock.`
      };
    }

    // Lock the container
    container.isLocked = true;
    container.modifiedAt = Date.now();

    // Get custom message or use default
    const message = definition.onLock?.message || `You lock ${definition.name} with ${keyItem.name}.`;

    logger.log(`Player ${player?.username || 'unknown'} locked container ${containerId}`);

    return {
      success: true,
      message: message,
      container: container
    };
  }

  /**
   * Trigger a trap on a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player who triggered the trap
   * @returns {Object} {success: boolean, trap: Object, message: string}
   */
  triggerTrap(containerId, player) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if container has a trap
    if (!definition.trap) {
      return { success: false, message: 'No trap.' };
    }

    // Check trap state (use instance state if available, otherwise check definition)
    const isArmed = container.trapState?.isArmed !== false && definition.trap.isArmed;
    if (!isArmed) {
      return { success: false, message: 'No armed trap.' };
    }

    const trap = definition.trap;

    logger.log(`Player ${player?.username || 'unknown'} triggered trap on container ${containerId} (type: ${trap.type})`);

    // Disarm trap after triggering (store state in instance, not definition)
    container.trapState = { isArmed: false };
    container.modifiedAt = Date.now();

    // Return trap details for command to handle effects
    return {
      success: true,
      trap: trap,
      message: trap.message || 'A trap is triggered!',
      container: container
    };
  }

  /**
   * Disarm a trap on a container
   * @param {string} containerId - Container ID
   * @param {Object} player - Player attempting to disarm
   * @returns {Object} {success: boolean, message: string}
   */
  disarmTrap(containerId, player) {
    const container = this.getContainer(containerId);
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    const definition = this.getDefinition(container.definitionId);
    if (!definition) {
      return { success: false, message: 'Container definition not found.' };
    }

    // Check if container has a trap
    if (!definition.trap) {
      return { success: false, message: 'No trap to disarm.' };
    }

    if (!definition.trap.isArmed) {
      return { success: false, message: 'Trap is already disarmed.' };
    }

    // Future: Add skill check based on trap difficulty
    // For now, always succeed
    definition.trap.isArmed = false;
    container.modifiedAt = Date.now();

    logger.log(`Player ${player?.username || 'unknown'} disarmed trap on container ${containerId}`);

    return {
      success: true,
      message: `You carefully disarm the trap on ${definition.name}.`,
      container: container
    };
  }

  /**
   * Clear all containers (for testing)
   */
  clearAll() {
    // Cancel all respawn timers
    for (const [containerId] of this.containers) {
      this.cancelRespawn(containerId);
    }

    this.containers.clear();
    this.containersByRoom.clear();
    logger.log('Cleared all room container instances and timers');
  }
}

// Export singleton instance
module.exports = new RoomContainerManager();
