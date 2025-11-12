/**
 * Loot Spawner for Room Containers
 *
 * Handles spawning and respawning of loot in room containers based on
 * their loot configuration. Integrates with existing LootGenerator and
 * ItemRegistry systems.
 *
 * Key Features:
 * - Spawn guaranteed items on container creation
 * - Spawn random items from loot tables
 * - Support for spawn chances
 * - Respawn logic based on container state
 * - Integration with existing loot systems
 *
 * Design Principles:
 * - Leverage existing LootGenerator for consistency
 * - Use ItemRegistry for item creation
 * - Support D&D 5e loot conventions
 * - Flexible configuration per container
 */

const logger = require('../../logger');
const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const LootGenerator = require('../loot/LootGenerator');

class LootSpawner {
  /**
   * Spawn loot for a room container based on its lootConfig
   * @param {Object} container - Container instance
   * @param {Object} containerDef - Container definition with lootConfig
   * @returns {Object} {success: boolean, items: Array<Object>, message: string}
   */
  static spawnLoot(container, containerDef) {
    if (!containerDef.lootConfig) {
      return {
        success: false,
        items: [],
        message: 'No loot configuration defined for this container.'
      };
    }

    const lootConfig = containerDef.lootConfig;
    const spawnedItems = [];

    try {
      // Spawn guaranteed items
      if (lootConfig.guaranteedItems && Array.isArray(lootConfig.guaranteedItems)) {
        const guaranteedItems = this.spawnGuaranteedItems(lootConfig.guaranteedItems);
        spawnedItems.push(...guaranteedItems);
      }

      // Spawn random items from loot tables
      if (lootConfig.randomItems) {
        const randomItems = this.spawnRandomItems(lootConfig.randomItems);
        spawnedItems.push(...randomItems);
      }

      // Check max items limit
      const maxItems = lootConfig.maxItems || container.capacity;
      if (spawnedItems.length > maxItems) {
        // Trim to max items, keeping guaranteed items first
        spawnedItems.splice(maxItems);
        logger.log(`Spawned loot trimmed to maxItems limit (${maxItems}) for container ${container.id}`);
      }

      logger.log(`Spawned ${spawnedItems.length} items for container ${container.id} (${containerDef.name})`);

      return {
        success: true,
        items: spawnedItems,
        message: `Spawned ${spawnedItems.length} items successfully.`
      };

    } catch (error) {
      logger.error(`Failed to spawn loot for container ${container.id}:`, error);
      return {
        success: false,
        items: [],
        message: `Loot spawning failed: ${error.message}`
      };
    }
  }

  /**
   * Spawn guaranteed items from loot config
   * @param {Array<Object>} guaranteedConfig - Array of guaranteed item configs
   * @returns {Array<Object>} Array of spawned item instances
   */
  static spawnGuaranteedItems(guaranteedConfig) {
    const items = [];

    for (const config of guaranteedConfig) {
      // Roll for spawn chance
      const roll = Math.random() * 100;
      const chance = config.chance !== undefined ? config.chance : 100;

      if (roll > chance) {
        logger.debug(`Guaranteed item ${config.itemId} failed spawn chance (${roll.toFixed(1)} > ${chance})`);
        continue; // Failed spawn chance
      }

      // Get item definition
      const itemDef = ItemRegistry.getItem(config.itemId);
      if (!itemDef) {
        logger.warn(`Guaranteed item ${config.itemId} not found in ItemRegistry`);
        continue;
      }

      // Create item instance
      const quantity = config.quantity || 1;
      const item = ItemFactory.createItem(itemDef);

      // Set quantity for stackable items
      if (item.isStackable) {
        item.quantity = quantity;
        items.push(item);
        logger.debug(`Spawned guaranteed item: ${itemDef.name} x${quantity}`);
      } else if (!item.isStackable && quantity > 1) {
        // For non-stackable items, create multiple instances
        for (let i = 0; i < quantity; i++) {
          const duplicateItem = ItemFactory.createItem(itemDef);
          items.push(duplicateItem);
        }
        logger.debug(`Spawned guaranteed item: ${itemDef.name} x${quantity} (as separate instances)`);
      } else {
        // Single non-stackable item
        items.push(item);
        logger.debug(`Spawned guaranteed item: ${itemDef.name}`);
      }
    }

    return items;
  }

