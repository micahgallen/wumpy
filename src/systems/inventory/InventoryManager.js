/**
 * Inventory Manager
 *
 * Manages player inventory with hybrid encumbrance (slots + weight).
 * Handles item stacking, weight calculations, and inventory operations.
 *
 * Encumbrance Rules:
 * - Max Slots = baseSlots + (STR modifier × slotsPerStrength)
 * - Max Weight = baseWeight + (STR × weightPerStrength)
 * - Items blocked when either limit exceeded
 *
 * Stacking Rules:
 * - Equipment items NEVER stack
 * - Consumables stack up to consumableStackSize
 * - Currency stacks up to currencyStackSize
 * - Materials stack up to materialStackSize
 */

const config = require('../../config/itemsConfig');
const logger = require('../../logger');
const { ItemType } = require('../../items/schemas/ItemTypes');

class InventoryManager {
  /**
   * Add an item to a player's inventory
   * @param {Object} player - Player object
   * @param {BaseItem} itemInstance - Item instance to add
   * @returns {Object} {success: boolean, reason?: string, stackedWith?: string}
   */
  addItem(player, itemInstance) {
    if (!player || !itemInstance) {
      return { success: false, reason: 'Invalid player or item' };
    }

    // Initialize inventory if it doesn't exist
    if (!player.inventory) {
      player.inventory = [];
    }

    // For stackable items, validate quantity doesn't exceed max stack size
    // If it does, split into multiple stacks
    if (itemInstance.isStackable) {
      const maxStackSize = this.getMaxStackSize(itemInstance);

      // If item quantity exceeds max stack, we need to add it in chunks
      if (itemInstance.quantity > maxStackSize) {
        logger.log(`Splitting oversized stack: ${itemInstance.quantity}x ${itemInstance.name} (max: ${maxStackSize})`);

        let remaining = itemInstance.quantity;
        let addedCount = 0;

        while (remaining > 0) {
          const chunkSize = Math.min(remaining, maxStackSize);

          // Clone the item with the chunk size
          const ItemFactory = require('../../items/ItemFactory');
          const chunk = ItemFactory.cloneItem(itemInstance, { quantity: chunkSize });

          // Recursively add the chunk (this will handle stacking with existing stacks)
          const result = this.addItem(player, chunk);

          if (result.success) {
            remaining -= chunkSize;
            addedCount += chunkSize;
          } else {
            // Failed to add chunk - return partial success if we added some
            if (addedCount > 0) {
              return {
                success: true,
                partial: true,
                addedCount: addedCount,
                reason: `Only added ${addedCount}/${itemInstance.quantity}: ${result.reason}`
              };
            }
            return result;
          }
        }

        return { success: true, addedCount: addedCount };
      }

      // Normal-sized stack - try to merge with existing
      const stackResult = this.stackItem(player, itemInstance);
      if (stackResult.success) {
        logger.log(`Stacked ${itemInstance.quantity}x ${itemInstance.name} with ${stackResult.addedTo}`);
        return {
          success: true,
          stackedWith: stackResult.addedTo
        };
      }
    }

    // Check encumbrance before adding new item
    const canAdd = this.canAddItem(player, itemInstance);
    if (!canAdd.canAdd) {
      return { success: false, reason: canAdd.reason };
    }

    // Add item to inventory
    player.inventory.push(itemInstance);

    logger.log(`Added ${itemInstance.name} (${itemInstance.instanceId}) to ${player.username}'s inventory`);

    return { success: true };
  }

  /**
   * Remove an item from player's inventory by instance ID
   * @param {Object} player - Player object
   * @param {string} instanceId - Item instance ID
   * @returns {BaseItem|null} Removed item instance or null
   */
  removeItem(player, instanceId) {
    if (!player || !player.inventory || !instanceId) {
      return null;
    }

    const index = player.inventory.findIndex(item => item.instanceId === instanceId);
    if (index === -1) {
      return null;
    }

    const removedItem = player.inventory.splice(index, 1)[0];
    logger.log(`Removed ${removedItem.name} (${instanceId}) from ${player.username}'s inventory`);

    return removedItem;
  }

