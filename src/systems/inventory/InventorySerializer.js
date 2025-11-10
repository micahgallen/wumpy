/**
 * Inventory Serializer
 *
 * Handles serialization and deserialization of player inventories for persistence.
 * Converts item instances to JSON and restores them from stored data.
 *
 * Serialization Format:
 * {
 *   instanceId: string,
 *   definitionId: string,
 *   quantity: number,
 *   durability: number,
 *   maxDurability: number,
 *   isEquipped: boolean,
 *   equippedSlot: string,
 *   boundTo: string,
 *   isAttuned: boolean,
 *   attunedTo: string,
 *   isIdentified: boolean,
 *   enchantments: array,
 *   customName: string,
 *   customDescription: string,
 *   createdAt: number,
 *   modifiedAt: number
 * }
 */

const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const logger = require('../../logger');

class InventorySerializer {
  /**
   * Serialize a player's inventory to JSON-compatible array
   * @param {Object} player - Player object with inventory
   * @returns {Array<Object>} Serialized inventory data
   */
  serializeInventory(player) {
    if (!player || !player.inventory) {
      return [];
    }

    const serialized = [];

    for (const item of player.inventory) {
      try {
        // Use item's toJSON method if available
        if (typeof item.toJSON === 'function') {
          serialized.push(item.toJSON());
        } else {
          // Fallback manual serialization
          serialized.push(this.serializeItem(item));
        }
      } catch (err) {
        logger.error(`Failed to serialize item ${item.name} (${item.instanceId}): ${err.message}`);
      }
    }

    return serialized;
  }

  /**
   * Manually serialize a single item
   * @param {BaseItem} item - Item instance
   * @returns {Object} Serialized item data
   */
  serializeItem(item) {
    return {
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      location: item.location || { type: 'inventory' },
      quantity: item.quantity || 1,
      durability: item.durability,
      maxDurability: item.maxDurability,
      isEquipped: item.isEquipped || false,
      equippedSlot: item.equippedSlot || null,
      boundTo: item.boundTo || null,
      isAttuned: item.isAttuned || false,
      attunedTo: item.attunedTo || null,
      isIdentified: item.isIdentified || false,
      enchantments: item.enchantments || [],
      customName: item.customName || null,
      customDescription: item.customDescription || null,
      createdAt: item.createdAt || Date.now(),
      modifiedAt: item.modifiedAt || Date.now()
    };
  }

  /**
   * Deserialize inventory data and restore item instances
   * @param {Object} player - Player object
   * @param {Array<Object>} serializedData - Serialized inventory data
   * @returns {Array<BaseItem>} Array of restored item instances
   */
  deserializeInventory(player, serializedData) {
    if (!serializedData || !Array.isArray(serializedData)) {
      return [];
    }

    const restoredItems = [];

    for (const itemData of serializedData) {
      try {
        const restoredItem = this.deserializeItem(itemData);
        if (restoredItem) {
          restoredItems.push(restoredItem);
        }
      } catch (err) {
        logger.error(`Failed to deserialize item ${itemData.definitionId}: ${err.message}`);
        // Continue with other items even if one fails
      }
    }

    logger.debug(`Restored ${restoredItems.length}/${serializedData.length} items for ${player.username}`);

    // Consolidate stacks after deserialization
    const consolidated = this.consolidateStacks(restoredItems);
    if (consolidated.length < restoredItems.length) {
      logger.debug(`Consolidated ${restoredItems.length} items into ${consolidated.length} stacks`);
    }

    return consolidated;
  }

  /**
   * Deserialize a single item
   * @param {Object} itemData - Serialized item data
   * @returns {BaseItem|null} Restored item instance or null if definition missing
   */
  deserializeItem(itemData) {
    if (!itemData || !itemData.definitionId) {
      logger.error('Cannot deserialize item: missing definitionId');
      return null;
    }

    // Get item definition from registry
    const definition = ItemRegistry.getItem(itemData.definitionId);

    if (!definition) {
      logger.error(`Cannot deserialize item: definition "${itemData.definitionId}" not found in registry`);
      return null;
    }

    // Restore item instance using factory
    const restoredItem = ItemFactory.restoreItem(itemData, definition);

    return restoredItem;
  }

  /**
   * Validate serialized inventory data
   * @param {Array} inventoryData - Serialized inventory data
   * @returns {Object} {valid: boolean, errors: Array<string>}
   */
  validateInventoryData(inventoryData) {
    const errors = [];

    if (!Array.isArray(inventoryData)) {
      errors.push('Inventory data must be an array');
      return { valid: false, errors };
    }

    for (let i = 0; i < inventoryData.length; i++) {
      const item = inventoryData[i];

      if (typeof item !== 'object' || item === null) {
        errors.push(`Item at index ${i} is not an object`);
        continue;
      }

      // Required fields
      if (!item.instanceId) {
        errors.push(`Item at index ${i} missing instanceId`);
      }

      if (!item.definitionId) {
        errors.push(`Item at index ${i} missing definitionId`);
      }

      // Validate types
      if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity < 1)) {
        errors.push(`Item at index ${i} has invalid quantity: ${item.quantity}`);
      }