  /**
   * Spawn random items from loot tables
   * @param {Object} randomConfig - Random loot configuration
   * @returns {Array<Object>} Array of spawned item instances
   */
  static spawnRandomItems(randomConfig) {
    if (!randomConfig.lootTable) {
      logger.warn('Random loot config missing lootTable property');
      return [];
    }

    const itemCount = randomConfig.count || 3;
    const lootTable = randomConfig.lootTable;
    const level = randomConfig.level || 1;
    const spawnTags = randomConfig.spawnTags || null;

    // Use LootGenerator to generate random loot
    const items = LootGenerator.generateLoot({
      lootTables: [lootTable],
      spawnTags: spawnTags,
      itemCount: itemCount,
      level: level,
      allowDuplicates: randomConfig.allowDuplicates !== undefined ? randomConfig.allowDuplicates : false,
      includeCurrency: randomConfig.includeCurrency !== undefined ? randomConfig.includeCurrency : true
    });

    logger.debug(`Generated ${items.length} random items from loot table ${lootTable}`);

    return items;
  }

  /**
   * Check if a container should respawn loot
   * @param {Object} container - Container instance
   * @param {Object} containerDef - Container definition
   * @returns {Object} {shouldRespawn: boolean, reason: string}
   */
  static shouldRespawn(container, containerDef) {
    const lootConfig = containerDef.lootConfig;

    // No loot config = no respawn
    if (!lootConfig) {
      return {
        shouldRespawn: false,
        reason: 'No loot configuration defined'
      };
    }

    // Respawn disabled
    if (!lootConfig.respawnOnEmpty) {
      return {
        shouldRespawn: false,
        reason: 'Respawn is disabled for this container'
      };
    }

    // Check respawn mode
    const respawnMode = lootConfig.respawnMode || 'empty';

    switch (respawnMode) {
      case 'empty':
        // Only respawn if completely empty
        if (container.inventory.length > 0) {
          return {
            shouldRespawn: false,
            reason: 'Container is not empty (respawnMode: empty)'
          };
        }
        break;

      case 'partial':
        // Respawn missing items (not implemented in this phase)
        return {
          shouldRespawn: false,
          reason: 'Partial respawn mode not yet implemented'
        };

      case 'full':
        // Always respawn (clear and refill)
        logger.debug('Container will respawn in full mode (clearing existing items)');
        break;

      default:
        logger.warn(`Unknown respawn mode: ${respawnMode}`);
        return {
          shouldRespawn: false,
          reason: `Unknown respawn mode: ${respawnMode}`
        };
    }

    // Check if enough time has passed since last loot
    if (container.lastLooted) {
      const now = Date.now();
      const timeSinceLooted = now - container.lastLooted;
      const respawnDelay = lootConfig.respawnDelay || 300000; // Default 5 minutes

      if (timeSinceLooted < respawnDelay) {
        const remainingMs = respawnDelay - timeSinceLooted;
        const remainingSec = Math.floor(remainingMs / 1000);
        return {
          shouldRespawn: false,
          reason: `Respawn delay not met (${remainingSec}s remaining)`
        };
      }
    }

    // All checks passed
    return {
      shouldRespawn: true,
      reason: 'Container ready for respawn'
    };
  }

  /**
   * Calculate respawn delay for a container
   * @param {Object} containerDef - Container definition
   * @returns {number} Respawn delay in milliseconds
   */
  static getRespawnDelay(containerDef) {
    if (!containerDef.lootConfig || !containerDef.lootConfig.respawnDelay) {
      return 300000; // Default 5 minutes
    }
    return containerDef.lootConfig.respawnDelay;
  }

  /**
   * Get respawn mode for a container
   * @param {Object} containerDef - Container definition
   * @returns {string} Respawn mode ('empty', 'partial', 'full')
   */
  static getRespawnMode(containerDef) {
    if (!containerDef.lootConfig || !containerDef.lootConfig.respawnMode) {
      return 'empty'; // Default mode
    }
    return containerDef.lootConfig.respawnMode;
  }

  /**
   * Check if loot should spawn on container initialization
   * @param {Object} containerDef - Container definition
   * @returns {boolean} True if should spawn on init
   */
  static shouldSpawnOnInit(containerDef) {
    if (!containerDef.lootConfig) {
      return false;
    }
    return containerDef.lootConfig.spawnOnInit !== undefined
      ? containerDef.lootConfig.spawnOnInit
      : true; // Default to true
  }

  /**
   * Get statistics about spawned loot (for debugging)
   * @param {Array<Object>} items - Spawned items
   * @returns {Object} Statistics
   */
  static getLootStats(items) {
    const stats = {
      totalItems: items.length,
      byRarity: {},
      byType: {},
      totalValue: 0
    };

    for (const item of items) {
      // Count by rarity
      const rarity = item.rarity || 'common';
      stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;

      // Count by type
      const type = item.itemType || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Sum value
      if (item.value) {
        stats.totalValue += item.value * (item.quantity || 1);
      }
    }

    return stats;
  }
}

module.exports = LootSpawner;