  /**
   * Find an item in player's inventory by keyword
   * Searches through all items and matches keywords
   * @param {Object} player - Player object
   * @param {string} keyword - Keyword to search for
   * @returns {BaseItem|null} First matching item or null
   */
  findItemByKeyword(player, keyword) {
    if (!player || !player.inventory || !keyword) {
      return null;
    }

    const normalizedKeyword = keyword.toLowerCase();

    return player.inventory.find(item => {
      // Check if item name contains keyword
      if (item.name.toLowerCase().includes(normalizedKeyword)) {
        return true;
      }

      // Check if any item keyword matches
      if (item.keywords && item.keywords.some(kw => kw.toLowerCase() === normalizedKeyword)) {
        return true;
      }

      return false;
    }) || null;
  }

  /**
   * Find all items matching a keyword
   * @param {Object} player - Player object
   * @param {string} keyword - Keyword to search for
   * @returns {Array<BaseItem>} Array of matching items
   */
  findItemsByKeyword(player, keyword) {
    if (!player || !player.inventory || !keyword) {
      return [];
    }

    const normalizedKeyword = keyword.toLowerCase();

    return player.inventory.filter(item => {
      if (item.name.toLowerCase().includes(normalizedKeyword)) {
        return true;
      }

      if (item.keywords && item.keywords.some(kw => kw.toLowerCase() === normalizedKeyword)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Check if an item can be added to inventory
   * @param {Object} player - Player object
   * @param {BaseItem|Object} itemDefinitionOrInstance - Item to check
   * @param {number} [quantity=1] - Quantity to add (for stackables)
   * @returns {Object} {canAdd: boolean, reason?: string}
   */
  canAddItem(player, itemDefinitionOrInstance, quantity = 1) {
    if (!player || !itemDefinitionOrInstance) {
      return { canAdd: false, reason: 'Invalid player or item' };
    }

    // Calculate current and max capacity
    const currentWeight = this.getWeight(player);
    const maxWeight = this.getMaxWeight(player);
    const currentSlots = this.getSlots(player);
    const maxSlots = this.getMaxSlots(player);

    // Get item weight (handle both instances and definitions)
    const itemWeight = itemDefinitionOrInstance.weight || 0;
    const totalWeight = itemWeight * quantity;

    // Check if item would stack (doesn't use a new slot)
    const isStackable = itemDefinitionOrInstance.isStackable || false;
    let usesNewSlot = true;

    if (isStackable) {
      // Check if there's an existing stack this can merge with
      const existingStack = player.inventory?.find(item =>
        item.isStackable &&
        item.definitionId === (itemDefinitionOrInstance.definitionId || itemDefinitionOrInstance.id) &&
        !item.boundTo &&
        !item.isEquipped
      );

      if (existingStack) {
        const maxStack = this.getMaxStackSize(itemDefinitionOrInstance);
        if (existingStack.quantity + quantity <= maxStack) {
          usesNewSlot = false;
        }
      }
    }

    // Check weight limit
    if (currentWeight + totalWeight > maxWeight) {
      return {
        canAdd: false,
        reason: `Too heavy. Weight: ${(currentWeight + totalWeight).toFixed(1)}/${maxWeight} lbs`
      };
    }

    // Check slot limit (only if adding a new slot)
    if (usesNewSlot && currentSlots >= maxSlots) {
      return {
        canAdd: false,
        reason: `Inventory full. Slots: ${currentSlots}/${maxSlots}`
      };
    }

    return { canAdd: true };
  }

  /**
   * Get total weight of player's inventory
   * @param {Object} player - Player object
   * @returns {number} Total weight in pounds
   */
  getWeight(player) {
    if (!player || !player.inventory) {
      return 0;
    }

    return player.inventory.reduce((total, item) => {
      const itemWeight = item.weight || 0;
      const quantity = item.quantity || 1;
      return total + (itemWeight * quantity);
    }, 0);
  }

  /**
   * Get maximum weight capacity for player
   * Formula: baseWeight + (STR × weightPerStrength)
   * @param {Object} player - Player object
   * @returns {number} Max weight capacity in pounds
   */
  getMaxWeight(player) {
    if (!player || !player.stats) {
      return config.encumbrance.baseWeight;
    }

    const strength = player.stats.strength || 10;
    return config.encumbrance.baseWeight + (strength * config.encumbrance.weightPerStrength);
  }

  /**
   * Get current number of used inventory slots
   * Stackable items only use one slot regardless of quantity
   * @param {Object} player - Player object
   * @returns {number} Number of used slots
   */
  getSlots(player) {
    if (!player || !player.inventory) {
      return 0;
    }

    return player.inventory.length;
  }

  /**
   * Get maximum inventory slots for player
   * Formula: baseSlots + (STR modifier × slotsPerStrength)
   * @param {Object} player - Player object
   * @returns {number} Max inventory slots
   */
  getMaxSlots(player) {
    if (!player || !player.stats) {
      return config.encumbrance.baseSlots;
    }

    const strength = player.stats.strength || 10;
    const strModifier = Math.floor((strength - 10) / 2);
    return config.encumbrance.baseSlots + (strModifier * config.encumbrance.slotsPerStrength);
  }

  /**
   * Get total number of items (considering stacking)
   * @param {Object} player - Player object
   * @returns {number} Total item count
   */
  getItemCount(player) {
    if (!player || !player.inventory) {
      return 0;
    }

    return player.inventory.reduce((total, item) => {
      return total + (item.quantity || 1);
    }, 0);
  }

  /**
   * Stack an item with existing items in inventory
   * @param {Object} player - Player object
   * @param {BaseItem} itemInstance - Item to stack
   * @returns {Object} {success: boolean, addedTo?: string}
   */
  stackItem(player, itemInstance) {
    if (!player || !player.inventory || !itemInstance || !itemInstance.isStackable) {
      return { success: false };
    }

    // Find an existing stack that can accept this item
    const existingStack = player.inventory.find(item => {
      return item.canStackWith && item.canStackWith(itemInstance);
    });

    if (!existingStack) {
      return { success: false };
    }

    // Get max stack size for this item type
    const maxStackSize = this.getMaxStackSize(itemInstance);
    const availableSpace = maxStackSize - existingStack.quantity;

    if (availableSpace <= 0) {
      return { success: false };
    }

    // Add as much as possible to the existing stack
    const amountToAdd = Math.min(itemInstance.quantity, availableSpace);
    existingStack.quantity += amountToAdd;
    existingStack.modifiedAt = Date.now();

    // If we couldn't add everything, reduce the incoming item's quantity
    if (amountToAdd < itemInstance.quantity) {
      itemInstance.quantity -= amountToAdd;
      return { success: false }; // Partial stack, caller should add remainder as new item
    }

    return {
      success: true,
      addedTo: existingStack.instanceId
    };
  }

  /**
   * Split a stack of items
   * @param {Object} player - Player object
   * @param {string} instanceId - Item instance ID to split
   * @param {number} quantity - Quantity to split off
   * @returns {Object} {success: boolean, newInstance?: BaseItem}
   */
  splitStack(player, instanceId, quantity) {
    if (!player || !player.inventory || !instanceId || quantity <= 0) {
      return { success: false };
    }

    const item = player.inventory.find(i => i.instanceId === instanceId);
    if (!item || !item.isStackable) {
      return { success: false };
    }

    if (item.quantity <= quantity) {
      return { success: false }; // Can't split entire stack or more
    }

    // Create new instance with split quantity
    const ItemFactory = require('../../items/ItemFactory');
    const newInstance = ItemFactory.cloneItem(item, {
      quantity: quantity,
      location: item.location
    });

    // Reduce original stack
    item.quantity -= quantity;
    item.modifiedAt = Date.now();

    // Add new instance to inventory
    player.inventory.push(newInstance);

    logger.log(`Split ${quantity}x ${item.name} from stack ${instanceId}`);

    return {
      success: true,
      newInstance: newInstance
    };
  }

  /**
   * Get maximum stack size for an item
   * @param {BaseItem|Object} itemDefinitionOrInstance - Item to check
   * @returns {number} Max stack size
   */
  getMaxStackSize(itemDefinitionOrInstance) {
    if (!itemDefinitionOrInstance) {
      return 1;
    }

    const itemType = itemDefinitionOrInstance.itemType;

    switch (itemType) {
      case ItemType.CURRENCY:
        return config.stacking.currencyStackSize;

      case ItemType.CONSUMABLE:
        return config.stacking.consumableStackSize;

      case ItemType.MATERIAL:
        return config.stacking.materialStackSize;

      default:
        return config.stacking.defaultStackSize;
    }
  }

  /**
   * Apply death durability loss to all equipped items
   * Called when player dies
   * @param {Object} player - Player object
   * @returns {Array<Object>} Array of items that lost durability {item, lostDurability}
   */
  applyDeathDurability(player) {
    if (!player || !player.inventory) {
      return [];
    }

    const affectedItems = [];
    const durabilityLossPercent = config.durability.lossOnDeath;

    for (const item of player.inventory) {
      // Only equipped items lose durability on death
      if (!item.isEquipped) {
        continue;
      }

      // Skip items without durability
      if (!item.maxDurability || item.durability === null || item.durability === undefined) {
        continue;
      }

      // Calculate durability loss (percentage of max)
      const durabilityLoss = Math.ceil(item.maxDurability * (durabilityLossPercent / 100));
      const oldDurability = item.durability;

      // Apply durability loss
      const broke = item.reduceDurability(durabilityLoss);

      affectedItems.push({
        item: item,
        lostDurability: durabilityLoss,
        newDurability: item.durability,
        broke: broke
      });

      logger.log(`Death: ${item.name} lost ${durabilityLoss} durability (${oldDurability} -> ${item.durability})`);
    }

    return affectedItems;
  }

  /**
   * Get inventory statistics
   * @param {Object} player - Player object
   * @returns {Object} Inventory statistics
   */
  getInventoryStats(player) {
    if (!player) {
      return null;
    }

    const weight = this.getWeight(player);
    const maxWeight = this.getMaxWeight(player);
    const slots = this.getSlots(player);
    const maxSlots = this.getMaxSlots(player);
    const itemCount = this.getItemCount(player);

    return {
      weight: {
        current: weight,
        max: maxWeight,
        percent: maxWeight > 0 ? (weight / maxWeight) * 100 : 0
      },
      slots: {
        current: slots,
        max: maxSlots,
        percent: maxSlots > 0 ? (slots / maxSlots) * 100 : 0
      },
      itemCount: itemCount
    };
  }

  /**
   * Get all items of a specific type
   * @param {Object} player - Player object
   * @param {string} itemType - ItemType to filter by
   * @returns {Array<BaseItem>} Array of matching items
   */
  getItemsByType(player, itemType) {
    if (!player || !player.inventory || !itemType) {
      return [];
    }

    return player.inventory.filter(item => item.itemType === itemType);
  }

  /**
   * Get all equipped items
   * @param {Object} player - Player object
   * @returns {Array<BaseItem>} Array of equipped items
   */
  getEquippedItems(player) {
    if (!player || !player.inventory) {
      return [];
    }

    return player.inventory.filter(item => item.isEquipped);
  }

  /**
   * Get all unequipped items
   * @param {Object} player - Player object
   * @returns {Array<BaseItem>} Array of unequipped items
   */
  getUnequippedItems(player) {
    if (!player || !player.inventory) {
      return [];
    }

    return player.inventory.filter(item => !item.isEquipped);
  }

  /**
   * Sort inventory by various criteria
   * @param {Object} player - Player object
   * @param {string} sortBy - Sort criteria: 'name', 'weight', 'value', 'type', 'rarity'
   * @returns {Array<BaseItem>} Sorted inventory
   */
  sortInventory(player, sortBy = 'name') {
    if (!player || !player.inventory) {
      return [];
    }

    const inventory = [...player.inventory];

    switch (sortBy) {
      case 'name':
        return inventory.sort((a, b) => a.name.localeCompare(b.name));

      case 'weight':
        return inventory.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      case 'value':
        return inventory.sort((a, b) => (b.value || 0) - (a.value || 0));

      case 'type':
        return inventory.sort((a, b) => {
          if (a.itemType === b.itemType) {
            return a.name.localeCompare(b.name);
          }
          return a.itemType.localeCompare(b.itemType);
        });

      case 'rarity':
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, artifact: 5 };
        return inventory.sort((a, b) => {
          const aOrder = rarityOrder[a.rarity] || 0;
          const bOrder = rarityOrder[b.rarity] || 0;
          if (aOrder === bOrder) {
            return a.name.localeCompare(b.name);
          }
          return bOrder - aOrder;
        });

      default:
        return inventory;
    }
  }
}

// Export singleton instance
module.exports = new InventoryManager();