      if (item.durability !== undefined && item.durability !== null && typeof item.durability !== 'number') {
        errors.push(`Item at index ${i} has invalid durability type`);
      }

      if (item.isEquipped !== undefined && typeof item.isEquipped !== 'boolean') {
        errors.push(`Item at index ${i} has invalid isEquipped type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a backup of inventory data
   * @param {Array<Object>} inventoryData - Serialized inventory
   * @returns {string} JSON string of backup
   */
  createBackup(inventoryData) {
    return JSON.stringify({
      backup: true,
      timestamp: Date.now(),
      inventory: inventoryData
    }, null, 2);
  }

  /**
   * Restore from backup
   * @param {string} backupJson - JSON backup string
   * @returns {Array<Object>|null} Restored inventory data or null if invalid
   */
  restoreFromBackup(backupJson) {
    try {
      const backup = JSON.parse(backupJson);

      if (!backup.backup || !backup.inventory) {
        logger.error('Invalid backup format');
        return null;
      }

      logger.log(`Restoring inventory backup from ${new Date(backup.timestamp).toISOString()}`);

      return backup.inventory;
    } catch (err) {
      logger.error(`Failed to restore backup: ${err.message}`);
      return null;
    }
  }

  /**
   * Get inventory statistics from serialized data
   * @param {Array<Object>} inventoryData - Serialized inventory
   * @returns {Object} Statistics
   */
  getInventoryDataStats(inventoryData) {
    if (!Array.isArray(inventoryData)) {
      return {
        totalItems: 0,
        totalQuantity: 0,
        equippedItems: 0,
        boundItems: 0,
        attunedItems: 0
      };
    }

    return {
      totalItems: inventoryData.length,
      totalQuantity: inventoryData.reduce((sum, item) => sum + (item.quantity || 1), 0),
      equippedItems: inventoryData.filter(item => item.isEquipped).length,
      boundItems: inventoryData.filter(item => item.boundTo).length,
      attunedItems: inventoryData.filter(item => item.isAttuned).length
    };
  }

  /**
   * Clean up inventory data by removing invalid entries
   * @param {Array<Object>} inventoryData - Serialized inventory
   * @returns {Array<Object>} Cleaned inventory data
   */
  cleanInventoryData(inventoryData) {
    if (!Array.isArray(inventoryData)) {
      return [];
    }

    return inventoryData.filter(item => {
      // Must be an object with required fields
      if (!item || typeof item !== 'object') {
        logger.warn('Removing invalid item (not an object)');
        return false;
      }

      if (!item.instanceId || !item.definitionId) {
        logger.warn(`Removing item with missing ID: ${JSON.stringify(item)}`);
        return false;
      }

      // Check if definition still exists
      if (!ItemRegistry.hasItem(item.definitionId)) {
        logger.warn(`Removing item with missing definition: ${item.definitionId}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Consolidate stackable items in an inventory array
   * @param {Array<BaseItem>} items - Array of item instances
   * @returns {Array<BaseItem>} Consolidated array with merged stacks
   */
  consolidateStacks(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const consolidated = [];

    for (const item of items) {
      if (!item.isStackable) {
        // Non-stackable items just get added
        consolidated.push(item);
        continue;
      }

      // Try to find an existing stack this can merge with
      const existingStack = consolidated.find(existing => existing.canStackWith(item));

      if (existingStack) {
        // Merge into existing stack
        existingStack.quantity += item.quantity;
        existingStack.modifiedAt = Date.now();
        logger.debug(`Consolidated ${item.name}: merged ${item.quantity} into existing stack`);
      } else {
        // No matching stack found, add as new
        consolidated.push(item);
      }
    }

    return consolidated;
  }

  /**
   * Merge multiple inventory arrays (useful for transfers)
   * @param {...Array<Object>} inventories - Multiple inventory arrays
   * @returns {Array<Object>} Merged inventory
   */
  mergeInventories(...inventories) {
    const merged = [];
    const seenIds = new Set();

    for (const inventory of inventories) {
      if (!Array.isArray(inventory)) {
        continue;
      }

      for (const item of inventory) {
        // Prevent duplicate instance IDs
        if (seenIds.has(item.instanceId)) {
          logger.warn(`Duplicate instance ID detected during merge: ${item.instanceId}`);
          continue;
        }

        merged.push(item);
        seenIds.add(item.instanceId);
      }
    }

    return merged;
  }
}

// Export singleton instance
module.exports = new InventorySerializer();
